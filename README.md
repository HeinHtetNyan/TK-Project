# TK Plastic Press POS System

A modern, offline-capable Point of Sale (POS) system designed for TK Plastic Press. Built with a FastAPI backend, a React 19 frontend (deployed on Vercel), and a native Android WebView wrapper.

## Key Features

- **Offline-First Architecture**: Create vouchers and process payments without an internet connection. Data is automatically synchronized when connectivity is restored via a custom sync engine backed by Dexie.js (IndexedDB).
- **Idempotent Sync**: All offline operations use `client_id` UUIDs to prevent duplicate records on retry.
- **FIFO Payment Settlement**: Bulk payments are automatically applied to unpaid vouchers in chronological order.
- **Comprehensive POS Functionality**:
  - Customer management with balance tracking and address records.
  - Voucher creation with line items (plastic size, color, pricing).
  - Payment processing (Cash, Bank Transfer, KBZPay) with history.
  - Real-time analytics dashboard: 30-day sales trends, debt overview, income by payment method, top customers.
- **Hybrid Deployment**:
  - **Frontend**: High-availability React application deployed on Vercel.
  - **Backend**: Containerized FastAPI application on a VPS, fronted by a Cloudflare Tunnel or direct exposed port.
- **Native Android Integration**: Android WebView wrapper with network-awareness, pull-to-refresh, and back-button handling.
- **Resilient Infrastructure**:
  - Automated daily PostgreSQL backups with local rotation.
  - **Cloudflare R2 Sync**: Backups are automatically mirrored to Cloudflare R2 storage for off-site disaster recovery.

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI (Python) | REST API framework |
| SQLModel (SQLAlchemy + Pydantic) | ORM and schema validation |
| PostgreSQL 15 | Primary database |
| Alembic | Database migrations |
| Passlib + Bcrypt | Password hashing |
| python-jose | JWT token generation and verification |
| Uvicorn | ASGI server (2 workers in production) |
| SlowAPI | Rate limiting (auth routes) |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework (Deployed on Vercel) |
| Vite | 8.x | Build tool |
| Tailwind CSS | 4.x | Utility-first styling |
| Dexie.js | 4.x | IndexedDB (offline storage & sync queue) |
| React Router | 7.x | Client-side routing with Vercel rewrites |
| Axios | 1.x | HTTP client with JWT interceptors |
| Recharts | 3.x | Analytics charts |
| Lucide React | — | Icons |

### Mobile
- **Language**: Kotlin
- **Platform**: Android (API 24+) — native WebView wrapper
- **Features**: Network status monitoring, performance optimizations, native UI controls

### Infrastructure
- **VPS Deployment**: Docker Compose (backend + postgres + backup system)
- **Frontend Hosting**: Vercel (Production)
- **Database Backups**: `prodrigestivill/postgres-backup-local`
- **Cloud Sync**: `rclone` (S3/Cloudflare R2)

## Project Structure

```text
TK-Project/
├── android/                  # Native Android WebView wrapper (Kotlin)
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── models/           # SQLModel database models
│   │   ├── routes/           # API route handlers
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Business logic (audit, balance, vouchers)
│   │   ├── dependencies/     # Auth dependencies (JWT, role checks)
│   │   └── core/             # Security utilities
│   └── alembic/              # Database migrations
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── pages/            # Route-level page components
│   │   ├── components/       # Reusable UI components
│   │   ├── services/         # API client and sync engine
│   │   ├── context/          # Auth and Language context providers
│   │   ├── hooks/            # Custom React hooks
│   │   └── lib/              # Dexie DB setup
│   ├── public/               # Static assets & manifest for PWA
│   └── vercel.json           # Vercel deployment configuration
├── scripts/                  # Utility scripts (backup sync)
├── backups/                  # Automated database backup files
├── docker-compose.yml        # Development Docker orchestration
├── docker-compose.prod.yml   # Production Docker (Backend-only stack)
└── .env.example              # Environment variables template
```

## Setup & Installation

### Prerequisites
- Docker and Docker Compose
- (For Android) Android Studio

### 1. Environment Configuration

Copy the `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Required environment variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Full PostgreSQL connection string | `postgresql://user:pass@postgres:5432/tkdb` |
| `POSTGRES_USER` | Database username | `tkadmin` |
| `POSTGRES_PASSWORD` | Database password | `strongpassword` |
| `POSTGRES_DB` | Database name | `tkdb` |
| `SECRET_KEY` | JWT signing secret | `abc123...` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT token lifetime | `480` (8 hours) |
| `TZ` | Server timezone | `Asia/Yangon` |
| `ALLOWED_ORIGINS` | CORS origins (add your Vercel domain here) | `https://your-pos.vercel.app` |
| `SHOW_DOCS` | Enable Swagger UI (`true`/`false`) | `false` |
| `R2_ACCOUNT_ID` | Cloudflare R2 Account ID | `your-id` |
| `R2_ACCESS_KEY_ID` | R2 API Access Key | `your-key` |
| `R2_SECRET_ACCESS_KEY` | R2 API Secret Key | `your-secret` |
| `R2_BUCKET` | R2 Bucket Name | `your-bucket` |

### 2. Deployment (VPS - Backend)

Deploy the backend services (API, DB, Backup Sync) on your VPS:

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Deployment (Vercel - Frontend)

1. Connect the `frontend/` directory to Vercel.
2. Set `VITE_API_URL` environment variable to your VPS backend URL (e.g., `https://api.yourdomain.com`).
3. Deploy. The `vercel.json` ensures that React Router handles all sub-paths.

### 4. Database Migrations

Apply the schema on your VPS:

```bash
docker-compose exec backend alembic upgrade head
```

### 5. Backup & Recovery

- **Local Backups**: Managed by `db-backup` container. Retains 7 days of daily, 4 weeks of weekly, and 6 months of monthly backups in `./backups/`.
- **Cloud Sync**: Managed by `backup-uploader` container. Uses `rclone` to sync the `./backups/` directory to Cloudflare R2 storage every hour.
- **Recovery**: To restore, copy a `.sql` file from backups into the postgres container and run `psql -U $USER -d $DB < backup.sql`.

### 6. Android Build

1. Open the `android/` directory in Android Studio.
2. Define your POS server URL (the Vercel frontend URL) in `android/local.properties`:
   ```properties
   pos.url=https://your-pos.vercel.app
   ```
3. Build and deploy to device.

## Key Architectural Patterns

- **Offline-First Sync**: Frontend queues operations (Vouchers, Customers, Payments) in IndexedDB. A background worker replays these every 15 seconds when connectivity is restored.
- **Idempotency**: All creation routes accept a `client_id` (UUID) from the frontend to prevent duplicate records during sync retries.
- **FIFO Settlement**: When a bulk payment is made, the system automatically applies it to the oldest unpaid vouchers first.
- **Audit Trail**: Every mutation records the performing user, action type, and JSON details for accountability.

## License

Proprietary — TK Plastic Press. All rights reserved.
