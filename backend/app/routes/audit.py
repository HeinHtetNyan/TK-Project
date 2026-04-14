from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.db import get_session
from app.models import AuditLog, User
from app.dependencies.auth import require_admin

router = APIRouter(tags=["audit"])

@router.get("/audit-logs")
def list_audit_logs(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin)
):
    # Sort by created_at descending to show most recent actions first
    results = session.exec(select(AuditLog).order_by(AuditLog.created_at.desc())).all()
    
    logs = []
    for log in results:
        log_data = log.model_dump()
        # Fetch username for the log
        user = session.get(User, log.user_id)
        log_data["username"] = user.username if user else "Unknown"
        logs.append(log_data)
        
    return logs
