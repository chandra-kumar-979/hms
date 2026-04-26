from fastapi import HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.utils.auth_google import verify_google_token
from app.utils.jwt_handler import create_access_token
from app.model.user import User, UserRole
from app.database import get_db
import jwt
from app.config import settings
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

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
