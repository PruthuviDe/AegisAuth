# AegisAuth

A production-grade, modular authentication & authorization platform built with NestJS, PostgreSQL, Redis, and Next.js. Designed as a reusable auth service similar to Auth0/Firebase Auth.

## Architecture

```
AegisAuth/
├── docker-compose.yml          # PostgreSQL + Redis
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── main.ts            # App bootstrap + security setup
│   │   ├── app.module.ts      # Root module
│   │   ├── common/            # Shared utilities
│   │   │   ├── constants.ts
│   │   │   ├── interfaces/    # TypeScript interfaces
│   │   │   ├── filters/       # Global exception filter
│   │   │   └── interceptors/  # Response transform
│   │   ├── prisma/            # Database service (global)
│   │   ├── redis/             # Cache service (global)
│   │   └── modules/
│   │       ├── auth/          # Login, register, JWT
│   │       ├── users/         # User CRUD
│   │       ├── tokens/        # JWT + refresh token management
│   │       ├── oauth/         # Google + GitHub (Phase 5)
│   │       ├── email/         # Email verification (Phase 3)
│   │       ├── roles/         # RBAC (Phase 4)
│   │       └── admin/         # Admin dashboard (Phase 7)
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   └── Dockerfile
└── frontend/                   # Next.js + Tailwind (Phase 8)
```

## Quick Start

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Setup backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run start:dev
```

API docs: http://localhost:3000/api/docs

## Implemented

- [x] Phase 1: Project scaffold, Docker, Prisma, environment config
- [x] Phase 2: User registration, Auth (login/logout/JWT), Token management
- [ ] Phase 3: Email verification, Password reset
- [ ] Phase 4: Roles & RBAC
- [ ] Phase 5: OAuth (Google + GitHub)
- [ ] Phase 6: Security hardening & rate limiting
- [ ] Phase 7: Admin dashboard API
- [ ] Phase 8: Frontend UI

## API Endpoints (so far)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout (revoke tokens) |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/verify-email | Verify email address |
| GET | /api/users/me | Get current user profile |
| PUT | /api/users/me | Update current user profile |