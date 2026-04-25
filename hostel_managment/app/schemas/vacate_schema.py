from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


class VacateRequestCreate(BaseModel):
    booking_id:             int  = Field(gt=0)
    requested_vacate_date:  date
    reason:                 Optional[str] = None


class VacateUpdateRequest(BaseModel):
    """Owner uses this to update checklist items and status."""
    status:           Optional[str]  = None   # APPROVED | REJECTED
    owner_notes:      Optional[str]  = None
    dues_cleared:     Optional[bool] = None
    inspection_done:  Optional[bool] = None
    deposit_refunded: Optional[bool] = None
    keys_returned:    Optional[bool] = None
