import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database.models import Base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./placement_mentor.db")

# For SQLite, we set connect_args={"check_same_thread": False} to allow multiple threads to access it (FastAPI is async/multi-threaded).
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
