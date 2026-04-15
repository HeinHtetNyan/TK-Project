# TK Plastic Press POS System

A modern, offline-capable Point of Sale (POS) system designed for TK Plastic Press. This project includes a robust FastAPI backend, a responsive React frontend with offline synchronization, and a native Android WebView wrapper for mobile deployment.

## 🚀 Key Features

- **Offline-First Architecture**: Create vouchers and process payments even without an internet connection. Data is automatically synchronized when connectivity is restored using a custom sync engine and Dexie (IndexedDB).
- **Comprehensive POS Functionality**:
  - Customer management and balance tracking.
  - Voucher creation and management.
  - Payment processing and history.
  - Real-time analytics and reporting.
- **Security & Role-Based Access**:
  - Secure JWT-based authentication.
  - Role-based permissions (Admin vs. Standard User).
  - Detailed audit logs for tracking system-wide actions.
- **Native Android Integration**: A optimized Android WebView wrapper providing a seamless mobile experience with pull-to-refresh and back-button handling.
- **Enterprise-Ready Infrastructure**:
  - Containerized with Docker for easy deployment.
  - Automated daily database backups.
  - PostgreSQL database with Alembic migrations.

## 🛠 Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database ORM**: [SQLModel](https://sqlmodel.tiangolo.com/) (SQLAlchemy + Pydantic)
- **Database**: PostgreSQL 15
- **Migrations**: Alembic
- **Auth**: JWT (JSON Web Tokens) with Passlib (Bcrypt)

### Frontend
- **Framework**: [React](https://react.dev/) 19 (Vite)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State & Storage**: [Dexie.js](https://dexie.org/) (IndexedDB) for offline data storage.
- **Routing**: React Router 7

### Mobile
- **Language**: Kotlin
- **Platform**: Android Native (WebView)
- **Features**: Network status monitoring, performance optimizations, and native UI controls.

## 📦 Project Structure

```text
TK-Project/
├── android/          # Native Android WebView wrapper
├── backend/          # FastAPI application, database models, and migrations
├── frontend/         # React web application
├── nginx/            # Nginx proxy configuration
├── backups/          # Automated database backups
├── docker-compose.yml # Main Docker orchestration
└── .env.example      # Environment variables template
```

## ⚙️ Setup & Installation

### 1. Prerequisites
- Docker and Docker Compose
- (For Android) Android Studio

### 2. Environment Configuration
Copy the `.env.example` file to `.env` and update the values:
```bash
cp .env.example .env
```
Ensure you generate a secure `SECRET_KEY` using:
```bash
openssl rand -hex 32
```

### 3. Development Mode
Start the stack in development mode (supports hot-reloading for frontend):
```bash
docker-compose up -d --build
```
The services will be available at:
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API Docs**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

### 4. Production Deployment
For production, use the dedicated production configuration which uses Nginx to serve the built frontend and proxy API requests:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```
In production:
- **Frontend & API**: [http://localhost](http://localhost) (or your configured domain)
- Only port 80 is exposed. All other services (Postgres, Backend) communicate over an internal Docker network.
- Automated daily backups are stored in the `./backups` directory.

### 5. Database Migrations
If you make changes to the database models, run:
```bash
docker-compose exec backend alembic upgrade head
```

### 6. Android Build
1. Open the `android/` directory in Android Studio.
2. Define your POS URL in `android/local.properties`:
   ```properties
   pos.url=https://your-pos-url.com
   ```
3. Build and run the app on your device or emulator.

## 🛡 Security & Best Practices
- **Backups**: The `db-backup` service automatically creates daily backups of the PostgreSQL database, keeping them for up to 6 months.
- **Production**: In production, ensure `SHOW_DOCS` is set to `false` and `ALLOWED_ORIGINS` is restricted to your specific domains.

## 📝 License
Proprietary for TK Plastic Press.
