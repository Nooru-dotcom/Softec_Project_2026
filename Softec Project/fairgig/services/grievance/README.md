# FairGig Grievance Service

Node.js + Express service for community grievance management with realtime Socket.IO updates.

## Run

```bash
npm install
npm run dev
```

## Environment Variables

- `DATABASE_URL`
- `PORT`
- `CORS_ORIGIN`

## API

Base URL: http://localhost:8006

- `GET /health`
- `POST /grievances`
- `GET /grievances`
- `PATCH /grievances/:id/moderate`
- `PATCH /grievances/:id/tag`
- `GET /grievances/clustered`

## Socket Events

- `grievance:new`
- `grievance:updated`
