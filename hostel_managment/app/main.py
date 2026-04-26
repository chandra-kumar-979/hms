from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import (
    auth_routes,
    user_routes,
    hostel_routes,
    booking_routes,
    payment_routes,
    feedback_routes,
    dashboard_routes,
    owner_routes,
    admin_routes,
    notification_routes,
    report_routes,
)
from app.routes import vacate_routes
from app.database import Base, engine
from app.config import settings
from app.errors import register_error_handlers
from app.model.user import User
from app.model.hostel import Hostel
from app.model.floor import Floor
from app.model.room import Room
from app.model.bed import Bed
from app.model.booking import Booking
from app.model.payment import Payment
from app.model.feedback import Feedback
from app.model.notification import Notification
from app.model.broadcast import BroadcastMessage
from app.model.vacate import VacateRequest
from app.model.password_reset import PasswordResetToken

Base.metadata.create_all(bind=engine)

# Auto-migrate: add columns that may be missing from existing tables
def run_migrations():
    from sqlalchemy import text, inspect
    with engine.connect() as conn:
        inspector = inspect(engine)
        db_url = str(engine.url)
        is_postgres = db_url.startswith("postgresql")

        # Add password_hash to users if missing
        user_cols = [c["name"] for c in inspector.get_columns("users")]
        if "password_hash" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR"))
            conn.commit()

        # Add payment columns if missing
        payment_cols = [c["name"] for c in inspector.get_columns("payments")]
        for col, col_type in [
            ("payment_method", "VARCHAR"),
            ("transaction_ref", "VARCHAR"),
            ("tenant_notes", "VARCHAR"),
            ("approved_by_id", "INTEGER"),
            ("approved_at", "TIMESTAMP WITH TIME ZONE" if is_postgres else "DATETIME"),
            ("owner_remarks", "VARCHAR"),
            ("month_year", "VARCHAR"),
        ]:
            if col not in payment_cols:
                conn.execute(text(f"ALTER TABLE payments ADD COLUMN {col} {col_type}"))
                conn.commit()

        # Add payment_day to hostels if missing
        hostel_cols = [c["name"] for c in inspector.get_columns("hostels")]
        if "payment_day" not in hostel_cols:
            conn.execute(text("ALTER TABLE hostels ADD COLUMN payment_day INTEGER DEFAULT 0"))
            conn.commit()

try:
    run_migrations()
except Exception as e:
    import logging
    logging.getLogger(__name__).warning("Migration warning (non-fatal): %s", e)

app = FastAPI(title="Hostel Management System API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/auth", tags=["Auth"])
app.include_router(user_routes.router, prefix="/users", tags=["Users"])
app.include_router(hostel_routes.router, prefix="/hostels", tags=["Hostels"])
app.include_router(booking_routes.router, prefix="/bookings", tags=["Bookings"])
app.include_router(payment_routes.router, prefix="/payments", tags=["Payments"])
app.include_router(feedback_routes.router, prefix="/feedback", tags=["Feedback"])
app.include_router(dashboard_routes.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(owner_routes.router, prefix="/owner", tags=["Owner"])
app.include_router(admin_routes.router, prefix="/admin", tags=["Admin"])
app.include_router(notification_routes.router, prefix="/notifications", tags=["Notifications"])
app.include_router(report_routes.router, prefix="/reports", tags=["Reports"])
app.include_router(vacate_routes.router, prefix="/vacate", tags=["Vacate"])

register_error_handlers(app)

@app.get("/")
def root():
    return {"message": "Hostel Management System API Running"}
