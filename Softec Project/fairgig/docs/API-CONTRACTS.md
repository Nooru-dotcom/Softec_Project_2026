# FairGig API Contracts

## Auth Service (8001)

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/magic-link`
- `GET /auth/me`

## Earnings Service (8002)

- `POST /shifts`
- `GET /shifts/me`
- `POST /shifts/import-csv`
- `GET /shifts/export-csv`
- `GET /shifts/csv-template`
- `POST /screenshots/upload`
- `GET /screenshots/me`
- `GET /verifier/pending`
- `POST /verifier/review`

## Anomaly Service (8003)

- `POST /detect-anomalies`

## Analytics Service (8004)

- `GET /analytics/worker/{worker_id}`
- `GET /analytics/advocate/kpis`
- `GET /analytics/vulnerability-flags`

## Certificate Service (8005)

- `GET /certificate/{worker_id}`

## Grievance Service (8006)

- `GET /health`
- `POST /grievances`
- `GET /grievances`
- `PATCH /grievances/:id/moderate`
- `PATCH /grievances/:id/tag`
- `GET /grievances/clustered`

## Auth Convention

All protected endpoints use:

- Header: `Authorization: Bearer <token>`

JWT includes:

- `sub`: user id
- `role`: worker | verifier | advocate
- `email`
