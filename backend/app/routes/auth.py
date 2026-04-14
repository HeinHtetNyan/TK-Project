from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select, func
from app.db import get_session
from app.models.user import User, UserRole
from app.core.security import create_access_token, verify_password, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
from app.schemas.user import Token, UserCreate, UserRead

router = APIRouter(tags=["auth"])

@router.get("/auth/check-setup")
def check_setup(session: Session = Depends(get_session)):
    user_count = session.exec(select(func.count(User.id))).one()
    return {"is_setup_required": user_count == 0}

@router.post("/auth/setup", response_model=UserRead)
def setup_admin(user_in: UserCreate, session: Session = Depends(get_session)):
    user_count = session.exec(select(func.count(User.id))).one()
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Setup already completed. Please login."
        )
    
    db_user = User(
        username=user_in.username,
        password_hash=get_password_hash(user_in.password),
        role=UserRole.ADMIN
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@router.post("/auth/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    user = session.exec(select(User).where(User.username == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been disabled",
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.username, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
