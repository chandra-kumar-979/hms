from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import get_current_user

router = APIRouter()


@router.get("/me")
def role_dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
        },
        "dashboard_route": f"/{user.role.value.lower()}/dashboard",
    }
