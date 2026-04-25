from sqlalchemy import Column, Integer, ForeignKey, String
from sqlalchemy.orm import relationship
from app.database import Base

class Bed(Base):
    __tablename__ = "beds"

    id = Column(Integer, primary_key=True)
    room_id = Column(Integer, ForeignKey("rooms.id"))
    bed_number = Column(Integer)
    status = Column(String)  # AVAILABLE / OCCUPIED / RESERVED

    room = relationship("Room")
