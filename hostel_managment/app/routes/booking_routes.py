from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.booking_schema import BookingRequest
from app.services.booking_service import (
    request_booking, list_user_bookings, list_owner_booking_requests, owner_decide_booking, list_all_bookings
)
from app.services.auth_service import get_current_user
from app.schemas.booking_schema import BookingDecisionRequest
from app.model.user import UserRole

router = APIRouter()

@router.post("/")
def create_booking(
    payload: BookingRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return request_booking(payload, user, db)

@router.get("/me")
def my_bookings(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return list_user_bookings(user.id, db)


@router.get("/owner/requests")
def owner_requests(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owner/admin can view booking requests")
    if user.role == UserRole.ADMIN:
        return list_all_bookings(db)
    return list_owner_booking_requests(user.id, db)


@router.post("/owner/decision")
def owner_decision(payload: BookingDecisionRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return owner_decide_booking(payload, user, db)
