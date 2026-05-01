# FairGig Earnings Service

FastAPI service for shift logging, CSV import, screenshot upload, and verifier review workflows.

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

## Environment Variables

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_ALGORITHM`
- `UPLOAD_DIR`
- `PORT`

## API

Swagger UI: http://localhost:8002/docs

Endpoints:

- `POST /shifts`
- `GET /shifts/me`
- `POST /shifts/import-csv`
- `POST /screenshots/upload`
- `GET /verifier/pending`
- `POST /verifier/review`
- `POST /verifier/review/bulk`
- `GET /health`
