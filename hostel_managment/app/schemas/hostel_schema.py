from pydantic import BaseModel


class HostelCreate(BaseModel):
    name: str
    description: str
    location: str
    price_per_bed: float = 0
    amenities: list[str] = []


class HostelFilterParams(BaseModel):
    location: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    min_rating: int | None = None


class HostelUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    location: str | None = None
    price_per_bed: float | None = None
    rating: int | None = None
    amenities: list[str] | None = None
    images: list[str] | None = None
