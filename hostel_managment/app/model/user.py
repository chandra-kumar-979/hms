from sqlalchemy import Column, Integer, String, Enum, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base
import enum

class UserRole(enum.Enum):
    TENANT = "TENANT"
    OWNER = "OWNER"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    role = Column(Enum(UserRole))
    google_id = Column(String)
    phone = Column(String)
    profile_image = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
