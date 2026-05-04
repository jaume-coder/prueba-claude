from sqlmodel import SQLModel, create_engine, Session
from .models import User, YouTubeCredentials, AnalyticsCache

import os
os.makedirs("data", exist_ok=True)
DATABASE_URL = "sqlite:///./data/tdg_dashboard.db"

engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
