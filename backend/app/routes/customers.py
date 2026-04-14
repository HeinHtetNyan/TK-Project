from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from app.db import get_session
from app.models import Customer
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerRead, CustomerBalance
from app.services.balance import calculate_customer_balance
from app.dependencies.auth import require_staff_or_admin, require_admin

router = APIRouter(prefix="/customers", tags=["customers"])

@router.post("/", response_model=CustomerRead)
def create_customer(
    customer: CustomerCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(require_staff_or_admin)
):
    db_customer = Customer.model_validate(customer)
    session.add(db_customer)
    session.commit()
    session.refresh(db_customer)
    return db_customer

@router.get("/", response_model=List[CustomerRead])
def list_customers(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_staff_or_admin)
):
    customers = session.exec(select(Customer)).all()
    return customers

@router.get("/search", response_model=List[CustomerRead])
def search_customers(
    name: str = Query(..., min_length=1), 
    session: Session = Depends(get_session),
    current_user: User = Depends(require_staff_or_admin)
):
    statement = select(Customer).where(Customer.name.ilike(f"%{name}%"))
    customers = session.exec(statement).all()
    return customers

@router.get("/{customer_id}/balance", response_model=CustomerBalance)
def get_customer_balance(
    customer_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(require_staff_or_admin)
):
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    balance = calculate_customer_balance(session, customer_id)
    return CustomerBalance(
        customer_id=customer.id,
        customer_name=customer.name,
        balance=balance
    )

@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin)
):
    from sqlmodel import select as sa_select
    from app.models import Voucher, Payment

    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Delete related vouchers (items cascade via SQLModel relationship)
    vouchers = session.exec(sa_select(Voucher).where(Voucher.customer_id == customer_id)).all()
    for v in vouchers:
        session.delete(v)

    # Delete related standalone payments
    payments = session.exec(sa_select(Payment).where(Payment.customer_id == customer_id)).all()
    for p in payments:
        session.delete(p)

    session.delete(customer)
    session.commit()
    return {"message": "Customer deleted successfully"}
