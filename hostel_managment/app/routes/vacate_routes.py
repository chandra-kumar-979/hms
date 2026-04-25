from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.auth_service import get_current_user
from app.model.user import UserRole
from app.schemas.vacate_schema import VacateRequestCreate, VacateUpdateRequest
from app.services.vacate_service import (
    create_vacate_request,
    list_tenant_vacate_requests,
    list_owner_vacate_requests,
    update_vacate_request,
    complete_vacate,
    get_vacate_summary,
)

router = APIRouter()


# ── Tenant ──────────────────────────────────────────────────────────────────────

@router.post("/")
def raise_vacate_notice(
    payload: VacateRequestCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return create_vacate_request(payload, user, db)


@router.get("/me")
def my_vacate_requests(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return list_tenant_vacate_requests(user.id, db)


# ── Owner / Admin ───────────────────────────────────────────────────────────────

@router.get("/owner/requests")
def owner_vacate_requests(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owner/admin can view vacate requests")
    if user.role == UserRole.ADMIN:
        from app.model.vacate import VacateRequest
        return db.query(VacateRequest).all()
    return list_owner_vacate_requests(user.id, db)


@router.get("/{request_id}/summary")
def vacate_summary(request_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owner/admin can view vacate summary")
    return get_vacate_summary(request_id, db)


@router.patch("/{request_id}")
def update_vacate(
    request_id: int,
    payload: VacateUpdateRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return update_vacate_request(request_id, payload, user, db)


@router.post("/{request_id}/complete")
def close_vacate(
    request_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return complete_vacate(request_id, user, db)
