"""
ParkSMART - Realtime Module Package (M2 Ownership)
"""

from app.modules.realtime.hub import (
    BUFFER_SIZE,
    LISTEN_CHANNEL,
    Hub,
    HubEvent,
    Subscription,
    channel_allowed,
    get_hub,
)
from app.modules.realtime.router import (
    HEARTBEAT_S,
    QUEUE_MAX,
    extract_bearer_token,
    format_sse,
    router,
    stream_generator,
)
from app.modules.realtime.service import (
    AccountPending,
    CurrentUser,
    RealtimeError,
    TokenExpired,
    TokenInvalid,
    Unauthorized,
    authenticate_stream,
    channels_for_user,
    decode_access_token,
    make_event,
    notify_event,
    publish_events,
)

__all__ = [
    "BUFFER_SIZE",
    "HEARTBEAT_S",
    "LISTEN_CHANNEL",
    "QUEUE_MAX",
    "AccountPending",
    "CurrentUser",
    "Hub",
    "HubEvent",
    "RealtimeError",
    "Subscription",
    "TokenExpired",
    "TokenInvalid",
    "Unauthorized",
    "authenticate_stream",
    "channel_allowed",
    "channels_for_user",
    "decode_access_token",
    "extract_bearer_token",
    "format_sse",
    "get_hub",
    "make_event",
    "notify_event",
    "publish_events",
    "router",
    "stream_generator",
]
