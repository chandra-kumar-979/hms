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

Base.metadata.create_all(bind=engine)

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
