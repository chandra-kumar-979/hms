from datetime import date, datetime, UTC
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.model.vacate import VacateRequest
from app.model.booking import Booking
from app.model.bed import Bed
from app.model.room import Room
from app.model.floor import Floor
from app.model.hostel import Hostel
from app.model.payment import Payment
from app.model.notification import Notification
from app.model.user import UserRole


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_booking_hostel_owner(booking_id: int, db: Session):
    """Returns (Booking, Bed, owner_id) for a booking, or raises 404."""
    result = (
        db.query(Booking, Bed, Hostel.owner_id)
        .join(Bed, Booking.bed_id == Bed.id)
        .join(Room, Bed.room_id == Room.id)
        .join(Floor, Room.floor_id == Floor.id)
        .join(Hostel, Floor.hostel_id == Hostel.id)
        .filter(Booking.id == booking_id)
        .first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Booking not found")
    return result  # (booking, bed, owner_id)


def _check_pending_dues(tenant_id: int, booking_id: int, db: Session) -> float:
    """Returns total unpaid amount for the booking (0 if clear)."""
    total = (
        db.query(Payment)
        .filter(
            Payment.tenant_id == tenant_id,
            Payment.booking_id == booking_id,
            Payment.status != "SUCCESS",
        )
        .all()
    )
    return sum(p.amount for p in total)


# ── Tenant actions ─────────────────────────────────────────────────────────────

def create_vacate_request(payload, user, db: Session):
    if user.role != UserRole.TENANT:
        raise HTTPException(status_code=403, detail="Only tenants can raise a vacate notice")

    booking, bed, owner_id = _get_booking_hostel_owner(payload.booking_id, db)

    if booking.tenant_id != user.id:
        raise HTTPException(status_code=403, detail="You can only vacate your own booking")

    if booking.status not in ("APPROVED",):
        raise HTTPException(status_code=400, detail="Only approved bookings can be vacated")

    if payload.requested_vacate_date < date.today():
        raise HTTPException(status_code=400, detail="Requested vacate date must be today or later")

    existing = (
        db.query(VacateRequest)
        .filter(
            VacateRequest.booking_id == payload.booking_id,
            VacateRequest.status.in_(["PENDING", "APPROVED"]),
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="A vacate request for this booking is already pending")

    pending_dues = _check_pending_dues(user.id, payload.booking_id, db)

    req = VacateRequest(
        booking_id=payload.booking_id,
        tenant_id=user.id,
        requested_vacate_date=payload.requested_vacate_date,
        reason=payload.reason,
        status="PENDING",
    )
    db.add(req)

    # Notify the owner
    db.add(Notification(
        user_id=owner_id,
        title="Tenant vacate notice received",
        message=(
            f"Tenant #{user.id} has requested to vacate on {payload.requested_vacate_date}. "
            f"Pending dues: ₹{pending_dues:.0f}."
        ),
        category="VACATE",
    ))

    db.commit()
    db.refresh(req)
    return {**req.__dict__, "pending_dues": pending_dues}


def list_tenant_vacate_requests(tenant_id: int, db: Session):
    return db.query(VacateRequest).filter(VacateRequest.tenant_id == tenant_id).all()


# ── Owner actions ──────────────────────────────────────────────────────────────

def list_owner_vacate_requests(owner_id: int, db: Session):
    return (
        db.query(VacateRequest)
        .join(Booking, VacateRequest.booking_id == Booking.id)
        .join(Bed, Booking.bed_id == Bed.id)
        .join(Room, Bed.room_id == Room.id)
        .join(Floor, Room.floor_id == Floor.id)
        .join(Hostel, Floor.hostel_id == Hostel.id)
        .filter(Hostel.owner_id == owner_id)
        .all()
    )


def update_vacate_request(request_id: int, payload, user, db: Session):
    req = db.query(VacateRequest).filter(VacateRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Vacate request not found")

    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owner/admin can update vacate requests")

    if req.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="Cannot update a completed vacate request")

    for field in ("status", "owner_notes", "dues_cleared", "inspection_done", "deposit_refunded", "keys_returned"):
        value = getattr(payload, field, None)
        if value is not None:
            setattr(req, field, value)

    db.commit()
    db.refresh(req)
    return req


def complete_vacate(request_id: int, user, db: Session):
    """Owner marks vacate complete — releases bed, closes booking, notifies tenant."""
    req = db.query(VacateRequest).filter(VacateRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Vacate request not found")

    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owner/admin can complete a vacate")

    if req.status not in ("PENDING", "APPROVED"):
        raise HTTPException(status_code=400, detail="Only pending or approved requests can be completed")

    checklist_issues = []
    if not req.dues_cleared:     checklist_issues.append("pending dues not cleared")
    if not req.inspection_done:  checklist_issues.append("room inspection not done")
    if not req.deposit_refunded: checklist_issues.append("security deposit not refunded")
    if not req.keys_returned:    checklist_issues.append("keys not marked as returned")

    if checklist_issues:
        raise HTTPException(
            status_code=400,
            detail=f"Complete checklist before closing: {', '.join(checklist_issues)}",
        )

    # Mark vacate complete
    req.status = "COMPLETED"
    req.completed_at = datetime.now(UTC)

    # Close booking + free bed
    booking, bed, _ = _get_booking_hostel_owner(req.booking_id, db)
    booking.status = "COMPLETED"
    bed.status = "AVAILABLE"

    # Notify tenant
    db.add(Notification(
        user_id=req.tenant_id,
        title="Vacate process completed",
        message=(
            f"Your vacate request for booking #{req.booking_id} has been completed. "
            "Security deposit refunded. Thank you for staying with us!"
        ),
        category="VACATE",
    ))

    db.commit()
    db.refresh(req)
    return req


def get_vacate_summary(request_id: int, db: Session):
    """Full summary for the owner — checklist state + pending dues."""
    req = db.query(VacateRequest).filter(VacateRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Vacate request not found")

    pending_dues = _check_pending_dues(req.tenant_id, req.booking_id, db)
    checklist_complete = all([req.dues_cleared, req.inspection_done, req.deposit_refunded, req.keys_returned])

    return {
        "id":                     req.id,
        "booking_id":             req.booking_id,
        "tenant_id":              req.tenant_id,
        "requested_vacate_date":  str(req.requested_vacate_date),
        "reason":                 req.reason,
        "status":                 req.status,
        "owner_notes":            req.owner_notes,
        "notice_given_at":        str(req.notice_given_at),
        "completed_at":           str(req.completed_at) if req.completed_at else None,
        "checklist": {
            "dues_cleared":     req.dues_cleared,
            "inspection_done":  req.inspection_done,
            "deposit_refunded": req.deposit_refunded,
            "keys_returned":    req.keys_returned,
        },
        "checklist_complete": checklist_complete,
        "pending_dues":        pending_dues,
    }
