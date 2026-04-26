from pydantic import BaseModel, Field


class FloorCreateRequest(BaseModel):
    hostel_id: int = Field(gt=0)
    floor_number: int = Field(gt=0)
    images: list[str] = []


class RoomCreateRequest(BaseModel):
    floor_id: int = Field(gt=0)
    room_number: int = Field(gt=0)
    room_type: str
    images: list[str] = []


class BedCreateRequest(BaseModel):
    room_id: int = Field(gt=0)
    bed_number: int = Field(gt=0)
    status: str = "AVAILABLE"


class BroadcastRequest(BaseModel):
    hostel_id: int = Field(gt=0)
    subject: str
    message: str


class OwnerStatusUpdateRequest(BaseModel):
    owner_id: int = Field(gt=0)
    is_active: bool


class OwnerCreateRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: str | None = None
