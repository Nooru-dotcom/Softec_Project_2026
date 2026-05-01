<div align="center">

# ⚡ FairGig

### *Empowering Pakistan's Gig Economy — One Shift at a Time*

> A microservice-based platform for gig workers in Pakistan to **track earnings**, **verify proof screenshots**, **analyze trends**, **report grievances**, and **generate verified income certificates**.

</div>

---

## 🏆 Competition

| Field | Details |
|---|---|
| **Event** | SOFTEC — Web Development Track |
| **Team Name** | ITU AAA |
| **Institution** | Information Technology University, Lahore |

---

## 👥 Contributors

| Name | Role |
|---|---|
| [**Hassan Ali Shah**](https://github.com/Hassan-Ali-17) | Team Member |
| [**Ahsen Ali**](https://github.com/ahsen24056ali) | Team Member |
| [**Noor ul Hassan**](https://github.com/Nooru-dotcom) | Team Member |

---

## 📁 Monorepo Structure

```text
fairgig/
├── frontend/               # Next.js 15 App Router UI
├── services/
│   ├── auth/               # JWT auth, signup/login, magic links
│   ├── earnings/           # Shift CRUD, CSV import, screenshots
│   ├── anomaly/            # Plain-language anomaly detection
│   ├── analytics/          # KPIs, medians, MoM flags
│   ├── certificate/        # Print-ready A4 income certificates
│   └── grievance/          # Realtime grievance board (Socket.IO)
├── shared/                 # Prisma schema, shared types
├── docs/                   # API contracts & Postman collection
├── seed.sql                # Database seed
├── docker-compose.yml
└── README.md
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 15 (App Router) | Framework |
| TypeScript (strict mode) | Type safety |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| Zustand | State management |
| TanStack Query | Data fetching |
| Recharts + Tremor | Data visualization |
| Sonner | Notifications |

### Backend Services
| Service | Stack |
|---|---|
| Auth, Earnings, Anomaly, Analytics, Certificate | Python · FastAPI · SQLAlchemy |
| Grievance | Node.js · Express · Socket.IO |

### Infrastructure
| Technology | Purpose |
|---|---|
| PostgreSQL | Primary database (schema-namespaced) |
| Redis | Caching / pub-sub |
| Docker | Containerized infra |
| Prisma (shared/) | TypeScript ORM for BFF patterns |

---

## 🚀 Running Locally

### Prerequisites
- Docker Desktop *(running)*
- Node.js 20+
- Python 3.11+ *(3.13 also works)*

---

### Step 1 — Start Infrastructure

```bash
docker compose up -d postgres redis
```

---

### Step 2 — Create Python Virtual Environment

```bash
# From repo root
python -m venv .venv
```

**Activate (PowerShell):**
```powershell
.\.venv\Scripts\Activate.ps1
```

---

### Step 3 — Install Dependencies

**Python services:**
```bash
pip install -r services/auth/requirements.txt
pip install -r services/earnings/requirements.txt
pip install -r services/anomaly/requirements.txt
pip install -r services/analytics/requirements.txt
pip install -r services/certificate/requirements.txt
```

**Node services:**
```bash
cd services/grievance && npm install && cd ../..
cd frontend && npm install && cd ..
```

---

### Step 4 — Seed the Database

```bash
docker compose exec -T postgres psql -U fairgig -d fairgig -f /seed.sql
```

> **Full reset (if schema is inconsistent):**
> ```bash
> docker compose exec -T postgres psql -U fairgig -d fairgig \
>   -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
> docker compose exec -T postgres psql -U fairgig -d fairgig -f /seed.sql
> ```

---

### Step 5 — Start All Services

> Run each in a **separate terminal**.

| Service | Command | Port |
|---|---|---|
| Auth | `cd services/auth && uvicorn app.main:app --reload --port 8001` | 8001 |
| Earnings | `cd services/earnings && uvicorn app.main:app --reload --port 8002` | 8002 |
| Anomaly | `cd services/anomaly && uvicorn app.main:app --reload --port 8003` | 8003 |
| Analytics | `cd services/analytics && uvicorn app.main:app --reload --port 8004` | 8004 |
| Certificate | `cd services/certificate && uvicorn app.main:app --reload --port 8005` | 8005 |
| Grievance | `cd services/grievance && npm run dev` | 8006 |
| Frontend | `cd frontend && npm run dev` | 3000 |

---

## 🌐 App URLs

| Service | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| Auth API Docs | http://localhost:8001/docs |
| Earnings API Docs | http://localhost:8002/docs |
| Anomaly API Docs | http://localhost:8003/docs |
| Analytics API Docs | http://localhost:8004/docs |
| Certificate Health | http://localhost:8005/health |
| Grievance Health | http://localhost:8006/health |

---

## 🔐 Demo Credentials

### Login Accounts

| Role | Email | Password |
|---|---|---|
| Verifier | `verifier1@fairgig.pk` | `Password123!` |
| Worker | `worker_shiftfix_3559@fairgig.pk` | `Password123!` |

### Invite Codes (Signup)

| Role | Code |
|---|---|
| Verifier | `FAST` |
| Advocate | `SOFTEC` |

---

## 🔬 Service Overview

| Service | Description |
|---|---|
| `auth` | Signup/login, magic link demo, JWT with role claims |
| `earnings` | Shift CRUD, CSV import, screenshot upload, verifier queue |
| `anomaly` | Plain-language anomaly explanations via `/detect-anomalies` |
| `analytics` | KPIs, medians, month-over-month vulnerability flags |
| `certificate` | Print-ready A4 certificate HTML generation |
| `grievance` | Realtime grievance board with moderation, tagging, clustering |

---

## 📄 API Documentation

- **Endpoint contracts:** [`docs/API-CONTRACTS.md`](docs/API-CONTRACTS.md)
- **Postman collection:** [`docs/POSTMAN_COLLECTION.json`](docs/POSTMAN_COLLECTION.json) *(importable)*

---

## 🐛 Troubleshooting

| Issue | Fix |
|---|---|
| Signup/login looks wrong after big changes | Reseed the database (Step 4 full reset) |
| Frontend UI looks stale after edits | Hard-refresh the browser (`Ctrl+Shift+R`) |
| Port already in use | Stop the old process or start on a free port and update frontend env URLs |

---

<div align="center">

Built with ❤️ by **Team ITU AAA** for **SOFTEC Web Development**

*Information Technology University, Lahore, Pakistan*

</div>
