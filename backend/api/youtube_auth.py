from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import datetime

from core.database import get_session
from core.models import YouTubeCredentials
from core.auth import get_current_user, get_admin_user
from core.models import User
from services.youtube import (
    get_auth_url, exchange_code_for_tokens, get_youtube_services,
    get_stored_credentials, fetch_channel_info
)

router = APIRouter()


class YouTubeStatus(BaseModel):
    connected: bool
    channel_name: str = ""
    channel_id: str = ""
    channel_thumbnail: str = ""


class AuthUrlResponse(BaseModel):
    auth_url: str


@router.get("/status", response_model=YouTubeStatus)
async def youtube_status(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    creds = get_stored_credentials(session)
    if not creds:
        return YouTubeStatus(connected=False)
    return YouTubeStatus(
        connected=True,
        channel_name=creds.channel_name,
        channel_id=creds.channel_id,
        channel_thumbnail=creds.channel_thumbnail,
    )


@router.get("/auth-url", response_model=AuthUrlResponse)
async def get_youtube_auth_url(
    current_user: User = Depends(get_admin_user),
):
    auth_url = get_auth_url()
    return AuthUrlResponse(auth_url=auth_url)


@router.get("/callback")
async def youtube_callback(
    code: str = Query(...),
    session: Session = Depends(get_session),
):
    try:
        tokens = exchange_code_for_tokens(code)
    except Exception as e:
        return RedirectResponse(url=f"/?error=oauth_failed&detail={str(e)}")

    existing = get_stored_credentials(session)
    if existing:
        existing.access_token = tokens["access_token"]
        existing.refresh_token = tokens["refresh_token"]
        existing.token_expiry = tokens["token_expiry"]
        existing.updated_at = datetime.utcnow()
        yt_creds = existing
    else:
        yt_creds = YouTubeCredentials(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_expiry=tokens["token_expiry"],
        )
    session.add(yt_creds)
    session.commit()
    session.refresh(yt_creds)

    try:
        youtube, _ = get_youtube_services(yt_creds, session)
        channel_info = fetch_channel_info(youtube)
        yt_creds.channel_id = channel_info.get("channel_id", "")
        yt_creds.channel_name = channel_info.get("channel_name", "")
        yt_creds.channel_thumbnail = channel_info.get("channel_thumbnail", "")
        session.add(yt_creds)
        session.commit()
    except Exception:
        pass

    return RedirectResponse(url="/?youtube_connected=true")


@router.delete("/disconnect")
async def disconnect_youtube(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user),
):
    creds = get_stored_credentials(session)
    if creds:
        session.delete(creds)
        session.commit()
    return {"message": "Canal de YouTube desconectado"}
