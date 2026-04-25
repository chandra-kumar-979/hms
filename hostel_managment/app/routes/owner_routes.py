from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import get_current_user
from app.model.user import UserRole
from app.schemas.management_schema import BroadcastRequest
from app.services.notification_service import broadcast_to_hostel
from app.services.hostel_service import list_owner_hostels

router = APIRouter()


@router.post("/broadcast")
def owner_broadcast(payload: BroadcastRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owner/admin can broadcast")
    return broadcast_to_hostel(
        payload.hostel_id,
        user.id,
        payload.subject,
        payload.message,
        db,
        is_admin=user.role == UserRole.ADMIN,
    )


@router.get("/hostels")
def my_hostels(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owner/admin can view owner hostels")
    return list_owner_hostels(user.id, db)
