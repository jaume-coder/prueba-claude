import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from core.config import get_settings
from core.database import create_db_and_tables, engine
from core.models import User
from core.auth import hash_password
from api import auth, youtube_auth, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    _create_admin_if_missing()
    yield


def _create_admin_if_missing():
    settings = get_settings()
    with Session(engine) as session:
        existing = session.exec(select(User).where(User.username == settings.ADMIN_USERNAME)).first()
        if not existing:
            admin = User(
                username=settings.ADMIN_USERNAME,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                is_admin=True,
                modules="all",
            )
            session.add(admin)
            session.commit()


app = FastAPI(title="TDG Dashboard API", version="1.0.0", lifespan=lifespan)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else [settings.APP_BASE_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(youtube_auth.router, prefix="/api/youtube", tags=["YouTube"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


# Servir el frontend en producción
if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
