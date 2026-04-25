from datetime import date, timedelta

from app.database import Base, SessionLocal, engine
from app.model.user import User, UserRole
from app.model.hostel import Hostel
from app.model.floor import Floor
from app.model.room import Room
from app.model.bed import Bed
from app.model.booking import Booking
from app.model.payment import Payment
from app.model.feedback import Feedback
from app.model.notification import Notification
from app.model.broadcast import BroadcastMessage


def get_or_create_user(db, *, name: str, email: str, role: UserRole, google_id: str):
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user, False

    user = User(
        name=name,
        email=email,
        role=role,
        google_id=google_id,
    )
    db.add(user)
    db.flush()
    return user, True


def get_or_create_hostel(db, owner_id: int, name: str, description: str, location: str, rating: int, price_per_bed: float, amenities: list[str], images: list[str]):
    row = db.query(Hostel).filter(Hostel.name == name).first()
    if row:
        return row, False
    row = Hostel(
        owner_id=owner_id,
        name=name,
        description=description,
        location=location,
        rating=rating,
        price_per_bed=price_per_bed,
        amenities=amenities,
        images=images,
    )
    db.add(row)
    db.flush()
    return row, True


def get_or_create_floor(db, hostel_id: int, floor_number: int, images: list[str]):
    row = db.query(Floor).filter(Floor.hostel_id == hostel_id, Floor.floor_number == floor_number).first()
    if row:
        return row, False
    row = Floor(hostel_id=hostel_id, floor_number=floor_number, images=images)
    db.add(row)
    db.flush()
    return row, True


def get_or_create_room(db, floor_id: int, room_number: int, room_type: str, images: list[str]):
    row = db.query(Room).filter(Room.floor_id == floor_id, Room.room_number == room_number).first()
    if row:
        return row, False
    row = Room(floor_id=floor_id, room_number=room_number, room_type=room_type, images=images)
    db.add(row)
    db.flush()
    return row, True


def get_or_create_bed(db, room_id: int, bed_number: int, status: str):
    row = db.query(Bed).filter(Bed.room_id == room_id, Bed.bed_number == bed_number).first()
    if row:
        row.status = status
        db.flush()
        return row, False
    row = Bed(room_id=room_id, bed_number=bed_number, status=status)
    db.add(row)
    db.flush()
    return row, True


def get_or_create_booking(db, tenant_id: int, bed_id: int, start_date: date, end_date: date, status: str, owner_decision_reason: str | None = None):
    row = db.query(Booking).filter(Booking.tenant_id == tenant_id, Booking.bed_id == bed_id).first()
    if row:
        row.status = status
        row.owner_decision_reason = owner_decision_reason
        db.flush()
        return row, False
    row = Booking(
        tenant_id=tenant_id,
        bed_id=bed_id,
        start_date=start_date,
        end_date=end_date,
        status=status,
        owner_decision_reason=owner_decision_reason,
    )
    db.add(row)
    db.flush()
    return row, True


def get_or_create_payment(db, tenant_id: int, booking_id: int, amount: float, pay_type: str, status: str, invoice_url: str, due_date: date | None, gateway_transaction_id: str | None):
    row = db.query(Payment).filter(Payment.booking_id == booking_id).first()
    if row:
        row.amount = amount
        row.type = pay_type
        row.status = status
        row.invoice_url = invoice_url
        row.due_date = due_date
        row.gateway_transaction_id = gateway_transaction_id
        db.flush()
        return row, False
    row = Payment(
        tenant_id=tenant_id,
        booking_id=booking_id,
        amount=amount,
        type=pay_type,
        status=status,
        invoice_url=invoice_url,
        due_date=due_date,
        gateway_transaction_id=gateway_transaction_id,
    )
    db.add(row)
    db.flush()
    return row, True


def get_or_create_feedback(db, tenant_id: int, hostel_id: int, rating: int, comments: str):
    row = db.query(Feedback).filter(Feedback.tenant_id == tenant_id, Feedback.hostel_id == hostel_id).first()
    if row:
        row.rating = rating
        row.comments = comments
        db.flush()
        return row, False
    row = Feedback(tenant_id=tenant_id, hostel_id=hostel_id, rating=rating, comments=comments)
    db.add(row)
    db.flush()
    return row, True


def get_or_create_notification(db, user_id: int, title: str, message: str, category: str):
    row = db.query(Notification).filter(Notification.user_id == user_id, Notification.title == title, Notification.message == message).first()
    if row:
        return row, False
    row = Notification(user_id=user_id, title=title, message=message, category=category)
    db.add(row)
    db.flush()
    return row, True


def get_or_create_broadcast(db, hostel_id: int, owner_id: int, subject: str, message: str):
    row = db.query(BroadcastMessage).filter(BroadcastMessage.hostel_id == hostel_id, BroadcastMessage.subject == subject).first()
    if row:
        return row, False
    row = BroadcastMessage(hostel_id=hostel_id, owner_id=owner_id, subject=subject, message=message)
    db.add(row)
    db.flush()
    return row, True


def seed_demo_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        owner, owner_created = get_or_create_user(
            db,
            name="Demo Owner",
            email="owner.demo@hostelms.local",
            role=UserRole.OWNER,
            google_id="owner-demo-google-id",
        )
        owner2, owner2_created = get_or_create_user(
            db,
            name="Demo Owner 2",
            email="owner2.demo@hostelms.local",
            role=UserRole.OWNER,
            google_id="owner2-demo-google-id",
        )
        tenant, tenant_created = get_or_create_user(
            db,
            name="Demo Tenant",
            email="tenant.demo@hostelms.local",
            role=UserRole.TENANT,
            google_id="tenant-demo-google-id",
        )
        tenant2, tenant2_created = get_or_create_user(
            db,
            name="Demo Tenant 2",
            email="tenant2.demo@hostelms.local",
            role=UserRole.TENANT,
            google_id="tenant2-demo-google-id",
        )
        admin, admin_created = get_or_create_user(
            db,
            name="Demo Admin",
            email="admin.demo@hostelms.local",
            role=UserRole.ADMIN,
            google_id="admin-demo-google-id",
        )

        hostel1, hostel1_created = get_or_create_hostel(
            db,
            owner_id=owner.id,
            name="Sunrise Residency",
            description="Premium demo hostel in Bengaluru.",
            location="Bengaluru",
            rating=4,
            price_per_bed=8500.0,
            amenities=["wifi", "laundry", "power backup", "security"],
            images=["https://example.com/hostel-sunrise-1.jpg", "https://example.com/hostel-sunrise-2.jpg"],
        )
        hostel2, hostel2_created = get_or_create_hostel(
            db,
            owner_id=owner2.id,
            name="Green Nest PG",
            description="Affordable and peaceful stay near tech parks.",
            location="Hyderabad",
            rating=5,
            price_per_bed=7000.0,
            amenities=["wifi", "food", "cctv"],
            images=["https://example.com/hostel-greennest-1.jpg"],
        )

        floor1, floor1_created = get_or_create_floor(db, hostel1.id, 1, ["https://example.com/sunrise-floor1.jpg"])
        floor2, floor2_created = get_or_create_floor(db, hostel1.id, 2, ["https://example.com/sunrise-floor2.jpg"])
        floor3, floor3_created = get_or_create_floor(db, hostel2.id, 1, ["https://example.com/greennest-floor1.jpg"])

        room101, room101_created = get_or_create_room(db, floor1.id, 101, "DOUBLE", ["https://example.com/sunrise-room101.jpg"])
        room102, room102_created = get_or_create_room(db, floor1.id, 102, "TRIPLE", ["https://example.com/sunrise-room102.jpg"])
        room201, room201_created = get_or_create_room(db, floor2.id, 201, "DOUBLE", ["https://example.com/sunrise-room201.jpg"])
        room301, room301_created = get_or_create_room(db, floor3.id, 301, "DOUBLE", ["https://example.com/greennest-room301.jpg"])

        beds_created = 0
        for room_obj, statuses in [
            (room101, ["OCCUPIED", "AVAILABLE"]),
            (room102, ["RESERVED", "AVAILABLE", "AVAILABLE"]),
            (room201, ["AVAILABLE", "AVAILABLE"]),
            (room301, ["AVAILABLE", "AVAILABLE"]),
        ]:
            for idx, status in enumerate(statuses, start=1):
                _, created = get_or_create_bed(db, room_obj.id, idx, status)
                beds_created += 1 if created else 0

        bed_tenant1 = db.query(Bed).filter(Bed.room_id == room101.id, Bed.bed_number == 1).first()
        bed_tenant2 = db.query(Bed).filter(Bed.room_id == room301.id, Bed.bed_number == 1).first()

        booking1, booking1_created = get_or_create_booking(
            db,
            tenant_id=tenant.id,
            bed_id=bed_tenant1.id,
            start_date=date.today() - timedelta(days=15),
            end_date=date.today() + timedelta(days=15),
            status="APPROVED",
            owner_decision_reason="Approved after KYC",
        )
        booking2, booking2_created = get_or_create_booking(
            db,
            tenant_id=tenant2.id,
            bed_id=bed_tenant2.id,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            status="PENDING",
            owner_decision_reason=None,
        )

        payment1, payment1_created = get_or_create_payment(
            db,
            tenant_id=tenant.id,
            booking_id=booking1.id,
            amount=8500.0,
            pay_type="UPI",
            status="SUCCESS",
            invoice_url="https://example.com/invoices/invoice-tenant1-paid.pdf",
            due_date=date.today() - timedelta(days=2),
            gateway_transaction_id="mock-paid-tenant1",
        )
        payment2, payment2_created = get_or_create_payment(
            db,
            tenant_id=tenant2.id,
            booking_id=booking2.id,
            amount=7000.0,
            pay_type="CARD",
            status="PENDING",
            invoice_url="https://example.com/invoices/invoice-tenant2-due.pdf",
            due_date=date.today() + timedelta(days=2),
            gateway_transaction_id=None,
        )

        feedback1, feedback1_created = get_or_create_feedback(
            db,
            tenant_id=tenant.id,
            hostel_id=hostel1.id,
            rating=5,
            comments="Clean rooms and supportive staff.",
        )
        feedback2, feedback2_created = get_or_create_feedback(
            db,
            tenant_id=tenant2.id,
            hostel_id=hostel2.id,
            rating=4,
            comments="Good value for money and decent food.",
        )

        notif1, notif1_created = get_or_create_notification(
            db,
            user_id=tenant2.id,
            title="Payment due reminder",
            message=f"Rent payment is due on {date.today() + timedelta(days=2)}",
            category="PAYMENT_DUE",
        )
        notif2, notif2_created = get_or_create_notification(
            db,
            user_id=tenant.id,
            title="Booking approved",
            message="Your booking request for Sunrise Residency has been approved.",
            category="BOOKING",
        )

        broadcast1, broadcast1_created = get_or_create_broadcast(
            db,
            hostel_id=hostel1.id,
            owner_id=owner.id,
            subject="Water maintenance update",
            message="Water supply will be interrupted from 10 AM to 12 PM tomorrow.",
        )

        db.commit()

        print("Seed completed.")
        print(f"users: owner={owner.id}, owner2={owner2.id}, tenant={tenant.id}, tenant2={tenant2.id}, admin={admin.id}")
        print(f"created users: owner={owner_created}, owner2={owner2_created}, tenant={tenant_created}, tenant2={tenant2_created}, admin={admin_created}")
        print(
            "created hostels/floors/rooms/beds: "
            f"hostel1={hostel1_created}, hostel2={hostel2_created}, "
            f"floors={sum([floor1_created, floor2_created, floor3_created])}, "
            f"rooms={sum([room101_created, room102_created, room201_created, room301_created])}, "
            f"beds={beds_created}"
        )
        print(
            "created bookings/payments/feedback/notifications/broadcasts: "
            f"bookings={sum([booking1_created, booking2_created])}, "
            f"payments={sum([payment1_created, payment2_created])}, "
            f"feedback={sum([feedback1_created, feedback2_created])}, "
            f"notifications={sum([notif1_created, notif2_created])}, "
            f"broadcasts={sum([broadcast1_created])}"
        )
        print("Demo accounts:")
        print("- admin.demo@hostelms.local (ADMIN)")
        print("- owner.demo@hostelms.local (OWNER)")
        print("- owner2.demo@hostelms.local (OWNER)")
        print("- tenant.demo@hostelms.local (TENANT)")
        print("- tenant2.demo@hostelms.local (TENANT)")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
