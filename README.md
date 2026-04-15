# TK Plastic Press POS System

A modern, offline-capable Point of Sale (POS) system designed for TK Plastic Press. Built with a FastAPI backend, a React 19 frontend with offline synchronization, PostgreSQL database, and a native Android WebView wrapper for mobile deployment.

## Key Features

- **Offline-First Architecture**: Create vouchers and process payments without an internet connection. Data is automatically synchronized when connectivity is restored via a custom sync engine backed by Dexie.js (IndexedDB).
- **Idempotent Sync**: All offline operations use `client_id` UUIDs to prevent duplicate records on retry.
- **FIFO Payment Settlement**: Bulk payments are automatically applied to unpaid vouchers in chronological order.
- **Comprehensive POS Functionality**:
  - Customer management with balance tracking and address records.
  - Voucher creation with line items (plastic size, color, pricing).
  - Payment processing (Cash, Bank Transfer, KBZPay) with history.
  - Real-time analytics dashboard: 30-day sales trends, debt overview, income by payment method, top customers.
- **Security & Role-Based Access**:
  - JWT-based authentication with configurable token expiry.
  - Role-based permissions: Admin vs. Staff.
  - Detailed audit logs for all create, update, and delete actions.
- **Multi-Language Support**: Language context built into the frontend for localization.
- **Native Android Integration**: Android WebView wrapper with network-awareness, pull-to-refresh, and back-button handling.
- **Enterprise-Ready Infrastructure**:
  - Fully containerized with Docker Compose (dev and production configs).
  - Nginx reverse proxy serving built frontend and proxying API requests.
  - Automated daily PostgreSQL backups (7-day daily, 4-week weekly, 6-month monthly retention).

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

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.4 | UI framework |
| Vite | 8.0.4 | Build tool with HMR |
| Tailwind CSS | 4.2.2 | Utility-first styling |
| Dexie.js | 4.4.2 | IndexedDB (offline storage & sync queue) |
| React Router | 7 | Client-side routing |
| Axios | 1.15.0 | HTTP client with JWT interceptors |
| Recharts | 3.8.1 | Analytics charts |
| Lucide React | — | Icons |

### Mobile
- **Language**: Kotlin
- **Platform**: Android (API 24+) — native WebView wrapper
- **Features**: Network status monitoring, performance optimizations, native UI controls

### Infrastructure
- **Containerization**: Docker Compose (dev + production)
- **Reverse Proxy**: Nginx (static asset caching, GZIP compression, SPA fallback)
- **Database Backups**: `prodrigestivill/postgres-backup-local`

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
│   └── src/
│       ├── pages/            # Route-level page components
│       ├── components/       # Reusable UI components
│       ├── services/         # API client and sync engine
│       ├── context/          # Auth and Language context providers
│       ├── hooks/            # Custom React hooks
│       └── lib/              # Dexie DB setup
├── nginx/                    # Nginx proxy configuration
├── backups/                  # Automated database backup files
├── docker-compose.yml        # Development Docker orchestration
├── docker-compose.prod.yml   # Production Docker orchestration
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

Generate a secure `SECRET_KEY`:

```bash
openssl rand -hex 32
```

**Required environment variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Full PostgreSQL connection string | `postgresql://user:pass@postgres:5432/tkdb` |
| `POSTGRES_USER` | Database username | `tkadmin` |
| `POSTGRES_PASSWORD` | Database password | `strongpassword` |
| `POSTGRES_DB` | Database name | `tkdb` |
| `SECRET_KEY` | JWT signing secret (generate with openssl) | `abc123...` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT token lifetime in minutes | `480` (8 hours) |
| `TZ` | Server timezone | `Asia/Yangon` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:5173` |
| `SHOW_DOCS` | Enable Swagger UI (`true` in dev, `false` in prod) | `false` |

### 2. Development Mode

Starts backend (port 8000), frontend with HMR (port 5173), and PostgreSQL (port 5432):

```bash
docker-compose up -d --build
```

Services available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Swagger Docs** (if `SHOW_DOCS=true`): http://localhost:8000/api/docs

### 3. Database Migrations

On first run, apply the schema:

```bash
docker-compose exec backend alembic upgrade head
```

When you update database models, generate and apply a new migration:

```bash
docker-compose exec backend alembic revision --autogenerate -m "describe_change"
docker-compose exec backend alembic upgrade head
```

### 4. First-Time Setup

On first login, the system will prompt you to create the initial admin account via the setup endpoint (`POST /api/auth/setup`). This endpoint is only available when no users exist.

### 5. Production Deployment

Use the production compose file which serves the built frontend through Nginx on port 80:

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

In production:
- **App**: http://localhost (or your configured domain) — port 80 only
- Backend and PostgreSQL are on an internal Docker network (not exposed)
- Set `SHOW_DOCS=false` and restrict `ALLOWED_ORIGINS` to your domain

### 6. Android Build

1. Open the `android/` directory in Android Studio.
2. Define your POS server URL in `android/local.properties`:
   ```properties
   pos.url=https://your-pos-url.com
   ```
3. Build and deploy to device or emulator.

## API Overview

All routes are prefixed with `/api`.

| Module | Prefix | Key Endpoints |
|--------|--------|---------------|
| Auth | `/auth` | `POST /login`, `POST /setup`, `GET /check-setup` |
| Users | `/users` | CRUD user management (admin-only for most actions) |
| Customers | `/customers` | Create, list, search, update, balance, delete |
| Vouchers | `/vouchers` | Create with items, list, get by customer, delete |
| Payments | `/payments` | Create, bulk create (FIFO settlement), list, delete |
| Analytics | `/analytics` | `GET /dashboard` — 30-day metrics |
| Audit Logs | `/audit-logs` | List all audit entries (admin-only) |

## Database Models

| Model | Description |
|-------|-------------|
| `User` | System users with roles (ADMIN, STAFF) |
| `Customer` | Customers with name, phone, address, and balance relations |
| `Voucher` | Sales vouchers with items, totals, and payment tracking |
| `Item` | Line items on a voucher (plastic size, color, pricing) |
| `Payment` | Standalone payments against customer balances |
| `AuditLog` | Immutable log of all create/update/delete actions |

## Key Architectural Patterns

- **Offline-First Sync**: Frontend queues operations in IndexedDB and replays them to the backend every 15 seconds when online.
- **Idempotency**: Vouchers, customers, and payments accept a `client_id` UUID to prevent duplicates on retry.
- **FIFO Settlement**: Bulk payments settle against the oldest unpaid vouchers first.
- **Audit Trail**: Every mutation records the user, action type, target, and details.
- **Timezone**: All dates are handled in `Asia/Yangon` (UTC+6:30).

## Security

- In production, set `SHOW_DOCS=false` to disable the Swagger UI.
- Restrict `ALLOWED_ORIGINS` to your exact frontend domain.
- Backups are created daily and retained for 7 days (daily), 4 weeks (weekly), and 6 months (monthly) in `./backups/`.
- Rotate your `SECRET_KEY` periodically and update all active sessions.

## License

Proprietary — TK Plastic Press. All rights reserved.
