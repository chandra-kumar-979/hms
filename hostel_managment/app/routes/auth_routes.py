from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user_schema import GoogleAuthRequest, DevLoginRequest, RegisterRequest, UserResponse
from app.services.auth_service import google_login_service, dev_login_service, register_user_service

router = APIRouter()

@router.post("/google", response_model=UserResponse)
def google_login(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    user = google_login_service(payload.token, db)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid Google token")
    return user


@router.post("/dev-login", response_model=UserResponse)
def dev_login(payload: DevLoginRequest, db: Session = Depends(get_db)):
    return dev_login_service(payload.email, payload.role, payload.name, db)


@router.post("/register", response_model=UserResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    return register_user_service(payload.name, payload.email, payload.phone, payload.role, db)
