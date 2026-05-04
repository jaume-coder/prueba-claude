import json
from datetime import datetime, timedelta
from typing import Optional
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from sqlmodel import Session, select

from core.config import get_settings
from core.models import YouTubeCredentials, AnalyticsCache

SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/yt-analytics-monetary.readonly",
]

CACHE_TTL_MINUTES = 60


def get_oauth_flow() -> Flow:
    settings = get_settings()
    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uris": [settings.google_redirect_uri],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    flow = Flow.from_client_config(client_config, scopes=SCOPES)
    flow.redirect_uri = settings.google_redirect_uri
    return flow


def get_auth_url() -> str:
    flow = get_oauth_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return auth_url


def exchange_code_for_tokens(code: str) -> dict:
    flow = get_oauth_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials
    return {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_expiry": creds.expiry.isoformat() if creds.expiry else None,
    }


def get_credentials(yt_creds: YouTubeCredentials) -> Credentials:
    settings = get_settings()
    creds = Credentials(
        token=yt_creds.access_token,
        refresh_token=yt_creds.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
    )
    return creds


def refresh_credentials_if_needed(creds: Credentials, yt_creds: YouTubeCredentials, session: Session) -> Credentials:
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        yt_creds.access_token = creds.token
        yt_creds.token_expiry = creds.expiry.isoformat() if creds.expiry else None
        yt_creds.updated_at = datetime.utcnow()
        session.add(yt_creds)
        session.commit()
    return creds


def get_youtube_services(yt_creds: YouTubeCredentials, session: Session):
    creds = get_credentials(yt_creds)
    creds = refresh_credentials_if_needed(creds, yt_creds, session)
    youtube = build("youtube", "v3", credentials=creds)
    youtube_analytics = build("youtubeAnalytics", "v2", credentials=creds)
    return youtube, youtube_analytics


def get_stored_credentials(session: Session) -> Optional[YouTubeCredentials]:
    return session.exec(select(YouTubeCredentials)).first()


def get_cached_data(session: Session, cache_key: str) -> Optional[dict]:
    from core.models import AnalyticsCache
    cached = session.exec(select(AnalyticsCache).where(AnalyticsCache.cache_key == cache_key)).first()
    if not cached:
        return None
    age = datetime.utcnow() - cached.cached_at
    if age > timedelta(minutes=CACHE_TTL_MINUTES):
        return None
    return json.loads(cached.data)


def set_cached_data(session: Session, cache_key: str, data: dict):
    from core.models import AnalyticsCache
    existing = session.exec(select(AnalyticsCache).where(AnalyticsCache.cache_key == cache_key)).first()
    if existing:
        existing.data = json.dumps(data)
        existing.cached_at = datetime.utcnow()
        session.add(existing)
    else:
        cache_entry = AnalyticsCache(cache_key=cache_key, data=json.dumps(data))
        session.add(cache_entry)
    session.commit()


def fetch_channel_info(youtube) -> dict:
    response = youtube.channels().list(
        part="snippet,statistics,contentDetails",
        mine=True,
    ).execute()
    if not response.get("items"):
        return {}
    channel = response["items"][0]
    stats = channel.get("statistics", {})
    snippet = channel.get("snippet", {})
    thumbnails = snippet.get("thumbnails", {})
    thumbnail_url = (
        thumbnails.get("high", {}).get("url")
        or thumbnails.get("medium", {}).get("url")
        or thumbnails.get("default", {}).get("url", "")
    )
    return {
        "channel_id": channel["id"],
        "channel_name": snippet.get("title", ""),
        "channel_description": snippet.get("description", ""),
        "channel_thumbnail": thumbnail_url,
        "subscriber_count": int(stats.get("subscriberCount", 0)),
        "view_count": int(stats.get("viewCount", 0)),
        "video_count": int(stats.get("videoCount", 0)),
    }


def fetch_analytics_overview(youtube_analytics, channel_id: str, start_date: str, end_date: str) -> dict:
    response = youtube_analytics.reports().query(
        ids=f"channel=={channel_id}",
        startDate=start_date,
        endDate=end_date,
        metrics="views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost,likes,comments,shares,impressions,impressionClickThroughRate",
        dimensions="day",
        sort="day",
    ).execute()
    return response


def fetch_top_videos_analytics(youtube_analytics, channel_id: str, start_date: str, end_date: str, max_results: int = 20) -> dict:
    response = youtube_analytics.reports().query(
        ids=f"channel=={channel_id}",
        startDate=start_date,
        endDate=end_date,
        metrics="views,estimatedMinutesWatched,averageViewDuration,impressionClickThroughRate,likes,comments",
        dimensions="video",
        sort="-views",
        maxResults=max_results,
    ).execute()
    return response


def fetch_video_details(youtube, video_ids: list) -> dict:
    if not video_ids:
        return {}
    ids_str = ",".join(video_ids)
    response = youtube.videos().list(
        part="snippet,statistics,contentDetails",
        id=ids_str,
    ).execute()
    videos = {}
    for item in response.get("items", []):
        vid_id = item["id"]
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})
        duration = item.get("contentDetails", {}).get("duration", "PT0S")
        thumbnails = snippet.get("thumbnails", {})
        thumbnail = (
            thumbnails.get("maxres", {}).get("url")
            or thumbnails.get("high", {}).get("url")
            or thumbnails.get("medium", {}).get("url", "")
        )
        videos[vid_id] = {
            "title": snippet.get("title", ""),
            "published_at": snippet.get("publishedAt", ""),
            "thumbnail": thumbnail,
            "duration": duration,
            "like_count": int(stats.get("likeCount", 0)),
            "comment_count": int(stats.get("commentCount", 0)),
            "view_count": int(stats.get("viewCount", 0)),
        }
    return videos


def parse_duration_seconds(iso_duration: str) -> int:
    import re
    pattern = r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"
    match = re.match(pattern, iso_duration)
    if not match:
        return 0
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds
