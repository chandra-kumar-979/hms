from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import get_current_user
from app.schemas.user_schema import UserProfileResponse, UpdateProfileRequest
from app.services.auth_service import update_profile_service

router = APIRouter()

@router.get("/me", response_model=UserProfileResponse)
def get_profile(user=Depends(get_current_user)):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value if user.role else ""
    }


@router.patch("/me", response_model=UserProfileResponse)
def update_profile(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    updated = update_profile_service(user, payload.name, payload.phone, payload.profile_image, db)
    return {"id": updated.id, "name": updated.name, "email": updated.email, "role": updated.role.value}
