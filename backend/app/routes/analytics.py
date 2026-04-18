from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from app.db import get_session
from app.models import Voucher, Customer, Payment, User
from app.dependencies.auth import require_staff_or_admin
from app.services.balance import calculate_customer_balance
from datetime import datetime, timedelta

router = APIRouter(tags=["analytics"])

@router.get("/analytics/dashboard")
def get_dashboard_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_staff_or_admin)
):
    # 1. Daily Sales (Last 30 days)
    thirty_days_ago = datetime.now().date() - timedelta(days=30)
    sales_query = select(Voucher.voucher_date, func.sum(Voucher.items_total)).where(
        Voucher.voucher_date >= thirty_days_ago
    ).group_by(Voucher.voucher_date).order_by(Voucher.voucher_date)
    
    sales_results = session.exec(sales_query).all()
    daily_sales = [{"date": str(date), "amount": amount} for date, amount in sales_results]

    # 2. Debt Overview
    total_revenue = session.exec(select(func.sum(Voucher.items_total))).first() or 0.0
    total_paid_vouchers = session.exec(select(func.sum(Voucher.paid_amount))).first() or 0.0
    total_standalone_payments = session.exec(select(func.sum(Payment.amount_paid))).first() or 0.0
    
    total_debt = total_revenue - total_paid_vouchers - total_standalone_payments

    # 3. Income by Payment Method
    # Payments from Vouchers (exclude rows where payment_method is NULL)
    voucher_payments_query = select(Voucher.payment_method, func.sum(Voucher.paid_amount)).where(
        Voucher.paid_amount > 0, Voucher.payment_method.isnot(None)
    ).group_by(Voucher.payment_method)
    voucher_payments = session.exec(voucher_payments_query).all()

    # Standalone Payments
    standalone_payments_query = select(Payment.payment_method, func.sum(Payment.amount_paid)).where(
        Payment.payment_method.isnot(None)
    ).group_by(Payment.payment_method)
    standalone_payments = session.exec(standalone_payments_query).all()
    
    income_by_method = {}
    
    def process_results(results):
        for method, amount in results:
            # Normalize method to string
            m_str = "CASH" # Default fallback
            if method:
                if hasattr(method, "value"):
                    m_str = method.value
                else:
                    m_str = str(method)
            
            income_by_method[m_str] = income_by_method.get(m_str, 0) + (amount or 0)

    process_results(voucher_payments)
    process_results(standalone_payments)
            
    income_list = [{"method": m, "amount": a} for m, a in income_by_method.items()]

    # 4. Top Customers (By Revenue)
    top_customers_query = select(Customer.name, func.sum(Voucher.items_total).label("revenue")).join(Voucher).group_by(Customer.id, Customer.name).order_by(func.sum(Voucher.items_total).desc()).limit(5)
    top_customers_results = session.exec(top_customers_query).all()
    top_customers = [{"name": name, "revenue": revenue} for name, revenue in top_customers_results]

    # 5. All Customer Debts (Big to Small)
    all_customers = session.exec(select(Customer)).all()
    debt_list = []
    for c in all_customers:
        c_debt = calculate_customer_balance(session, c.id)
        debt_list.append({"name": c.name, "debt": c_debt})
    
    # Sort by debt amount descending
    debt_list.sort(key=lambda x: x["debt"], reverse=True)

    return {
        "daily_sales": daily_sales,
        "total_debt": total_debt,
        "top_customers": top_customers,
        "total_revenue": total_revenue,
        "income_by_method": income_list,
        "debt_list": debt_list
    }
