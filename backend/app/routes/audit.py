from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.db import get_session
from app.models import AuditLog, User
from app.dependencies.auth import require_admin

router = APIRouter(tags=["audit"])

@router.get("/audit-logs")
def list_audit_logs(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin)
):
    results = session.exec(
        select(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    ).all()

    user_ids = {log.user_id for log in results}
    users = {
        u.id: u.username
        for u in session.exec(select(User).where(User.id.in_(user_ids))).all()
    }

    logs = []
    for log in results:
        log_data = log.model_dump()
        log_data["username"] = users.get(log.user_id, "Unknown")
        logs.append(log_data)

    return logs
