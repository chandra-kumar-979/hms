from sqlalchemy import Column, Integer, ForeignKey, String, Date, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class VacateRequest(Base):
    __tablename__ = "vacate_requests"

    id                   = Column(Integer, primary_key=True)
    booking_id           = Column(Integer, ForeignKey("bookings.id"))
    tenant_id            = Column(Integer, ForeignKey("users.id"))
    requested_vacate_date = Column(Date, nullable=False)
    reason               = Column(String, nullable=True)

    # Lifecycle: PENDING → APPROVED → COMPLETED  (or REJECTED)
    status               = Column(String, default="PENDING")
    owner_notes          = Column(String, nullable=True)
    notice_given_at      = Column(DateTime(timezone=True), server_default=func.now())
    completed_at         = Column(DateTime(timezone=True), nullable=True)

    # Owner pre-departure checklist
    dues_cleared         = Column(Boolean, default=False)
    inspection_done      = Column(Boolean, default=False)
    deposit_refunded     = Column(Boolean, default=False)
    keys_returned        = Column(Boolean, default=False)

    booking = relationship("Booking")
    tenant  = relationship("User")
