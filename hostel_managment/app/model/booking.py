from sqlalchemy import Column, Integer, ForeignKey, String, Date
from sqlalchemy.orm import relationship
from app.database import Base

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, ForeignKey("users.id"))
    bed_id = Column(Integer, ForeignKey("beds.id"))
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(String)
    owner_decision_reason = Column(String)

    tenant = relationship("User")
    bed = relationship("Bed")
