from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from pydantic import BaseModel
from app.schemas.user_schema import GoogleAuthRequest, DevLoginRequest, RegisterRequest, LoginRequest, UserResponse
from app.services.auth_service import google_login_service, dev_login_service, register_user_service, login_user_service, forgot_password_service, reset_password_service

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

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
    return register_user_service(payload.name, payload.email, payload.password, payload.phone, payload.role, db)


@router.post("/login", response_model=UserResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    return login_user_service(payload.email, payload.password, db)


@router.post("/setup-admin", response_model=UserResponse)
def setup_admin(payload: RegisterRequest, db: Session = Depends(get_db)):
    """One-time endpoint to create the first admin. Disabled once any admin exists."""
    from app.model.user import User, UserRole
    existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if existing_admin:
        raise HTTPException(status_code=403, detail="Admin already exists. Use the login page.")
    from app.services.auth_service import hash_password
    user = User(name=payload.name, email=payload.email, phone=payload.phone,
                role=UserRole.ADMIN, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    from app.utils.jwt_handler import create_access_token
    token = create_access_token({"id": user.id, "role": user.role.value})
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role.value, "token": token}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    return forgot_password_service(payload.email, db)


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    return reset_password_service(payload.token, payload.new_password, db)
