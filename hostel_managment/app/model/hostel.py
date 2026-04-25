from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from app.database import Base

class Hostel(Base):
    __tablename__ = "hostels"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    description = Column(String)
    location = Column(String)
    price_per_bed = Column(Float, default=0)
    rating = Column(Integer)
    amenities = Column(JSON)
    images = Column(JSON)
    # Day of month (1–28) on which rent is due every month; 0 = not set
    payment_day = Column(Integer, default=0)

    owner = relationship("User")
