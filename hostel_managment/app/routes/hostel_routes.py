from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.hostel_service import (
    create_hostel, list_hostels, get_hostel_details, upsert_floor, upsert_room, upsert_bed, list_available_beds, update_hostel, delete_hostel
)
from app.services.auth_service import get_current_user
from app.schemas.management_schema import FloorCreateRequest, RoomCreateRequest, BedCreateRequest
from app.schemas.hostel_schema import HostelUpdateRequest

router = APIRouter()

@router.post("/")
def add_hostel(
    name: str = Form(...),
    description: str = Form(""),
    location: str = Form(...),
    price_per_bed: float = Form(0),
    amenities: str = Form(""),
    images: list[UploadFile] | None = File(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    amenities_list = [item.strip() for item in amenities.split(",") if item.strip()]
    return create_hostel(name, description, location, images or [], user, db, price_per_bed, amenities_list)

@router.get("/")
def get_all_hostels(
    location: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    min_rating: int | None = None,
    db: Session = Depends(get_db),
):
    return list_hostels(db, location, min_price, max_price, min_rating)

@router.get("/{hostel_id}")
def get_hostel(hostel_id: int, db: Session = Depends(get_db)):
    return get_hostel_details(hostel_id, db)


@router.get("/{hostel_id}/beds/available")
def get_available_beds(hostel_id: int, db: Session = Depends(get_db)):
    return list_available_beds(hostel_id, db)


@router.patch("/{hostel_id}")
def edit_hostel(hostel_id: int, payload: HostelUpdateRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return update_hostel(hostel_id, payload, user, db)


@router.delete("/{hostel_id}")
def remove_hostel(hostel_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return delete_hostel(hostel_id, user, db)


@router.post("/floors")
def add_floor(payload: FloorCreateRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return upsert_floor(payload, user, db)


@router.get("/floors/{floor_id}/rooms")
def get_rooms_for_floor(floor_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    from app.model.room import Room
    return db.query(Room).filter(Room.floor_id == floor_id).all()


@router.post("/rooms")
def add_room(payload: RoomCreateRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return upsert_room(payload, user, db)


@router.post("/beds")
def add_bed(payload: BedCreateRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return upsert_bed(payload, user, db)


@router.get("/{hostel_id}/floors")
def get_floors_for_hostel(hostel_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    from app.model.floor import Floor
    return db.query(Floor).filter(Floor.hostel_id == hostel_id).all()


@router.delete("/floors/{floor_id}")
def delete_floor(floor_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    from app.model.floor import Floor
    from app.model.user import UserRole
    floor = db.query(Floor).filter(Floor.id == floor_id).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    if user.role not in (UserRole.ADMIN, UserRole.OWNER):
        raise HTTPException(status_code=403, detail="Unauthorized")
    db.delete(floor)
    db.commit()
    return {"message": "Floor deleted"}


@router.delete("/rooms/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    from app.model.room import Room
    from app.model.user import UserRole
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if user.role not in (UserRole.ADMIN, UserRole.OWNER):
        raise HTTPException(status_code=403, detail="Unauthorized")
    db.delete(room)
    db.commit()
    return {"message": "Room deleted"}


@router.delete("/beds/{bed_id}")
def delete_bed(bed_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    from app.model.bed import Bed
    from app.model.user import UserRole
    bed = db.query(Bed).filter(Bed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    if user.role not in (UserRole.ADMIN, UserRole.OWNER):
        raise HTTPException(status_code=403, detail="Unauthorized")
    db.delete(bed)
    db.commit()
    return {"message": "Bed deleted"}
