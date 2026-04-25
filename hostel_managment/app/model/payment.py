from sqlalchemy import Column, Integer, ForeignKey, String, Float, Date, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy.sql import func


class Payment(Base):
    __tablename__ = "payments"

    id                     = Column(Integer, primary_key=True)
    tenant_id              = Column(Integer, ForeignKey("users.id"))
    booking_id             = Column(Integer, ForeignKey("bookings.id"))
    amount                 = Column(Float)
    type                   = Column(String)   # payment method label (legacy)
    status                 = Column(String)   # PENDING | APPROVED | REJECTED | OVERDUE

    # Tenant-submitted details
    payment_method         = Column(String, nullable=True)   # UPI | CARD | CASH | BANK_TRANSFER
    transaction_ref        = Column(String, nullable=True)   # UPI ref / last-4 / cash voucher
    tenant_notes           = Column(String, nullable=True)

    # Owner approval
    approved_by_id         = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at            = Column(DateTime(timezone=True), nullable=True)
    owner_remarks          = Column(String, nullable=True)

    # Dates
    due_date               = Column(Date, nullable=True)
    paid_at                = Column(DateTime(timezone=True), nullable=True)
    month_year             = Column(String, nullable=True)   # "2026-04" – month this covers

    # Legacy / S3
    invoice_url            = Column(String, nullable=True)
    gateway_transaction_id = Column(String, nullable=True)

    tenant      = relationship("User", foreign_keys=[tenant_id])
    booking     = relationship("Booking")
    approved_by = relationship("User", foreign_keys=[approved_by_id])
