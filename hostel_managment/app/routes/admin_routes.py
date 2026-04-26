from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import get_current_user
from app.model.user import UserRole
from app.services.admin_service import list_owners, set_owner_status, create_owner, delete_owner
from app.schemas.management_schema import OwnerStatusUpdateRequest, OwnerCreateRequest

router = APIRouter()


def _ensure_admin(user):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/owners")
def get_owners(db: Session = Depends(get_db), user=Depends(get_current_user)):
    _ensure_admin(user)
    return list_owners(db)


@router.patch("/owners/status")
def update_owner_status(payload: OwnerStatusUpdateRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _ensure_admin(user)
    return set_owner_status(payload.owner_id, payload.is_active, db)


@router.post("/owners")
def add_owner(payload: OwnerCreateRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _ensure_admin(user)
    return create_owner(payload.name, payload.email, payload.phone, payload.password, db)


@router.delete("/owners/{owner_id}")
def remove_owner(owner_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _ensure_admin(user)
    return delete_owner(owner_id, db)
