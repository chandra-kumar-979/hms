from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import get_current_user
from app.services.notification_service import list_user_notifications, mark_notification_read

router = APIRouter()


@router.get("/me")
def my_notifications(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return list_user_notifications(user.id, db)


@router.patch("/{notification_id}/read")
def read_notification(notification_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return mark_notification_read(notification_id, user.id, db)
