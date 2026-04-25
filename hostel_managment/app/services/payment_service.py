from datetime import date, datetime, UTC
from calendar import monthrange
from io import BytesIO
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.model.payment import Payment
from app.model.booking import Booking
from app.model.bed import Bed
from app.model.room import Room
from app.model.floor import Floor
from app.model.hostel import Hostel
from app.model.notification import Notification
from app.model.user import User, UserRole


# ── Helpers ────────────────────────────────────────────────────────────────────

def _booking_hostel(booking_id: int, db: Session):
    row = (
        db.query(Booking, Hostel)
        .join(Bed, Booking.bed_id == Bed.id)
        .join(Room, Bed.room_id == Room.id)
        .join(Floor, Room.floor_id == Floor.id)
        .join(Hostel, Floor.hostel_id == Hostel.id)
        .filter(Booking.id == booking_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Booking not found")
    return row  # (booking, hostel)


def _due_date_this_month(payment_day: int) -> date:
    today = date.today()
    last_day = monthrange(today.year, today.month)[1]
    day = min(payment_day, last_day)
    return date(today.year, today.month, day)


def _month_year() -> str:
    return date.today().strftime("%Y-%m")


def _notify(db: Session, user_id: int, title: str, message: str, category: str = "PAYMENT"):
    db.add(Notification(user_id=user_id, title=title, message=message, category=category))


# ── Owner: set payment day ─────────────────────────────────────────────────────

def set_hostel_payment_day(hostel_id: int, payment_day: int, user, db: Session):
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owner/admin can set payment day")
    if not (1 <= payment_day <= 28):
        raise HTTPException(status_code=400, detail="Payment day must be between 1 and 28")
    hostel = db.query(Hostel).filter(Hostel.id == hostel_id).first()
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
    if user.role == UserRole.OWNER and hostel.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your hostel")
    hostel.payment_day = payment_day
    db.commit()
    db.refresh(hostel)
    return {"hostel_id": hostel_id, "payment_day": payment_day}


# ── Tenant: submit payment ─────────────────────────────────────────────────────

def tenant_submit_payment(booking_id: int, amount: float, method: str,
                          transaction_ref: str | None, notes: str | None,
                          user, db: Session):
    if user.role != UserRole.TENANT:
        raise HTTPException(status_code=403, detail="Only tenants can submit payments")

    booking, hostel = _booking_hostel(booking_id, db)

    if booking.tenant_id != user.id:
        raise HTTPException(status_code=403, detail="Not your booking")
    if booking.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Only approved bookings can have payments")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    my = _month_year()
    existing = db.query(Payment).filter(
        Payment.booking_id == booking_id,
        Payment.month_year == my,
        Payment.status.in_(["PENDING", "APPROVED"]),
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Payment for {my} already submitted")

    due = _due_date_this_month(hostel.payment_day or 1)
    payment = Payment(
        tenant_id=user.id,
        booking_id=booking_id,
        amount=amount,
        type=method,
        status="PENDING",
        payment_method=method,
        transaction_ref=transaction_ref,
        tenant_notes=notes,
        due_date=due,
        month_year=my,
    )
    db.add(payment)

    # Notify owner
    _notify(db, hostel.owner_id,
            "Payment submitted for approval",
            f"Tenant #{user.id} submitted ₹{amount:.0f} for booking #{booking_id} ({my}) via {method}.",
            "PAYMENT")
    db.commit()
    db.refresh(payment)
    return payment


# ── Owner: approve / reject payment ───────────────────────────────────────────

def owner_approve_payment(payment_id: int, approve: bool, remarks: str | None, user, db: Session):
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owner/admin can approve payments")

    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status != "PENDING":
        raise HTTPException(status_code=400, detail="Payment is not in PENDING state")

    _, hostel = _booking_hostel(payment.booking_id, db)
    if user.role == UserRole.OWNER and hostel.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your hostel's payment")

    payment.status = "APPROVED" if approve else "REJECTED"
    payment.approved_by_id = user.id
    payment.approved_at = datetime.now(UTC)
    payment.owner_remarks = remarks
    if approve:
        payment.paid_at = datetime.now(UTC)

    msg = (
        f"Your payment of ₹{payment.amount:.0f} for booking #{payment.booking_id} "
        f"({payment.month_year}) has been {'approved ✅' if approve else 'rejected ❌'}."
    )
    if remarks:
        msg += f" Note: {remarks}"
    _notify(db, payment.tenant_id, f"Payment {'approved' if approve else 'rejected'}", msg, "PAYMENT")

    db.commit()
    db.refresh(payment)
    return payment


# ── Tenant: list payments ──────────────────────────────────────────────────────

def list_tenant_payments(tenant_id: int, db: Session):
    return db.query(Payment).filter(Payment.tenant_id == tenant_id).order_by(Payment.id.desc()).all()


def list_owner_payments(owner_id: int, db: Session):
    return (
        db.query(Payment)
        .join(Booking, Payment.booking_id == Booking.id)
        .join(Bed, Booking.bed_id == Bed.id)
        .join(Room, Bed.room_id == Room.id)
        .join(Floor, Room.floor_id == Floor.id)
        .join(Hostel, Floor.hostel_id == Hostel.id)
        .filter(Hostel.owner_id == owner_id)
        .order_by(Payment.id.desc())
        .all()
    )


def list_all_payments(db: Session):
    return db.query(Payment).order_by(Payment.id.desc()).all()


# ── PDF receipt ────────────────────────────────────────────────────────────────

def generate_receipt_pdf(payment_id: int, user, db: Session) -> bytes:
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Receipt only available for approved payments")
    if user.role == UserRole.TENANT and payment.tenant_id != user.id:
        raise HTTPException(status_code=403, detail="Not your payment")

    _, hostel = _booking_hostel(payment.booking_id, db)
    tenant = db.query(User).filter(User.id == payment.tenant_id).first()

    from fpdf import FPDF

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Header
    pdf.set_fill_color(59, 91, 219)   # indigo
    pdf.rect(0, 0, 210, 28, "F")
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(255, 255, 255)
    pdf.set_y(8)
    pdf.cell(0, 12, "PAYMENT RECEIPT", align="C", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, hostel.name, align="C", ln=True)

    pdf.set_text_color(30, 30, 30)
    pdf.set_y(36)

    def row(label: str, value: str):
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(55, 8, label, border="B")
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 8, value, border="B", ln=True)
        pdf.ln(1)

    row("Receipt No:",       f"RCP-{payment.id:05d}")
    row("Month:",            payment.month_year or "-")
    row("Date of Approval:", str(payment.approved_at.date()) if payment.approved_at else "-")
    pdf.ln(3)

    row("Tenant Name:",      tenant.name if tenant else f"#{payment.tenant_id}")
    row("Tenant Email:",     tenant.email if tenant else "-")
    row("Booking ID:",       f"#{payment.booking_id}")
    pdf.ln(3)

    row("Hostel:",           hostel.name)
    row("Location:",         hostel.location or "-")
    pdf.ln(3)

    row("Payment Method:",   payment.payment_method or payment.type or "-")
    row("Transaction Ref:",  payment.transaction_ref or "-")
    if payment.tenant_notes:
        row("Notes:",        payment.tenant_notes)
    if payment.owner_remarks:
        row("Owner Remarks:", payment.owner_remarks)
    pdf.ln(5)

    # Amount box
    pdf.set_fill_color(240, 253, 244)
    pdf.set_draw_color(134, 239, 172)
    pdf.rect(14, pdf.get_y(), 182, 16, "FD")
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(21, 128, 61)
    pdf.set_y(pdf.get_y() + 3)
    pdf.cell(0, 10, f"Amount Paid:  INR {payment.amount:,.2f}", align="C", ln=True)

    pdf.set_text_color(30, 30, 30)
    pdf.ln(8)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, "This is a computer-generated receipt. No signature required.", align="C", ln=True)

    return bytes(pdf.output())


# ── Scheduled jobs ─────────────────────────────────────────────────────────────

def run_payment_reminders(db: Session):
    """
    For every active booking whose hostel has a payment_day set:
    - 7 days before due: send reminder to tenant + owner (once per month)
    """
    today = date.today()
    my = _month_year()

    bookings = (
        db.query(Booking, Hostel, User)
        .join(Bed, Booking.bed_id == Bed.id)
        .join(Room, Bed.room_id == Room.id)
        .join(Floor, Room.floor_id == Floor.id)
        .join(Hostel, Floor.hostel_id == Hostel.id)
        .join(User, Booking.tenant_id == User.id)
        .filter(Booking.status == "APPROVED", Hostel.payment_day > 0)
        .all()
    )

    sent = 0
    for booking, hostel, tenant in bookings:
        due = _due_date_this_month(hostel.payment_day)
        days_to_due = (due - today).days

        if days_to_due < 0 or days_to_due > 7:
            continue

        # Check if reminder already sent this month
        already = db.query(Notification).filter(
            Notification.user_id == tenant.id,
            Notification.title == "Rent payment reminder",
            Notification.message.contains(my),
        ).first()
        if already:
            continue

        # Tenant reminder
        _notify(db, tenant.id, "Rent payment reminder",
                f"Your rent for {hostel.name} is due on {due} ({my}). "
                f"Amount: ₹{hostel.price_per_bed:.0f}. Please pay via your dashboard.",
                "PAYMENT_DUE")
        # Owner reminder
        _notify(db, hostel.owner_id, "Upcoming rent due",
                f"Tenant {tenant.name} (booking #{booking.id}) has rent due on {due} ({my}).",
                "PAYMENT_DUE")
        sent += 1

    db.commit()
    return {"reminders_sent": sent, "checked": len(bookings)}


def run_overdue_alerts(db: Session):
    """
    For every active booking past its payment_day with no APPROVED/PENDING payment this month:
    - Mark as OVERDUE and notify owner
    - If 2+ days past due: send SERIOUS ALERT
    """
    today = date.today()
    my = _month_year()

    bookings = (
        db.query(Booking, Hostel, User)
        .join(Bed, Booking.bed_id == Bed.id)
        .join(Room, Bed.room_id == Room.id)
        .join(Floor, Room.floor_id == Floor.id)
        .join(Hostel, Floor.hostel_id == Hostel.id)
        .join(User, Booking.tenant_id == User.id)
        .filter(Booking.status == "APPROVED", Hostel.payment_day > 0)
        .all()
    )

    alerts = 0
    for booking, hostel, tenant in bookings:
        due = _due_date_this_month(hostel.payment_day)
        days_overdue = (today - due).days

        if days_overdue <= 0:
            continue  # not yet due

        # Check if payment made this month
        paid = db.query(Payment).filter(
            Payment.booking_id == booking.id,
            Payment.month_year == my,
            Payment.status.in_(["PENDING", "APPROVED"]),
        ).first()
        if paid:
            continue

        # Check if overdue record already created this month
        overdue_notif_exists = db.query(Notification).filter(
            Notification.user_id == hostel.owner_id,
            Notification.category.in_(["OVERDUE", "SERIOUS_ALERT"]),
            Notification.message.contains(f"booking #{booking.id}"),
            Notification.message.contains(my),
        ).first()

        category = "SERIOUS_ALERT" if days_overdue >= 2 else "OVERDUE"

        if not overdue_notif_exists or (days_overdue >= 2 and overdue_notif_exists.category == "OVERDUE"):
            prefix = "🚨 SERIOUS ALERT" if days_overdue >= 2 else "⚠️ Overdue Alert"
            _notify(db, hostel.owner_id, f"{prefix}: Missed payment",
                    f"Tenant {tenant.name} (booking #{booking.id}) has NOT paid rent for {my}. "
                    f"{days_overdue} day(s) overdue since {due}.",
                    category)
            # Also alert the tenant
            _notify(db, tenant.id, "Rent overdue",
                    f"Your rent for {hostel.name} ({my}) is {days_overdue} day(s) overdue. "
                    "Please pay immediately to avoid issues.",
                    category)
            alerts += 1

    db.commit()
    return {"alerts_sent": alerts, "checked": len(bookings)}
