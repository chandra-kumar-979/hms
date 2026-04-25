# Hostel Management Architecture

## Stack
- Backend: FastAPI + SQLAlchemy + Alembic + JWT
- Frontend: Angular 21 standalone + Angular Material + SCSS
- Storage: PostgreSQL/SQLite + S3 for image/media

## Modules
- Auth and Profile
- Hostel Inventory (Hostel/Floor/Room/Bed)
- Booking and Approval
- Payments and Billing
- Notifications and Broadcast
- Reports and Admin controls

## API Principles
- Role-based authorization for tenant/owner/admin
- Structured error responses
- Service-layer logic with thin route handlers
