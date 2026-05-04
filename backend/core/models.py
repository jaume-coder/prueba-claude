from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    hashed_password: str
    is_admin: bool = False
    modules: str = "all"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class YouTubeCredentials(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    channel_id: str = Field(default="")
    channel_name: str = Field(default="")
    channel_thumbnail: str = Field(default="")
    access_token: str
    refresh_token: str
    token_expiry: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AnalyticsCache(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    cache_key: str = Field(unique=True, index=True)
    data: str  # JSON string
    cached_at: datetime = Field(default_factory=datetime.utcnow)
