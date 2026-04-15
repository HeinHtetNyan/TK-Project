from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db import get_session
from app.models import Payment, Customer, User, Voucher
from app.schemas.payment import PaymentCreate, PaymentRead
from app.dependencies.auth import require_staff_or_admin, require_admin

from app.services.audit import log_action

router = APIRouter(tags=["payments"])

@router.post("/payments", response_model=PaymentRead)
def create_payment(
    payment_in: PaymentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_staff_or_admin)
):
    # Idempotency: if client_id already exists, return the existing payment
    if payment_in.client_id:
        existing = session.exec(
            select(Payment).where(Payment.client_id == payment_in.client_id)
        ).first()
        if existing:
            return existing

    customer = session.get(Customer, payment_in.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    db_payment = Payment(
        client_id=payment_in.client_id,
        customer_id=payment_in.customer_id,
        amount_paid=payment_in.amount_paid,
        payment_method=payment_in.payment_method,
        payment_date=payment_in.payment_date,
        note=payment_in.note,
    )
    session.add(db_payment)
    session.flush()
    log_action(session, current_user.id, "CREATE", "Payment", str(db_payment.id), f"Payment of {db_payment.amount_paid} for customer {db_payment.customer_id}")
    session.commit()
    session.refresh(db_payment)
    return db_payment

@router.post("/payments/bulk", response_model=PaymentRead)
def create_bulk_payment(
    payment_in: PaymentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_staff_or_admin)
):
    # Idempotency: if client_id already exists, return the existing payment
    if payment_in.client_id:
        existing = session.exec(
            select(Payment).where(Payment.client_id == payment_in.client_id)
        ).first()
        if existing:
            return existing

    customer = session.get(Customer, payment_in.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Lock customer record for atomicity
    session.exec(select(Customer).where(Customer.id == payment_in.customer_id).with_for_update()).one()

    # 1. Create the standalone payment record
    db_payment = Payment(
        client_id=payment_in.client_id,
        customer_id=payment_in.customer_id,
        amount_paid=payment_in.amount_paid,
        payment_method=payment_in.payment_method,
        payment_date=payment_in.payment_date,
        note=payment_in.note,
    )
    session.add(db_payment)

    # 2. FIFO Logic: Apply payment to unpaid vouchers
    remaining_to_apply = payment_in.amount_paid

    unpaid_vouchers = session.exec(
        select(Voucher)
        .where(Voucher.customer_id == payment_in.customer_id)
        .where(Voucher.remaining_balance > 0)
        .order_by(Voucher.voucher_date.asc(), Voucher.id.asc())
    ).all()

    for voucher in unpaid_vouchers:
        if remaining_to_apply <= 0:
            break

        amount_to_pay = min(voucher.remaining_balance, remaining_to_apply)
        voucher.paid_amount += amount_to_pay
        voucher.remaining_balance -= amount_to_pay
        remaining_to_apply -= amount_to_pay
        session.add(voucher)

    log_action(session, current_user.id, "CREATE_BULK", "Payment", str(db_payment.id), f"Bulk Payment of {db_payment.amount_paid} for customer {db_payment.customer_id}")
    session.commit()
    session.refresh(db_payment)
    return db_payment

@router.get("/payments", response_model=List[PaymentRead])
def list_all_payments(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_staff_or_admin)
):
    payments = session.exec(select(Payment)).all()
    return payments

@router.get("/customers/{customer_id}/payments", response_model=List[PaymentRead])
def get_customer_payments(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_staff_or_admin)
):
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    payments = session.exec(select(Payment).where(Payment.customer_id == customer_id)).all()
    return payments

@router.delete("/payments/{payment_id}")
def delete_payment(
    payment_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin)
):
    payment = session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    log_action(session, current_user.id, "DELETE", "Payment", str(payment_id), f"Payment of {payment.amount_paid} deleted")
    session.delete(payment)
    session.commit()
    return {"message": "Payment deleted successfully"}
