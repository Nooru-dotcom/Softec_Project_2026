from statistics import mean
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


class EarningRecord(BaseModel):
    date: str
    platform: str
    gross: float
    deductions: float
    net: float
    hours: float


class AnomalyRequest(BaseModel):
    worker_id: str
    history: list[EarningRecord]


app = FastAPI(title="FairGig Anomaly Service", version="1.0.0")

frontend_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001")
allowed_origins = [origin.strip() for origin in frontend_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def pct_change(current: float, baseline: float) -> float:
    if baseline <= 0:
        return 0.0
    return ((current - baseline) / baseline) * 100


@app.post("/detect-anomalies")
def detect_anomalies(payload: AnomalyRequest) -> dict:
    if not payload.history:
        return {"worker_id": payload.worker_id, "flags": [], "summary": "No history provided."}

    gross_values = [item.gross for item in payload.history]
    deduction_values = [item.deductions for item in payload.history]
    hourly_rates = [item.net / item.hours for item in payload.history if item.hours > 0]

    gross_avg = mean(gross_values)
    deduction_avg = mean(deduction_values)
    hourly_avg = mean(hourly_rates) if hourly_rates else 0

    latest = payload.history[-1]
    latest_hourly = (latest.net / latest.hours) if latest.hours > 0 else 0

    flags = []

    deduction_jump = pct_change(latest.deductions, deduction_avg)
    if deduction_jump > 20:
        flags.append(
            {
                "type": "deduction_spike",
                "severity": "high" if deduction_jump > 35 else "medium",
                "explanation": (
                    f"Your deductions on {latest.platform} are {deduction_jump:.1f}% higher than your recent average. "
                    "This may indicate hidden fees, penalty charges, or surge-pricing side effects."
                ),
            }
        )

    gross_drop = pct_change(latest.gross, gross_avg)
    if gross_drop < -20:
        flags.append(
            {
                "type": "gross_drop",
                "severity": "high" if gross_drop < -35 else "medium",
                "explanation": (
                    f"Your gross earnings dropped by {abs(gross_drop):.1f}% versus your baseline. "
                    "Consider checking order volume, ride acceptance trends, or app-side downtime."
                ),
            }
        )

    hourly_drop = pct_change(latest_hourly, hourly_avg)
    if hourly_drop < -18:
        flags.append(
            {
                "type": "hourly_efficiency_drop",
                "severity": "medium",
                "explanation": (
                    f"Your effective hourly rate is down by {abs(hourly_drop):.1f}% compared with your normal pattern. "
                    "You may be operating in a lower-demand zone or facing unfair dispatch behavior."
                ),
            }
        )

    if not flags:
        summary = "No major anomalies detected. Your latest shift aligns with your normal trend range."
    else:
        summary = "Potential earnings anomalies detected. Please review each flag for likely causes and next actions."

    return {
        "worker_id": payload.worker_id,
        "baseline": {
            "average_gross": round(gross_avg, 2),
            "average_deductions": round(deduction_avg, 2),
            "average_hourly_rate": round(hourly_avg, 2),
        },
        "latest": {
            "platform": latest.platform,
            "gross": latest.gross,
            "deductions": latest.deductions,
            "hourly_rate": round(latest_hourly, 2),
        },
        "flags": flags,
        "summary": summary,
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "anomaly"}
