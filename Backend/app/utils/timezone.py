from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

# Indian Standard Time (IST: UTC+05:30, Asia/Kolkata)
IST = ZoneInfo('Asia/Kolkata')
IST_OFFSET = timedelta(hours=5, minutes=30)

def get_ist_now():
    """
    Returns current datetime in Indian Standard Time (IST) as naive datetime
    for clean, uniform SQLite storage and exact calendar comparison.
    Example: 2026-10-21 10:18:00
    """
    return datetime.now(IST).replace(tzinfo=None)

def get_ist_now_aware():
    """Returns timezone-aware datetime in IST."""
    return datetime.now(IST)

def get_ist_today():
    """Returns today's date in Indian Standard Time."""
    return datetime.now(IST).date()

def to_ist(dt):
    """
    Converts a datetime to IST naive datetime.
    If timezone-aware, converts to Asia/Kolkata and strips tzinfo.
    If naive, assumes it is already local IST datetime.
    """
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(IST).replace(tzinfo=None)
    return dt

