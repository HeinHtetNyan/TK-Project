from typing import List
from datetime import datetime
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db import get_session
from app.models.spending import Spending
from app.models.user import User
from app.schemas.spending import SpendingCreate, SpendingRead, SpendingUpdate
from app.dependencies.auth import require_admin
from app.services.audit import log_action

router = APIRouter(tags=["spendings"])


@router.post("/spendings", response_model=SpendingRead)
def create_spending(
    spending_in: SpendingCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    if spending_in.client_id:
        existing = session.exec(
            select(Spending).where(Spending.client_id == spending_in.client_id)
        ).first()
        if existing:
            return existing

    db_spending = Spending(
        client_id=spending_in.client_id,
        description=spending_in.description,
        amount=spending_in.amount,
        spending_date=spending_in.spending_date,
    )
    session.add(db_spending)
    session.flush()
    log_action(
        session, current_user.id, "CREATE", "Spending", str(db_spending.id),
        f"Spending: {db_spending.description} - {db_spending.amount}"
    )
    session.commit()
    session.refresh(db_spending)
    return db_spending


@router.get("/spendings", response_model=List[SpendingRead])
def list_spendings(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    return session.exec(select(Spending).order_by(Spending.spending_date.desc())).all()


@router.put("/spendings/{spending_id}", response_model=SpendingRead)
def update_spending(
    spending_id: int,
    spending_in: SpendingUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    spending = session.get(Spending, spending_id)
    if not spending:
        raise HTTPException(status_code=404, detail="Spending not found")

    for key, val in spending_in.model_dump(exclude_unset=True).items():
        setattr(spending, key, val)
    spending.updated_at = datetime.now(ZoneInfo("Asia/Yangon"))

    session.add(spending)
    log_action(
        session, current_user.id, "UPDATE", "Spending", str(spending_id),
        f"Updated: {spending.description}"
    )
    session.commit()
    session.refresh(spending)
    return spending


@router.delete("/spendings/{spending_id}")
def delete_spending(
    spending_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    spending = session.get(Spending, spending_id)
    if not spending:
        raise HTTPException(status_code=404, detail="Spending not found")

    log_action(
        session, current_user.id, "DELETE", "Spending", str(spending_id),
        f"Deleted: {spending.description}"
    )
    session.delete(spending)
    session.commit()
    return {"message": "Spending deleted successfully"}
