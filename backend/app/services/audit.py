from sqlmodel import Session
from app.models import AuditLog

def log_action(session: Session, user_id: int, action: str, entity_type: str, entity_id: str, details: str):
    """
    Utility to record an action in the audit log.
    The caller is responsible for committing the session.
    """
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details
    )
    session.add(log)
