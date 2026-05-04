from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 horas

    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    APP_BASE_URL: str = "http://localhost:8000"

    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"

    @property
    def google_redirect_uri(self) -> str:
        return f"{self.APP_BASE_URL}/api/youtube/callback"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
