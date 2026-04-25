from sqlalchemy import Column, Integer, ForeignKey, String
from app.database import Base

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, ForeignKey("users.id"))
    hostel_id = Column(Integer, ForeignKey("hostels.id"))
    rating = Column(Integer)
    comments = Column(String)
