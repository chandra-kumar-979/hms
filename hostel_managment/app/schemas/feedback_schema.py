from pydantic import BaseModel, Field

class FeedbackRequest(BaseModel):
    hostel_id: int = Field(gt=0)
    rating: int = Field(ge=1, le=5)
    comments: str = Field(min_length=2, max_length=1000)
