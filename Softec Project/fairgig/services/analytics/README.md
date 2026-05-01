# FairGig Analytics Service

FastAPI service for worker insights and advocate aggregate KPIs.

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8004
```

## Environment Variables

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_ALGORITHM`
- `PORT`

## API

Swagger UI: http://localhost:8004/docs

Endpoints:

- `GET /analytics/worker/{worker_id}`
- `GET /analytics/advocate/kpis`
- `GET /analytics/vulnerability-flags`
- `GET /health`
