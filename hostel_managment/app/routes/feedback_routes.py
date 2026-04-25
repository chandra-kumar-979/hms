from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.feedback_schema import FeedbackRequest
from app.services.auth_service import get_current_user
from app.services.hostel_service import add_feedback

router = APIRouter()

@router.post("/")
def submit_feedback(
    payload: FeedbackRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return add_feedback(payload, user, db)
