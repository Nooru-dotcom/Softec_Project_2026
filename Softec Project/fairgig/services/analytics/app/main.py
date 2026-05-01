import os
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://fairgig:fairgig@localhost:5432/fairgig")
JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
security = HTTPBearer()
app = FastAPI(title="FairGig Analytics Service", version="1.0.0")

frontend_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001")
allowed_origins = [origin.strip() for origin in frontend_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"id": payload.get("sub"), "role": payload.get("role")}
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


def require_role(roles: set[str]):
    def check(user: dict = Depends(get_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Role not allowed")
        return user

    return check


@app.get("/analytics/worker/{worker_id}")
def worker_dashboard(worker_id: str, user: dict = Depends(require_role({"worker", "advocate", "verifier"}))):
    worker_id = worker_id.strip()
    with engine.begin() as conn:
        worker = conn.execute(
            text("SELECT id, city FROM users WHERE id = :wid AND role = 'worker'"), {"wid": worker_id}
        ).mappings().first()
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found")

        trend_rows = conn.execute(
            text(
                """
                SELECT shift_date::text AS date,
                       ROUND(SUM(net)::numeric, 2) AS daily_net,
                       ROUND(SUM(gross)::numeric, 2) AS daily_gross,
                       ROUND(SUM(deductions)::numeric, 2) AS daily_deductions,
                       ROUND((SUM(net) / NULLIF(SUM(hours), 0))::numeric, 2) AS hourly_rate
                FROM shifts
                WHERE user_id = :wid
                GROUP BY shift_date
                ORDER BY shift_date DESC
                LIMIT 30
                """
            ),
            {"wid": worker_id},
        ).mappings().all()

        city_median = conn.execute(
            text(
                """
                WITH worker_month AS (
                  SELECT s.user_id, SUM(s.net) AS monthly_net
                  FROM shifts s
                  JOIN users u ON u.id = s.user_id
                  WHERE u.city = :city
                    AND s.shift_date >= CURRENT_DATE - INTERVAL '30 days'
                  GROUP BY s.user_id
                )
                SELECT COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY monthly_net), 0) AS median_net
                FROM worker_month
                """
            ),
            {"city": worker["city"]},
        ).scalar_one()

        worker_month_net = conn.execute(
            text(
                """
                SELECT COALESCE(SUM(net), 0)
                FROM shifts
                WHERE user_id = :wid
                  AND shift_date >= CURRENT_DATE - INTERVAL '30 days'
                """
            ),
            {"wid": worker_id},
        ).scalar_one()

        commission_rows = conn.execute(
            text(
                """
                SELECT platform,
                       ROUND(AVG((deductions / NULLIF(gross, 0)) * 100)::numeric, 2) AS avg_commission_pct
                FROM shifts
                WHERE user_id = :wid
                GROUP BY platform
                ORDER BY avg_commission_pct DESC
                """
            ),
            {"wid": worker_id},
        ).mappings().all()

    return {
        "worker_id": worker_id,
        "city": worker["city"],
        "earnings_trend": list(reversed([dict(r) for r in trend_rows])),
        "city_wide_30d_median": float(city_median),
        "worker_30d_net": float(worker_month_net),
        "commission_tracker": [dict(r) for r in commission_rows],
    }


@app.get("/analytics/advocate/kpis")
def advocate_kpis(user: dict = Depends(require_role({"advocate"}))):
    with engine.begin() as conn:
        kpis = conn.execute(
            text(
                """
                SELECT
                  ROUND(AVG((deductions / NULLIF(gross, 0)) * 100)::numeric, 2) AS avg_commission_pct,
                  ROUND(STDDEV_POP(net)::numeric, 2) AS income_volatility,
                  ROUND(AVG(net)::numeric, 2) AS avg_net,
                  COUNT(*) AS total_shifts
                FROM shifts
                WHERE shift_date >= CURRENT_DATE - INTERVAL '30 days'
                """
            )
        ).mappings().first()

        top_complaints = conn.execute(
            text(
                """
                SELECT COALESCE(cluster_key, 'other') AS cluster_key, COUNT(*) AS count
                FROM grievances
                GROUP BY cluster_key
                ORDER BY count DESC
                LIMIT 5
                """
            )
        ).mappings().all()

    return {
        "avg_commission_pct": float(kpis["avg_commission_pct"] or 0),
        "income_volatility": float(kpis["income_volatility"] or 0),
        "avg_net": float(kpis["avg_net"] or 0),
        "total_shifts": int(kpis["total_shifts"] or 0),
        "top_complaints": [dict(r) for r in top_complaints],
    }


@app.get("/analytics/vulnerability-flags")
def vulnerability_flags(user: dict = Depends(require_role({"advocate", "verifier"}))):
    query = text(
        """
        WITH monthly AS (
          SELECT user_id,
                 date_trunc('month', shift_date) AS month,
                 SUM(net) AS total_net
          FROM shifts
          WHERE shift_date >= CURRENT_DATE - INTERVAL '90 days'
          GROUP BY user_id, date_trunc('month', shift_date)
        ),
        ranked AS (
          SELECT user_id,
                 month,
                 total_net,
                 LAG(total_net) OVER (PARTITION BY user_id ORDER BY month) AS prev_total
          FROM monthly
        )
        SELECT r.user_id,
               ROUND(r.prev_total::numeric, 2) AS previous_month,
               ROUND(r.total_net::numeric, 2) AS current_month,
               ROUND(((r.total_net - r.prev_total) / NULLIF(r.prev_total, 0) * 100)::numeric, 2) AS change_pct,
               u.city,
               u.full_name
        FROM ranked r
        JOIN users u ON u.id = r.user_id
        WHERE r.prev_total IS NOT NULL
          AND ((r.total_net - r.prev_total) / NULLIF(r.prev_total, 0) * 100) <= -20
        ORDER BY change_pct ASC
        LIMIT 100
        """
    )

    with engine.begin() as conn:
        rows = conn.execute(query).mappings().all()

    return {
        "count": len(rows),
        "flags": [
            {
                "worker_id": r["user_id"],
                "full_name": r["full_name"],
                "city": r["city"],
                "change_pct": float(r["change_pct"]),
                "previous_month": float(r["previous_month"]),
                "current_month": float(r["current_month"]),
            }
            for r in rows
        ],
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "analytics"}
