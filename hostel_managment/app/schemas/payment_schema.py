from pydantic import BaseModel, Field
from datetime import date

class PaymentRequest(BaseModel):
    booking_id: int = Field(gt=0)
    amount: float = Field(gt=0)
    type: str = Field(min_length=2, max_length=50)
    due_date: date | None = None


class PaymentReminderRequest(BaseModel):
    user_id: int = Field(gt=0)
