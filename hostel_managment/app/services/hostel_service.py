from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.model.hostel import Hostel
from app.model.feedback import Feedback
from app.model.user import UserRole
from app.model.floor import Floor
from app.model.room import Room
from app.model.bed import Bed
from app.utils.s3_upload import upload_file_to_s3

def create_hostel(name, description, location, images, user, db: Session, price_per_bed: float = 0, amenities: list[str] | None = None):
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owners and admins can create hostels")

    image_urls = [upload_file_to_s3(img.file, "hostels") for img in images]

    hostel = Hostel(
        owner_id=user.id,
        name=name,
        description=description,
        location=location,
        images=image_urls,
        price_per_bed=price_per_bed,
        amenities=amenities or []
    )
    db.add(hostel)
    db.commit()
    db.refresh(hostel)
    return hostel

def list_hostels(db: Session, location: str | None = None, min_price: float | None = None, max_price: float | None = None, min_rating: int | None = None):
    query = db.query(Hostel)
    if location:
        query = query.filter(Hostel.location.ilike(f"%{location}%"))
    if min_price is not None:
        query = query.filter(Hostel.price_per_bed >= min_price)
    if max_price is not None:
        query = query.filter(Hostel.price_per_bed <= max_price)
    if min_rating is not None:
        query = query.filter(Hostel.rating >= min_rating)
    return query.all()

def get_hostel_details(hostel_id: int, db: Session):
    from app.model.user import User
    hostel = db.query(Hostel).filter(Hostel.id == hostel_id).first()
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
    owner = db.query(User).filter(User.id == hostel.owner_id).first()
    floors = db.query(Floor).filter(Floor.hostel_id == hostel_id).all()
    total_beds = 0
    available_beds = 0
    for floor in floors:
        rooms = db.query(Room).filter(Room.floor_id == floor.id).all()
        for room in rooms:
            beds = db.query(Bed).filter(Bed.room_id == room.id).all()
            total_beds += len(beds)
            available_beds += sum(1 for b in beds if b.status == "AVAILABLE")
    return {
        "id": hostel.id,
        "name": hostel.name,
        "description": hostel.description,
        "location": hostel.location,
        "price_per_bed": hostel.price_per_bed,
        "rating": hostel.rating,
        "amenities": hostel.amenities,
        "images": hostel.images,
        "total_beds": total_beds,
        "available_beds": available_beds,
        "owner": {
            "name": owner.name if owner else "Unknown",
            "email": owner.email if owner else "",
            "phone": owner.phone if owner else "",
        } if owner else None
    }

def add_feedback(payload, user, db: Session):
    if user.role != UserRole.TENANT:
        raise HTTPException(status_code=403, detail="Only tenants can submit feedback")

    hostel = db.query(Hostel).filter(Hostel.id == payload.hostel_id).first()
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    fb = Feedback(
        tenant_id=user.id,
        hostel_id=payload.hostel_id,
        rating=payload.rating,
        comments=payload.comments
    )
    db.add(fb)
    db.commit()
    return {"message": "Feedback submitted"}


def upsert_floor(payload, user, db: Session):
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owners/admin can manage floors")
    floor = Floor(hostel_id=payload.hostel_id, floor_number=payload.floor_number, images=payload.images)
    db.add(floor)
    db.commit()
    db.refresh(floor)
    return floor


def upsert_room(payload, user, db: Session):
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owners/admin can manage rooms")
    room = Room(floor_id=payload.floor_id, room_number=payload.room_number, room_type=payload.room_type, images=payload.images)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def upsert_bed(payload, user, db: Session):
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owners/admin can manage beds")
    bed = Bed(room_id=payload.room_id, bed_number=payload.bed_number, status=payload.status)
    db.add(bed)
    db.commit()
    db.refresh(bed)
    return bed


def list_available_beds(hostel_id: int, db: Session):
    beds = (
        db.query(Bed)
        .join(Room, Bed.room_id == Room.id)
        .join(Floor, Room.floor_id == Floor.id)
        .join(Hostel, Floor.hostel_id == Hostel.id)
        .filter(Hostel.id == hostel_id, Bed.status == "AVAILABLE")
        .all()
    )
    return beds


def update_hostel(hostel_id: int, payload, user, db: Session):
    hostel = db.query(Hostel).filter(Hostel.id == hostel_id).first()
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
    if user.role not in (UserRole.ADMIN, UserRole.OWNER):
        raise HTTPException(status_code=403, detail="Unauthorized")
    if user.role == UserRole.OWNER and hostel.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only owner can edit this hostel")

    for field in ["name", "description", "location", "price_per_bed", "rating", "amenities", "images"]:
        value = getattr(payload, field, None)
        if value is not None:
            setattr(hostel, field, value)
    db.commit()
    db.refresh(hostel)
    return hostel


def delete_hostel(hostel_id: int, user, db: Session):
    hostel = db.query(Hostel).filter(Hostel.id == hostel_id).first()
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
    if user.role not in (UserRole.ADMIN, UserRole.OWNER):
        raise HTTPException(status_code=403, detail="Unauthorized")
    if user.role == UserRole.OWNER and hostel.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only owner can delete this hostel")
    db.delete(hostel)
    db.commit()
    return {"message": "Hostel deleted"}


def list_owner_hostels(owner_id: int, db: Session):
    return db.query(Hostel).filter(Hostel.owner_id == owner_id).all()
