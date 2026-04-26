from fastapi import HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.utils.auth_google import verify_google_token
from app.utils.jwt_handler import create_access_token
from app.model.user import User, UserRole
from app.database import get_db
import jwt
from app.config import settings
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

bearer_scheme = HTTPBearer(auto_error=False)

def google_login_service(token: str, db: Session):
    data = verify_google_token(token)
    if not data:
        return None

    email = data["email"]
    name = data.get("name", "")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            name=name,
            email=email,
            role=UserRole.TENANT,
            google_id=data["sub"]
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token({"id": user.id, "role": user.role.value})

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "token": access_token
    }


def dev_login_service(email: str, role: str, name: str | None, db: Session):
    if not settings.DEV_AUTH_ENABLED:
        raise HTTPException(status_code=403, detail="Dev login is disabled")

    try:
        normalized_role = UserRole(role.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role. Use TENANT, OWNER, or ADMIN")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            name=name or email.split("@")[0],
            email=email,
            role=normalized_role,
            google_id=f"dev-{email}"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.role = normalized_role
        if name:
            user.name = name
        db.commit()
        db.refresh(user)

    access_token = create_access_token({"id": user.id, "role": user.role.value})
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "token": access_token
    }


def register_user_service(name: str, email: str, password: str, phone: str | None, role: str, db: Session):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    # Public registration is TENANT only; OWNER/ADMIN must be created by admin
    allowed_public_roles = {"TENANT"}
    role_upper = role.upper()
    if role_upper not in allowed_public_roles:
        raise HTTPException(status_code=403, detail="Only TENANT accounts can be self-registered. Contact admin for Owner access.")
    user = User(name=name, email=email, phone=phone, role=UserRole.TENANT, password_hash=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"id": user.id, "role": user.role.value})
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role.value, "token": token}


def login_user_service(email: str, password: str, db: Session):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.password_hash:
        raise HTTPException(status_code=401, detail="This account was not registered with a password. Contact admin.")
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated. Contact admin.")
    token = create_access_token({"id": user.id, "role": user.role.value})
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role.value, "token": token}


def forgot_password_service(email: str, db: Session):
    from app.model.password_reset import PasswordResetToken
    from app.utils.email_sender import send_password_reset_email
    from datetime import datetime, timedelta, timezone
    import secrets

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal whether email exists
        return {"message": "If that email is registered, a reset link has been sent."}

    # Invalidate any existing unused tokens
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False
    ).update({"used": True})
    db.commit()

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    reset_token = PasswordResetToken(user_id=user.id, token=token, expires_at=expires)
    db.add(reset_token)
    db.commit()

    reset_url = f"{settings.APP_BASE_URL}/auth/reset-password?token={token}"
    sent = send_password_reset_email(user.email, reset_url)

    if not sent:
        # SMTP not configured — return the URL in dev mode so it can be tested
        if settings.DEV_AUTH_ENABLED:
            return {"message": "Reset link (dev mode — no SMTP configured)", "reset_url": reset_url}

    return {"message": "If that email is registered, a reset link has been sent."}


def reset_password_service(token: str, new_password: str, db: Session):
    from app.model.password_reset import PasswordResetToken
    from datetime import datetime, timezone

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.used == False
    ).first()

    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    if reset_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(new_password)
    reset_token.used = True
    db.commit()

    return {"message": "Password updated successfully. You can now log in."}


def update_profile_service(user: User, name: str | None, phone: str | None, profile_image: str | None, db: Session):
    if name is not None:
        user.name = name
    if phone is not None:
        user.phone = phone
    if profile_image is not None:
        user.profile_image = profile_image
    db.commit()
    db.refresh(user)
    return user

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing token")

    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user = db.query(User).filter(User.id == payload["id"]).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
