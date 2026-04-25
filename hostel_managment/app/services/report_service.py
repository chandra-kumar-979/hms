from sqlalchemy import func
from sqlalchemy.orm import Session
from app.model.payment import Payment
from app.model.booking import Booking
from app.model.bed import Bed
from app.model.room import Room
from app.model.floor import Floor
from app.model.hostel import Hostel
from datetime import date


def owner_monthly_report(owner_id: int, db: Session):
    today = date.today()
    month_start = date(today.year, today.month, 1)

    payment_scope = (
        db.query(Payment)
        .join(Booking, Payment.booking_id == Booking.id)
        .join(Bed, Booking.bed_id == Bed.id)
        .join(Room, Bed.room_id == Room.id)
        .join(Floor, Room.floor_id == Floor.id)
        .join(Hostel, Floor.hostel_id == Hostel.id)
        .filter(Hostel.owner_id == owner_id)
    )
    booking_scope = (
        db.query(Booking)
        .join(Bed, Booking.bed_id == Bed.id)
        .join(Room, Bed.room_id == Room.id)
        .join(Floor, Room.floor_id == Floor.id)
        .join(Hostel, Floor.hostel_id == Hostel.id)
        .filter(Hostel.owner_id == owner_id)
    )

    total_collections = (
        payment_scope.filter(Payment.paid_at >= month_start, Payment.status == "SUCCESS")
        .with_entities(func.coalesce(func.sum(Payment.amount), 0))
        .scalar()
        or 0
    )
    total_payments = payment_scope.filter(Payment.paid_at >= month_start).with_entities(func.count(Payment.id)).scalar() or 0
    bookings = booking_scope.filter(Booking.start_date >= month_start).with_entities(func.count(Booking.id)).scalar() or 0
    due_count = payment_scope.filter(Payment.status != "SUCCESS").with_entities(func.count(Payment.id)).scalar() or 0

    return {
        "owner_id": owner_id,
        "month": f"{today.year}-{today.month:02d}",
        "total_collections": total_collections,
        "total_payments": total_payments,
        "bookings": bookings,
        "due_count": due_count,
    }
