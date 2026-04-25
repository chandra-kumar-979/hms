from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import get_current_user
from app.model.user import UserRole
from app.services.report_service import owner_monthly_report

router = APIRouter()


@router.get("/owner/monthly")
def monthly_owner_report(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owner/admin can view owner reports")
    return owner_monthly_report(user.id, db)
