from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException
from app.model.booking import Booking
from app.model.bed import Bed
from app.model.user import UserRole
from app.model.room import Room
from app.model.floor import Floor
from app.model.hostel import Hostel

def request_booking(payload, user, db: Session):
    if user.role != UserRole.TENANT:
        raise HTTPException(status_code=403, detail="Only tenants can create bookings")

    bed = db.query(Bed).filter(Bed.id == payload.bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    if bed.status != "AVAILABLE":
        raise HTTPException(status_code=400, detail="Selected bed is not available")

    if payload.end_date <= payload.start_date:
        raise HTTPException(status_code=400, detail="end_date must be after start_date")

    overlapping_booking = (
        db.query(Booking)
        .filter(
            Booking.bed_id == payload.bed_id,
            Booking.status.in_(["PENDING", "APPROVED"]),
            and_(Booking.start_date < payload.end_date, Booking.end_date > payload.start_date),
        )
        .first()
    )
    if overlapping_booking:
        raise HTTPException(status_code=400, detail="Bed already has an active booking in this date range")

    booking = Booking(
        tenant_id=user.id,
        bed_id=payload.bed_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status="PENDING"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking

def list_user_bookings(user_id: int, db: Session):
    return db.query(Booking).filter(Booking.tenant_id == user_id).all()


def list_all_bookings(db: Session):
    return db.query(Booking).all()


def list_owner_booking_requests(owner_id: int, db: Session):
    return (
        db.query(Booking)
        .join(Bed, Booking.bed_id == Bed.id)
        .join(Room, Bed.room_id == Room.id)
        .join(Floor, Room.floor_id == Floor.id)
        .join(Hostel, Floor.hostel_id == Hostel.id)
        .filter(Hostel.owner_id == owner_id)
        .all()
    )


def owner_decide_booking(payload, user, db: Session):
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owner/admin can decide bookings")
    booking = db.query(Booking).filter(Booking.id == payload.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    bed_scope = (
        db.query(Bed, Hostel.owner_id)
        .join(Room, Bed.room_id == Room.id)
        .join(Floor, Room.floor_id == Floor.id)
        .join(Hostel, Floor.hostel_id == Hostel.id)
        .filter(Bed.id == booking.bed_id)
        .first()
    )
    if not bed_scope:
        raise HTTPException(status_code=404, detail="Bed/hostel mapping not found")
    bed, owner_id = bed_scope
    if user.role == UserRole.OWNER and owner_id != user.id:
        raise HTTPException(status_code=403, detail="You cannot decide bookings for another owner's hostel")

    if booking.status != "PENDING":
        raise HTTPException(status_code=400, detail="Only pending bookings can be decided")

    booking.status = "APPROVED" if payload.approve else "REJECTED"
    booking.owner_decision_reason = payload.reason
    if payload.approve:
        bed.status = "RESERVED"
    elif bed.status == "RESERVED":
        bed.status = "AVAILABLE"
    db.commit()
    db.refresh(booking)
    return booking
