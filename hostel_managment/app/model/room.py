from sqlalchemy import Column, Integer, ForeignKey, JSON, String
from sqlalchemy.orm import relationship
from app.database import Base

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True)
    floor_id = Column(Integer, ForeignKey("floors.id"))
    room_number = Column(Integer)
    room_type = Column(String)
    images = Column(JSON)

    floor = relationship("Floor")
