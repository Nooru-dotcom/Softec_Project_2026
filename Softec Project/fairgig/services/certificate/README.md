# FairGig Certificate Service

FastAPI service that renders printable HTML income certificates in A4 layout.

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8005
```

## Environment Variables

- `DATABASE_URL`
- `PORT`

## API

Swagger UI: http://localhost:8005/docs

Endpoints:

- `GET /certificate/{worker_id}`
- `GET /health`
