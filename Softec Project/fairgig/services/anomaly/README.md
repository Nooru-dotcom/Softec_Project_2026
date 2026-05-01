# FairGig Anomaly Service

FastAPI service for earnings anomaly detection with plain-language worker explanations.

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003
```

## API

Swagger UI: http://localhost:8003/docs

Required endpoint:

- `POST /detect-anomalies`

Health:

- `GET /health`
