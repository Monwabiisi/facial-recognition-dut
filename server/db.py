import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Default to SQLite local file
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# Special connect args for SQLite
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# Engine
engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


# Dependency for FastAPI routes
def get_db():
    """Provide a SQLAlchemy session to FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
