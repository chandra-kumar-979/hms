from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Neon/Render PostgreSQL URLs start with postgres:// — SQLAlchemy needs postgresql://
_db_url = settings.DATABASE_URL
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql://", 1)

_connect_args = {"check_same_thread": False} if _db_url.startswith("sqlite") else {}
engine = create_engine(_db_url, pool_pre_ping=True, connect_args=_connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
