from pydantic import BaseModel, Field
from datetime import date

class BookingRequest(BaseModel):
    bed_id: int = Field(gt=0)
    start_date: date
    end_date: date
    notes: str | None = None


class BookingDecisionRequest(BaseModel):
    booking_id: int = Field(gt=0)
    approve: bool
    reason: str | None = None
