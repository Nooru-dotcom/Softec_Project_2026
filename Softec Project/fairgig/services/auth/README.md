# FairGig Auth Service

FastAPI authentication service with JWT, role-based access, and demo magic-link flow.

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Environment Variables

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_ALGORITHM`
- `JWT_EXP_MINUTES`
- `PORT`

Copy `.env.example` to `.env`.

## API

Swagger UI: http://localhost:8001/docs

Key endpoints:

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/magic-link`
- `GET /auth/me`
- `GET /health`
