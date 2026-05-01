import csv
import os
from datetime import datetime
from io import StringIO
from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import desc, text
from sqlalchemy.orm import Session

from .auth import get_current_user, require_role
from .db import get_db
from .models import Screenshot, Shift
from .schemas import BulkReviewRequest, ReviewRequest, ShiftCreate, ShiftOut

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="FairGig Earnings Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/shifts", response_model=ShiftOut)
def create_shift(payload: ShiftCreate, db: Session = Depends(get_db), user: dict = Depends(require_role({"worker"}))):
    shift = Shift(
        user_id=user["id"],
        platform=payload.platform,
        shift_date=payload.shift_date,
        hours=payload.hours,
        gross=payload.gross,
        deductions=payload.deductions,
        net=payload.net,
        city_zone=payload.city_zone,
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)

    return ShiftOut(
        id=str(shift.id),
        platform=shift.platform,
        shift_date=shift.shift_date,
        hours=float(shift.hours),
        gross=float(shift.gross),
        deductions=float(shift.deductions),
        net=float(shift.net),
        city_zone=shift.city_zone,
    )


@app.get("/shifts/me", response_model=list[ShiftOut])
def my_shifts(db: Session = Depends(get_db), user: dict = Depends(require_role({"worker"}))):
    rows = (
        db.query(Shift)
        .filter(Shift.user_id == user["id"])
        .order_by(desc(Shift.shift_date))
        .limit(100)
        .all()
    )
    return [
        ShiftOut(
            id=str(row.id),
            platform=row.platform,
            shift_date=row.shift_date,
            hours=float(row.hours),
            gross=float(row.gross),
            deductions=float(row.deductions),
            net=float(row.net),
            city_zone=row.city_zone,
        )
        for row in rows
    ]


@app.post("/shifts/import-csv")
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: dict = Depends(require_role({"worker"})),
):
    content = (await file.read()).decode("utf-8")
    reader = csv.DictReader(content.splitlines())
    inserted = 0

    for row in reader:
        shift = Shift(
            user_id=user["id"],
            platform=row["platform"],
            shift_date=datetime.strptime(row["shift_date"], "%Y-%m-%d").date(),
            hours=float(row["hours"]),
            gross=float(row["gross"]),
            deductions=float(row["deductions"]),
            net=float(row["net"]),
            city_zone=row.get("city_zone", "Unknown"),
        )
        db.add(shift)
        inserted += 1

    db.commit()
    return {"inserted": inserted}


@app.get("/shifts/export-csv")
def export_csv(db: Session = Depends(get_db), user: dict = Depends(require_role({"worker"}))):
    rows = (
        db.query(Shift)
        .filter(Shift.user_id == user["id"])
        .order_by(desc(Shift.shift_date), desc(Shift.created_at))
        .all()
    )

    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["platform", "shift_date", "hours", "gross", "deductions", "net", "city_zone"])

    for row in rows:
        writer.writerow(
            [
                row.platform,
                row.shift_date.isoformat(),
                float(row.hours),
                float(row.gross),
                float(row.deductions),
                float(row.net),
                row.city_zone,
            ]
        )

    filename = f"worker-shifts-{len(rows)}-logs.csv"
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/shifts/csv-template")
def csv_template(db: Session = Depends(get_db), user: dict = Depends(require_role({"worker"}))):
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["platform", "shift_date", "hours", "gross", "deductions", "net", "city_zone"])
    writer.writerow(["Careem", "2026-04-18", "12", "1200", "200", "1000", "Gulberg"])

    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="shift-import-template.csv"'},
    )


@app.post("/screenshots/upload")
async def upload_screenshot(
    screenshot: UploadFile = File(...),
    shift_id: str | None = Form(default=None),
    db: Session = Depends(get_db),
    user: dict = Depends(require_role({"worker"})),
):
    ext = Path(screenshot.filename or "shot.png").suffix.lower() or ".png"
    filename = f"{uuid4()}{ext}"
    target = UPLOAD_DIR / filename
    target.write_bytes(await screenshot.read())

    item = Screenshot(
        user_id=user["id"],
        shift_id=shift_id,
        file_path=str(target).replace("\\", "/"),
        verification_status="pending",
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return {"id": str(item.id), "status": item.verification_status, "file_path": item.file_path}


@app.get("/screenshots/me")
def my_screenshots(db: Session = Depends(get_db), user: dict = Depends(require_role({"worker"}))):
    rows = (
        db.query(Screenshot)
        .filter(Screenshot.user_id == user["id"])
        .order_by(desc(Screenshot.created_at))
        .limit(50)
        .all()
    )

    return [
        {
            "id": str(row.id),
            "shift_id": str(row.shift_id) if row.shift_id else None,
            "file_path": row.file_path,
            "status": row.verification_status,
            "verifier_comment": row.verifier_comment,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@app.get("/verifier/pending")
def pending_screenshots(db: Session = Depends(get_db), user: dict = Depends(require_role({"verifier"}))):
    rows = (
        db.query(Screenshot)
        .filter(Screenshot.verification_status == "pending")
        .order_by(desc(Screenshot.created_at))
        .limit(200)
        .all()
    )
    return [
        {
            "id": str(row.id),
            "user_id": str(row.user_id),
            "shift_id": str(row.shift_id) if row.shift_id else None,
            "file_path": row.file_path,
            "status": row.verification_status,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@app.post("/verifier/review")
def review_screenshot(payload: ReviewRequest, db: Session = Depends(get_db), user: dict = Depends(require_role({"verifier"}))):
    if payload.status not in {"approved", "disputed", "unverifiable"}:
        raise HTTPException(status_code=400, detail="Invalid review status")

    row = db.query(Screenshot).filter(Screenshot.id == payload.screenshot_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Screenshot not found")

    row.verification_status = payload.status
    row.verifier_comment = payload.comment
    row.reviewed_by = user["id"]
    row.reviewed_at = datetime.utcnow()

    if payload.status == "approved":
        db.execute(
            text("UPDATE users SET is_identity_verified = true WHERE id = :uid"),
            {"uid": str(row.user_id)},
        )

    db.commit()

    return {"id": str(row.id), "status": row.verification_status}


@app.post("/verifier/review/bulk")
def bulk_review(payload: BulkReviewRequest, db: Session = Depends(get_db), user: dict = Depends(require_role({"verifier"}))):
    if payload.status not in {"approved", "disputed", "unverifiable"}:
        raise HTTPException(status_code=400, detail="Invalid review status")

    updated = 0
    approved_user_ids: set[str] = set()
    for item_id in payload.screenshot_ids:
        row = db.query(Screenshot).filter(Screenshot.id == item_id).first()
        if not row:
            continue
        row.verification_status = payload.status
        row.verifier_comment = payload.comment
        row.reviewed_by = user["id"]
        row.reviewed_at = datetime.utcnow()
        if payload.status == "approved":
            approved_user_ids.add(str(row.user_id))
        updated += 1

    for uid in approved_user_ids:
        db.execute(
            text("UPDATE users SET is_identity_verified = true WHERE id = :uid"),
            {"uid": uid},
        )

    db.commit()
    return {"updated": updated}


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "earnings"}
