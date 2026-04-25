from sqlalchemy import Column, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Floor(Base):
    __tablename__ = "floors"

    id = Column(Integer, primary_key=True)
    hostel_id = Column(Integer, ForeignKey("hostels.id"))
    floor_number = Column(Integer)
    images = Column(JSON)

    hostel = relationship("Hostel")
