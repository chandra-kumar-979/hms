from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.model.user import User, UserRole


def list_owners(db: Session):
    return db.query(User).filter(User.role == UserRole.OWNER).all()


def set_owner_status(owner_id: int, is_active: bool, db: Session):
    owner = db.query(User).filter(User.id == owner_id, User.role == UserRole.OWNER).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    owner.is_active = is_active
    db.commit()
    db.refresh(owner)
    return owner


def create_owner(name: str, email: str, phone: str | None, password: str, db: Session):
    from app.services.auth_service import hash_password
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Owner with this email already exists")
    owner = User(name=name, email=email, phone=phone, role=UserRole.OWNER, password_hash=hash_password(password))
    db.add(owner)
    db.commit()
    db.refresh(owner)
    return owner


def delete_owner(owner_id: int, db: Session):
    owner = db.query(User).filter(User.id == owner_id, User.role == UserRole.OWNER).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    db.delete(owner)
    db.commit()
    return {"message": "Owner deleted"}
