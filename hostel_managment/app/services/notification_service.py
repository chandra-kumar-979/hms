from sqlalchemy.orm import Session
from app.model.notification import Notification
from app.model.broadcast import BroadcastMessage
from app.model.user import User
from app.model.booking import Booking
from app.model.bed import Bed
from app.model.room import Room
from app.model.floor import Floor
from app.model.hostel import Hostel
from fastapi import HTTPException


def list_user_notifications(user_id: int, db: Session):
    return db.query(Notification).filter(Notification.user_id == user_id).order_by(Notification.id.desc()).all()


def mark_notification_read(notification_id: int, user_id: int, db: Session):
    row = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
    if row:
        row.read = True
        db.commit()
        db.refresh(row)
    return row


def broadcast_to_hostel(hostel_id: int, owner_id: int, subject: str, message: str, db: Session, is_admin: bool = False):
    hostel = db.query(Hostel).filter(Hostel.id == hostel_id).first()
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
    if not is_admin and hostel.owner_id != owner_id:
        raise HTTPException(status_code=403, detail="You can only broadcast to your own hostels")

    row = BroadcastMessage(hostel_id=hostel_id, owner_id=owner_id, subject=subject, message=message)
    db.add(row)

    tenant_ids = (
        db.query(Booking.tenant_id)
        .join(Bed, Booking.bed_id == Bed.id)
        .join(Room, Bed.room_id == Room.id)
        .join(Floor, Room.floor_id == Floor.id)
        .join(Hostel, Floor.hostel_id == Hostel.id)
        .filter(Hostel.id == hostel_id, Booking.status == "APPROVED")
        .distinct()
        .all()
    )
    for (tenant_id,) in tenant_ids:
        db.add(Notification(user_id=tenant_id, title=subject, message=message, category="BROADCAST"))
    db.commit()
    db.refresh(row)
    return row
