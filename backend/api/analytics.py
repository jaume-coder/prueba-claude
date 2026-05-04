from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

from core.database import get_session
from core.auth import get_current_user
from core.models import User
from services.youtube import (
    get_stored_credentials, get_youtube_services,
    fetch_channel_info, fetch_analytics_overview,
    fetch_top_videos_analytics, fetch_video_details,
    parse_duration_seconds, get_cached_data, set_cached_data
)

router = APIRouter()


def default_date_range():
    end = datetime.utcnow().date()
    start = end - timedelta(days=28)
    return str(start), str(end)


def require_youtube(session: Session):
    creds = get_stored_credentials(session)
    if not creds:
        raise HTTPException(
            status_code=400,
            detail="Canal de YouTube no conectado. Ve a Configuración para conectar tu canal.",
        )
    return creds


class ChannelOverview(BaseModel):
    channel_id: str
    channel_name: str
    channel_thumbnail: str
    subscriber_count: int
    view_count: int
    video_count: int


class DayMetrics(BaseModel):
    date: str
    views: int
    minutes_watched: int
    avg_view_duration: float
    subscribers_gained: int
    subscribers_lost: int
    likes: int
    comments: int
    shares: int
    impressions: int
    ctr: float


class VideoMetrics(BaseModel):
    video_id: str
    title: str
    thumbnail: str
    published_at: str
    duration_seconds: int
    views: int
    minutes_watched: int
    avg_view_duration: float
    ctr: float
    likes: int
    comments: int


class AnalyticsOverviewResponse(BaseModel):
    channel: ChannelOverview
    timeseries: List[DayMetrics]
    totals: dict


class TopVideosResponse(BaseModel):
    videos: List[VideoMetrics]
    period: str


@router.get("/channel", response_model=ChannelOverview)
async def get_channel_overview(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    creds = require_youtube(session)
    cache_key = f"channel_info_{creds.channel_id}"
    cached = get_cached_data(session, cache_key)
    if cached:
        return ChannelOverview(**cached)

    youtube, _ = get_youtube_services(creds, session)
    info = fetch_channel_info(youtube)
    set_cached_data(session, cache_key, info)
    return ChannelOverview(**info)


@router.get("/overview")
async def get_analytics_overview(
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    creds = require_youtube(session)

    if not start_date or not end_date:
        start_date, end_date = default_date_range()

    cache_key = f"overview_{creds.channel_id}_{start_date}_{end_date}"
    cached = get_cached_data(session, cache_key)
    if cached:
        return cached

    youtube, youtube_analytics = get_youtube_services(creds, session)
    channel_info = fetch_channel_info(youtube)

    try:
        analytics = fetch_analytics_overview(youtube_analytics, creds.channel_id, start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener analytics: {str(e)}")

    col_headers = [h["name"] for h in analytics.get("columnHeaders", [])]
    rows = analytics.get("rows", [])

    timeseries = []
    totals = {
        "total_views": 0,
        "total_minutes_watched": 0,
        "total_subscribers_gained": 0,
        "total_subscribers_lost": 0,
        "total_likes": 0,
        "total_comments": 0,
        "total_shares": 0,
        "total_impressions": 0,
        "avg_ctr": 0.0,
    }

    ctr_values = []
    for row in rows:
        data = dict(zip(col_headers, row))
        ctr_val = float(data.get("impressionClickThroughRate", 0))
        ctr_values.append(ctr_val)

        day = DayMetrics(
            date=data.get("day", ""),
            views=int(data.get("views", 0)),
            minutes_watched=int(data.get("estimatedMinutesWatched", 0)),
            avg_view_duration=float(data.get("averageViewDuration", 0)),
            subscribers_gained=int(data.get("subscribersGained", 0)),
            subscribers_lost=int(data.get("subscribersLost", 0)),
            likes=int(data.get("likes", 0)),
            comments=int(data.get("comments", 0)),
            shares=int(data.get("shares", 0)),
            impressions=int(data.get("impressions", 0)),
            ctr=round(ctr_val * 100, 2),
        )
        timeseries.append(day.model_dump())

        totals["total_views"] += day.views
        totals["total_minutes_watched"] += day.minutes_watched
        totals["total_subscribers_gained"] += day.subscribers_gained
        totals["total_subscribers_lost"] += day.subscribers_lost
        totals["total_likes"] += day.likes
        totals["total_comments"] += day.comments
        totals["total_shares"] += day.shares
        totals["total_impressions"] += day.impressions

    if ctr_values:
        totals["avg_ctr"] = round(sum(ctr_values) / len(ctr_values) * 100, 2)

    totals["net_subscribers"] = totals["total_subscribers_gained"] - totals["total_subscribers_lost"]
    totals["total_hours_watched"] = round(totals["total_minutes_watched"] / 60, 1)

    result = {
        "channel": channel_info,
        "timeseries": timeseries,
        "totals": totals,
        "period": {"start": start_date, "end": end_date},
    }
    set_cached_data(session, cache_key, result)
    return result


@router.get("/top-videos")
async def get_top_videos(
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=5, le=50),
    sort_by: str = Query(default="views"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    creds = require_youtube(session)

    if not start_date or not end_date:
        start_date, end_date = default_date_range()

    cache_key = f"top_videos_{creds.channel_id}_{start_date}_{end_date}_{limit}"
    cached = get_cached_data(session, cache_key)
    if cached:
        return cached

    _, youtube_analytics = get_youtube_services(creds, session)
    youtube, _ = get_youtube_services(creds, session)

    try:
        analytics = fetch_top_videos_analytics(youtube_analytics, creds.channel_id, start_date, end_date, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener top videos: {str(e)}")

    col_headers = [h["name"] for h in analytics.get("columnHeaders", [])]
    rows = analytics.get("rows", [])

    if not rows:
        return {"videos": [], "period": {"start": start_date, "end": end_date}}

    video_ids = [row[0] for row in rows]
    video_details = fetch_video_details(youtube, video_ids)

    videos = []
    for row in rows:
        data = dict(zip(col_headers, row))
        vid_id = data.get("video", "")
        details = video_details.get(vid_id, {})

        ctr_raw = float(data.get("impressionClickThroughRate", 0))
        video = VideoMetrics(
            video_id=vid_id,
            title=details.get("title", f"Video {vid_id}"),
            thumbnail=details.get("thumbnail", ""),
            published_at=details.get("published_at", ""),
            duration_seconds=parse_duration_seconds(details.get("duration", "PT0S")),
            views=int(data.get("views", 0)),
            minutes_watched=int(data.get("estimatedMinutesWatched", 0)),
            avg_view_duration=float(data.get("averageViewDuration", 0)),
            ctr=round(ctr_raw * 100, 2),
            likes=details.get("like_count", int(data.get("likes", 0))),
            comments=details.get("comment_count", int(data.get("comments", 0))),
        )
        videos.append(video.model_dump())

    sort_key_map = {
        "views": "views",
        "ctr": "ctr",
        "watch_time": "minutes_watched",
        "avg_duration": "avg_view_duration",
        "likes": "likes",
    }
    sort_field = sort_key_map.get(sort_by, "views")
    videos.sort(key=lambda v: v.get(sort_field, 0), reverse=True)

    result = {
        "videos": videos,
        "period": {"start": start_date, "end": end_date},
    }
    set_cached_data(session, cache_key, result)
    return result
