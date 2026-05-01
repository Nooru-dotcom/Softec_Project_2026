from datetime import date
from pydantic import BaseModel


class ShiftCreate(BaseModel):
    platform: str
    shift_date: date
    hours: float
    gross: float
    deductions: float
    net: float
    city_zone: str


class ShiftOut(BaseModel):
    id: str
    platform: str
    shift_date: date
    hours: float
    gross: float
    deductions: float
    net: float
    city_zone: str


class ReviewRequest(BaseModel):
    screenshot_id: str
    status: str
    comment: str | None = None


class BulkReviewRequest(BaseModel):
    screenshot_ids: list[str]
    status: str
    comment: str | None = None
