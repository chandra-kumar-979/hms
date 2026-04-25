from fastapi import APIRouter, Depends, Response
from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.services.auth_service import get_current_user
from app.model.user import UserRole
from app.services.payment_service import (
    tenant_submit_payment,
    owner_approve_payment,
    list_tenant_payments,
    list_owner_payments,
    list_all_payments,
    generate_receipt_pdf,
    run_payment_reminders,
    run_overdue_alerts,
    set_hostel_payment_day,
)

router = APIRouter()


# ── Schemas (inline) ──────────────────────────────────────────────────────────

class SubmitPaymentRequest(BaseModel):
    booking_id:      int
    amount:          float
    payment_method:  str          # UPI | CARD | CASH | BANK_TRANSFER
    transaction_ref: Optional[str] = None
    notes:           Optional[str] = None


class ApprovePaymentRequest(BaseModel):
    approve:  bool
    remarks:  Optional[str] = None


class PaymentDayRequest(BaseModel):
    payment_day: int   # 1–28


# ── Tenant ────────────────────────────────────────────────────────────────────

@router.post("/submit")
def submit_payment(
    payload: SubmitPaymentRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return tenant_submit_payment(
        payload.booking_id, payload.amount, payload.payment_method,
        payload.transaction_ref, payload.notes, user, db,
    )


@router.get("/me")
def my_payments(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return list_tenant_payments(user.id, db)


@router.get("/{payment_id}/receipt")
def download_receipt(
    payment_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    pdf_bytes = generate_receipt_pdf(payment_id, user, db)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=receipt-{payment_id}.pdf"},
    )


# ── Owner ─────────────────────────────────────────────────────────────────────

@router.post("/{payment_id}/approve")
def approve_payment(
    payment_id: int,
    payload: ApprovePaymentRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return owner_approve_payment(payment_id, payload.approve, payload.remarks, user, db)


@router.get("/owner/overview")
def owner_payment_overview(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owner/admin can view payments")
    if user.role == UserRole.ADMIN:
        return list_all_payments(db)
    return list_owner_payments(user.id, db)


@router.get("/owner/pending")
def pending_payments(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Unauthorized")
    payments = list_owner_payments(user.id, db) if user.role == UserRole.OWNER else list_all_payments(db)
    return [p for p in payments if p.status == "PENDING"]


# ── Hostel payment day ────────────────────────────────────────────────────────

@router.post("/hostels/{hostel_id}/payment-day")
def update_payment_day(
    hostel_id: int,
    payload: PaymentDayRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return set_hostel_payment_day(hostel_id, payload.payment_day, user, db)


# ── Scheduled jobs (manual trigger) ──────────────────────────────────────────

@router.post("/jobs/reminders")
def trigger_reminders(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    return run_payment_reminders(db)


@router.post("/jobs/overdue")
def trigger_overdue(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    return run_overdue_alerts(db)
