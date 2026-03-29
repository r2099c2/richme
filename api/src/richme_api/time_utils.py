"""Calendar day bounds for public theme aggregation (documented in 03-api §3.5)."""

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

# 按自然日、上海时区日界 [day_start, day_end)
SHANGHAI_TZ = ZoneInfo("Asia/Shanghai")


def calendar_day_bounds(d: date) -> tuple[datetime, datetime]:
    day_start = datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=SHANGHAI_TZ)
    day_end = day_start + timedelta(days=1)
    return day_start, day_end
