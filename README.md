# HerBizReach API

> **REST + WebSocket backend for the HerBizReach platform** — empowering women entrepreneurs with digital storefronts, real-time customer chat, AI-assisted content, analytics, and a full administration console.

Built with **NestJS 11 · TypeScript 5.7 · PostgreSQL · Prisma 6 · Socket.IO 4 · Redis**.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Module Breakdown](#module-breakdown)
4. [Technology Stack](#technology-stack)
5. [External Services](#external-services)
6. [Prerequisites](#prerequisites)
7. [Environment Variables](#environment-variables)
8. [Getting Started — Local Development](#getting-started--local-development)
9. [Database & Migrations](#database--migrations)
10. [Running the Server](#running-the-server)
11. [API Reference](#api-reference)
12. [WebSocket (Socket.IO) Reference](#websocket-socketio-reference)
13. [Authentication & Authorization](#authentication--authorization)
14. [Rate Limiting](#rate-limiting)
15. [File Uploads & Image Storage](#file-uploads--image-storage)
16. [AI Features](#ai-features)
17. [Notifications (FCM)](#notifications-fcm)
18. [Internationalization (Locales)](#internationalization-locales)
19. [Audit Logging](#audit-logging)
20. [Health Checks](#health-checks)
21. [Testing](#testing)
22. [Docker](#docker)
23. [Production Deployment Checklist](#production-deployment-checklist)
24. [Security Hardening Notes](#security-hardening-notes)
25. [Project Structure](#project-structure)

---

## Overview

HerBizReach API is the backend service for the HerBizReach platform. It provides:

- **Multi-tenant storefronts** — each business owner gets a public slug-based storefront page with products, branding, and contact.
- **Customer acquisition** — lead capture forms, view tracking, and share analytics per store and per product.
- **Real-time chat** — Socket.IO gateway supporting both authenticated users and anonymous guests. Horizontally scalable via Redis pub/sub.
- **AI content generation** — product description improvement and social-media caption generation powered by Google Gemini and OpenRouter.
- **Push notifications** — Firebase Cloud Messaging (FCM) for mobile/web push.
- **Transactional email** — SendGrid integration for password-reset and welcome flows.
- **Admin console** — full platform management: users, products, categories, metrics, conversations, and audit trail.
- **Role-based access control** — `OWNER`, `CUSTOMER`, and `ADMIN` roles enforced at the controller and guard level.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          Clients                                 │
│          Next.js Frontend  ·  Mobile App  ·  Admin SPA           │
└───────────────────────┬──────────────────────────────────────────┘
                        │ HTTP/REST  &  WebSocket (Socket.IO)
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                     NestJS Application                           │
│                                                                  │
│  ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Auth   │  │ Products  │  │  Store   │  │  Admin Module  │  │
│  └─────────┘  └───────────┘  └──────────┘  └────────────────┘  │
│  ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Chat   │  │    AI     │  │Analytics │  │ Notifications  │  │
│  └─────────┘  └───────────┘  └──────────┘  └────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Common: JWT Guard · Roles Guard · Throttler · Helmet       ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────┬──────────────────────────────┬────────────────────────┘
           │                              │
    ┌──────▼──────┐              ┌────────▼────────┐
    │ PostgreSQL  │              │  Redis (opt.)   │
    │  (Prisma)   │              │  Socket.IO pub  │
    └─────────────┘              └─────────────────┘
```

**Request lifecycle**

1. `helmet` middleware applies security headers.
2. CORS validation against `CORS_ORIGINS`.
3. Global `ThrottlerGuard` enforces per-IP rate limits.
4. Global `JwtAuthGuard` validates Bearer token (routes marked `@Public()` skip this step).
5. `RolesGuard` checks `@Roles(...)` decoration on handlers.
6. `ValidationPipe` strips unknown fields (`whitelist: true`, `forbidNonWhitelisted: true`) and auto-transforms types.
7. Handler executes; `PrismaClientExceptionFilter` normalises ORM exceptions into proper HTTP responses.

---

## Module Breakdown

| Module | Path | Responsibility |
|---|---|---|
| `AuthModule` | `src/auth` | Register (owner / customer), login, forgot/reset password, JWT strategy |
| `UsersModule` | `src/users` | Internal user query/update service |
| `ProductsModule` | `src/products` | CRUD for owner products, multipart image upload, AI field storage |
| `StoreModule` | `src/store` | Public storefront payload, lead submission, view & share event recording |
| `StoreSettingsModule` | `src/store-settings` | Owner store branding (WhatsApp, banner, accent colour, tagline) |
| `ChatModule` | `src/chat` | REST conversation + messages, Socket.IO gateway, guest token flow |
| `LeadsModule` | `src/leads` | Owner inbox for captured leads |
| `AnalyticsModule` | `src/analytics` | Aggregated owner dashboard metrics |
| `AiModule` | `src/ai` | Gemini / OpenRouter description improvement, caption generation, image enhancement, SKU suggestions, inbox reply suggestions, product localisation |
| `NotificationsModule` | `src/notifications` | FCM push token registration and notification dispatch |
| `LocalesModule` | `src/locales` | Platform locale seeding and management |
| `MailModule` | `src/mail` | SendGrid transactional email (password reset, welcome) |
| `CloudinaryModule` | `src/cloudinary` | Cloudinary upload / delete abstraction |
| `CategoriesModule` | `src/categories` | Public product category list |
| `AdminModule` | `src/admin` | Admin-only: users, products, categories, metrics, conversations, audit logs |
| `AuditModule` | `src/audit` | Write-only audit log service consumed by other modules |
| `PrismaModule` | `src/prisma` | Global Prisma client singleton |
| `HealthController` | `src/health` | Liveness + readiness probes |
| `ConfigModule` | `src/config` | Typed configuration factory + Joi-based env validation |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 (LTS) |
| Framework | NestJS 11 |
| Language | TypeScript 5.7 |
| ORM | Prisma 6 |
| Database | PostgreSQL 15+ |
| Real-time | Socket.IO 4 (NestJS WebSockets) |
| Cache / Pub-Sub | Redis 4 (optional, for Socket.IO scaling) |
| Authentication | Passport.js + `passport-jwt` · JWT (`@nestjs/jwt`) |
| Password hashing | `bcryptjs` |
| Validation | `class-validator` + `class-transformer` |
| Rate limiting | `@nestjs/throttler` |
| Security headers | `helmet` |
| API documentation | `@nestjs/swagger` (Swagger UI at `/api/docs`) |
| File upload | `multer` (local fallback) |
| Testing | Jest 30 + `ts-jest` · Supertest (e2e) |
| Linting | ESLint 9 + `typescript-eslint` + `eslint-plugin-prettier` |
| Formatting | Prettier 3 |
| Containerisation | Docker (multi-stage, `node:22-alpine`) |

---

## External Services

| Service | Purpose | Required |
|---|---|---|
| **PostgreSQL** | Primary database | Yes |
| **Cloudinary** | Product image and banner storage | Yes (production) |
| **Google Gemini** | AI description improvement, image enhancement | Yes (for AI endpoints) |
| **OpenRouter** | Alternative LLM routing | Optional |
| **Firebase Admin (FCM)** | Mobile / web push notifications | Optional |
| **SendGrid** | Transactional email (password reset, welcome) | Optional |
| **Redis** | Socket.IO horizontal scaling adapter | Optional |

---

## Prerequisites

- **Node.js** ≥ 22 (`node --version`)
- **npm** ≥ 10 (`npm --version`)
- **PostgreSQL** ≥ 15 running locally or accessible remotely
- **Redis** (optional — required only for multi-instance Socket.IO scaling)

---

## Environment Variables

Copy `.env.example` to `.env` (or edit `.env` directly). All variables are validated at startup via `src/config/env.validation.ts`; the server **will not start** if required variables are missing or malformed.

```dotenv
# ── Core ────────────────────────────────────────────────────────────
NODE_ENV=development            # development | production | test
PORT=4000                       # HTTP listen port

# ── Database ─────────────────────────────────────────────────────────
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/herbizreach?schema=public

# ── JWT ──────────────────────────────────────────────────────────────
JWT_SECRET=change-me-min-8-chars-use-32-in-production
JWT_EXPIRES_IN=7d               # ms-compatible string, e.g. 7d, 2h, 900000

# ── CORS ─────────────────────────────────────────────────────────────
# Comma-separated allowed origins (no spaces)
CORS_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app

# ── Cloudinary ───────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=herbizreach

# ── Redis (optional) ─────────────────────────────────────────────────
REDIS_URL=redis://:PASSWORD@HOST:PORT/0

# ── AI — Google Gemini ───────────────────────────────────────────────
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image

# ── AI — OpenRouter (optional fallback) ──────────────────────────────
OPENROUTER_API_KEY=
OPENROUTER_MODEL=nvidia/nemotron-3-nano-30b-a3b:free

# ── Admin Bootstrap ──────────────────────────────────────────────────
# Creates / resets admin user on first boot. Remove password after setup.
ADMIN_BOOTSTRAP_EMAIL=adm@herbizreach.com
ADMIN_BOOTSTRAP_PASSWORD=Admin@12345
ADMIN_SEED_RESET_PASSWORD=true  # set false after first boot

# ── Rate Limits ───────────────────────────────────────────────────────
THROTTLE_TTL_MS=60000           # window in ms (default 60 s)
THROTTLE_LIMIT=120              # max requests per window per IP
AI_THROTTLE_LIMIT=20            # stricter limit on /ai/* endpoints

# ── SendGrid (transactional email) ────────────────────────────────────
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@herbizreach.com
SENDGRID_FROM_NAME=HerBizReach
APP_PUBLIC_URL=https://your-frontend.vercel.app   # used in password-reset links
```

> **Security note** — never commit `.env` to version control. All secrets should be injected via CI/CD environment variables or a secrets manager in production.

---

## Getting Started — Local Development
# HerBizReach API

> REST + WebSocket backend for the HerBizReach platform — empowering women entrepreneurs with digital storefronts, real-time customer chat, AI-assisted content, analytics, and a full administration console.

Built with **NestJS 11 · TypeScript 5.7 · PostgreSQL · Prisma 6 · Socket.IO 4 · Redis**.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Module Breakdown](#module-breakdown)
4. [Technology Stack](#technology-stack)
5. [External Services](#external-services)
6. [Prerequisites](#prerequisites)
7. [Environment Variables](#environment-variables)
8. [Getting Started — Local Development](#getting-started--local-development)
9. [Database & Migrations](#database--migrations)
10. [Running the Server](#running-the-server)
11. [API Reference](#api-reference)
12. [WebSocket (Socket.IO) Reference](#websocket-socketio-reference)
13. [Authentication & Authorization](#authentication--authorization)
14. [Rate Limiting](#rate-limiting)
15. [File Uploads & Image Storage](#file-uploads--image-storage)
16. [AI Features](#ai-features)
17. [Notifications (FCM)](#notifications-fcm)
18. [Internationalization (Locales)](#internationalization-locales)
19. [Audit Logging](#audit-logging)
20. [Health Checks](#health-checks)
21. [Testing](#testing)
22. [Docker](#docker)
23. [Production Deployment Checklist](#production-deployment-checklist)
24. [Security Hardening Notes](#security-hardening-notes)
25. [Project Structure](#project-structure)

---

## Overview

HerBizReach API is the backend service for the HerBizReach platform. It provides:

- **Multi-tenant storefronts** — each business owner gets a public slug-based storefront page with products, branding, and contact.
- **Customer acquisition** — lead capture forms, view tracking, and share analytics per store and per product.
- **Real-time chat** — Socket.IO gateway supporting both authenticated users and anonymous guests. Horizontally scalable via Redis pub/sub.
- **AI content generation** — product description improvement and social-media caption generation powered by Google Gemini and OpenRouter.
- **Push notifications** — Firebase Cloud Messaging (FCM) for mobile/web push.
- **Transactional email** — SendGrid integration for password-reset and welcome flows.
- **Admin console** — full platform management: users, products, categories, metrics, conversations, and audit trail.
- **Role-based access control** — `OWNER`, `CUSTOMER`, and `ADMIN` roles enforced at the controller and guard level.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          Clients                                 │
│          Next.js Frontend  ·  Mobile App  ·  Admin SPA           │
└───────────────────────┬──────────────────────────────────────────┘
                        │ HTTP/REST  &  WebSocket (Socket.IO)
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                     NestJS Application                           │
│                                                                  │
│  ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Auth   │  │ Products  │  │  Store   │  │  Admin Module  │  │
│  └─────────┘  └───────────┘  └──────────┘  └────────────────┘  │
│  ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Chat   │  │    AI     │  │Analytics │  │ Notifications  │  │
│  └─────────┘  └───────────┘  └──────────┘  └────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Common: JWT Guard · Roles Guard · Throttler · Helmet       ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────┬──────────────────────────────┬────────────────────────┘
           │                              │
    ┌──────▼──────┐              ┌────────▼────────┐
    │ PostgreSQL  │              │  Redis (opt.)   │
    │  (Prisma)   │              │  Socket.IO pub  │
    └─────────────┘              └─────────────────┘
```

**Request lifecycle**

1. `helmet` middleware applies security headers.
2. CORS validation against `CORS_ORIGINS`.
3. Global `ThrottlerGuard` enforces per-IP rate limits.
4. Global `JwtAuthGuard` validates Bearer token (routes marked `@Public()` skip this step).
5. `RolesGuard` checks `@Roles(...)` decoration on handlers.
6. `ValidationPipe` strips unknown fields (`whitelist: true`, `forbidNonWhitelisted: true`) and auto-transforms types.
7. Handler executes; `PrismaClientExceptionFilter` normalises ORM exceptions into proper HTTP responses.

---

## Module Breakdown

| Module | Path | Responsibility |
|---|---|---|
| `AuthModule` | `src/auth` | Register (owner / customer), login, forgot/reset password, JWT strategy |
| `UsersModule` | `src/users` | Internal user query/update service |
| `ProductsModule` | `src/products` | CRUD for owner products, multipart image upload, AI field storage |
| `StoreModule` | `src/store` | Public storefront payload, lead submission, view & share event recording |
| `StoreSettingsModule` | `src/store-settings` | Owner store branding (WhatsApp, banner, accent colour, tagline) |
| `ChatModule` | `src/chat` | REST conversation + messages, Socket.IO gateway, guest token flow |
| `LeadsModule` | `src/leads` | Owner inbox for captured leads |
| `AnalyticsModule` | `src/analytics` | Aggregated owner dashboard metrics |
| `AiModule` | `src/ai` | Gemini / OpenRouter description improvement, caption generation, image enhancement, SKU suggestions, inbox reply suggestions, product localisation |
| `NotificationsModule` | `src/notifications` | FCM push token registration and notification dispatch |
| `LocalesModule` | `src/locales` | Platform locale seeding and management |
| `MailModule` | `src/mail` | SendGrid transactional email (password reset, welcome) |
| `CloudinaryModule` | `src/cloudinary` | Cloudinary upload / delete abstraction |
| `CategoriesModule` | `src/categories` | Public product category list |
| `AdminModule` | `src/admin` | Admin-only: users, products, categories, metrics, conversations, audit logs |
| `AuditModule` | `src/audit` | Write-only audit log service consumed by other modules |
| `PrismaModule` | `src/prisma` | Global Prisma client singleton |
| `HealthController` | `src/health` | Liveness + readiness probes |
| `ConfigModule` | `src/config` | Typed configuration factory + Joi-based env validation |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 (LTS) |
| Framework | NestJS 11 |
| Language | TypeScript 5.7 |
| ORM | Prisma 6 |
| Database | PostgreSQL 15+ |
| Real-time | Socket.IO 4 (NestJS WebSockets) |
| Cache / Pub-Sub | Redis 4 (optional, for Socket.IO scaling) |
| Authentication | Passport.js + `passport-jwt` · JWT (`@nestjs/jwt`) |
| Password hashing | `bcryptjs` |
| Validation | `class-validator` + `class-transformer` |
| Rate limiting | `@nestjs/throttler` |
| Security headers | `helmet` |
| API documentation | `@nestjs/swagger` (Swagger UI at `/api/docs`) |
| File upload | `multer` (local fallback) |
| Testing | Jest 30 + `ts-jest` · Supertest (e2e) |
| Linting | ESLint 9 + `typescript-eslint` + `eslint-plugin-prettier` |
| Formatting | Prettier 3 |
| Containerisation | Docker (multi-stage, `node:22-alpine`) |

---

## External Services

| Service | Purpose | Required |
|---|---|---|
| **PostgreSQL** | Primary database | Yes |
| **Cloudinary** | Product image and banner storage | Yes (production) |
| **Google Gemini** | AI description improvement, image enhancement | Yes (for AI endpoints) |
| **OpenRouter** | Alternative LLM routing | Optional |
| **Firebase Admin (FCM)** | Mobile / web push notifications | Optional |
| **SendGrid** | Transactional email (password reset, welcome) | Optional |
| **Redis** | Socket.IO horizontal scaling adapter | Optional |

---

## Prerequisites

- **Node.js** ≥ 22 (`node --version`)
- **npm** ≥ 10 (`npm --version`)
- **PostgreSQL** ≥ 15 running locally or accessible remotely
- **Redis** (optional — required only for multi-instance Socket.IO scaling)

---

## Environment Variables

Copy `.env.example` to `.env`. All variables are validated at startup via `src/config/env.validation.ts` — the server **will not start** if required variables are missing or malformed.

| Variable | Description | Required |
|---|---|---|
| `NODE_ENV` | `development` \| `production` \| `test` | Yes |
| `PORT` | HTTP listen port | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for signing JWTs (use 32+ chars in production) | Yes |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`, `2h`) | Yes |
| `CORS_ORIGINS` | Comma-separated list of allowed origins | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Production |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Production |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Production |
| `CLOUDINARY_FOLDER` | Cloudinary upload folder | Production |
| `REDIS_URL` | Redis connection URL | Optional |
| `GEMINI_API_KEY` | Google Gemini API key | AI features |
| `GEMINI_MODEL` | Gemini model name (e.g. `gemini-2.5-flash`) | AI features |
| `GEMINI_IMAGE_MODEL` | Gemini vision model name | AI features |
| `OPENROUTER_API_KEY` | OpenRouter API key | Optional |
| `OPENROUTER_MODEL` | OpenRouter model name | Optional |
| `ADMIN_BOOTSTRAP_EMAIL` | Email for the seeded admin account | Yes |
| `ADMIN_BOOTSTRAP_PASSWORD` | Initial admin password (change after first boot) | Yes |
| `ADMIN_SEED_RESET_PASSWORD` | Set to `false` after initial admin setup | Yes |
| `THROTTLE_TTL_MS` | Rate limit window in ms (default `60000`) | Optional |
| `THROTTLE_LIMIT` | Max requests per window per IP (default `120`) | Optional |
| `AI_THROTTLE_LIMIT` | Stricter limit for `/ai/*` endpoints (default `20`) | Optional |
| `SENDGRID_API_KEY` | SendGrid API key | Email features |
| `SENDGRID_FROM_EMAIL` | Verified sender email address | Email features |
| `SENDGRID_FROM_NAME` | Sender display name | Email features |
| `APP_PUBLIC_URL` | Frontend canonical URL (used in email links) | Email features |

> **Security note** — never commit `.env` to version control. Inject secrets via your CI/CD environment or a secrets manager in production.

---

## Getting Started — Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy and edit environment file
cp .env.example .env
# Edit .env with your local PostgreSQL credentials, API keys, etc.

# 3. Generate Prisma client
npm run prisma:generate

# 4. Run database migrations
npm run prisma:migrate

# 5. (Optional) Seed the database
npm run db:seed

# 6. Start in watch mode
npm run start:dev
```

The API will be available at `http://localhost:4000`.  
Interactive Swagger docs: `http://localhost:4000/api/docs` (non-production only).

---

## Database & Migrations

The project uses **Prisma** as the ORM with a PostgreSQL database.

| Command | Description |
|---|---|
| `npm run prisma:generate` | Regenerate the Prisma client after schema changes |
| `npm run prisma:migrate` | Apply pending migrations (creates migration files in `prisma/migrations/`) |
| `npm run prisma:studio` | Open Prisma Studio GUI at `http://localhost:5555` |
| `npm run db:seed` | Run `prisma/seed.ts` to seed initial data |

Schema lives at `prisma/schema.prisma`.

> In production, run `npx prisma migrate deploy` (not `migrate dev`) to apply migrations without generating new files.

---

## Running the Server

| Script | Description |
|---|---|
| `npm run start` | Start (no watch) |
| `npm run start:dev` | Start with file watcher (hot reload) |
| `npm run start:debug` | Start with debugger + file watcher |
| `npm run start:prod` | Run compiled output from `dist/` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run format` | Run Prettier across `src/` and `test/` |
| `npm run lint` | Run ESLint with auto-fix |

---

## API Reference

**Base URL:** `http://localhost:4000` (no global path prefix)

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Liveness — returns `{ status: "ok" }` |
| `GET` | `/health/ready` | Public | Readiness — verifies DB connectivity |

---

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register a business owner account |
| `POST` | `/auth/register-customer` | Public | Register a customer account |
| `POST` | `/auth/login` | Public | Login (any role) |
| `GET` | `/auth/me` | JWT | Return current user's profile |
| `POST` | `/auth/forgot-password` | Public | Trigger password-reset email via SendGrid |
| `POST` | `/auth/reset-password` | Public | Consume reset token and set new password |

**`POST /auth/register`** — JSON body

| Field | Type | Required |
|---|---|---|
| `fullName` | string | Yes |
| `email` | string (email) | Yes |
| `password` | string (min 8) | Yes |
| `businessName` | string | Yes |
| `phone` | string | No |

**`POST /auth/register-customer`** — JSON body: `fullName`, `email`, `password`

**`POST /auth/login`** — JSON body: `email`, `password`

Response shape (register / login):
```json
{
  "access_token": "<jwt>",
  "user": { "id": "...", "email": "...", "role": "OWNER", ... }
}
```

---

### Public Storefront

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/store/:slug` | Public | Full store payload (products, settings, branding) |
| `GET` | `/store/:slug/products/:productId` | Public | Single product on that store |
| `POST` | `/store/:slug/leads` | Public | Submit a contact lead |
| `POST` | `/store/:slug/view` | Public | Record a page or product view event |
| `POST` | `/store/:slug/share` | Public | Record a share event (e.g. WhatsApp) |

**`POST /store/:slug/leads`** — JSON body

| Field | Type | Required |
|---|---|---|
| `name` | string | Yes |
| `phone` | string (5–32 chars) | Yes |
| `message` | string | No |
| `productId` | UUID v4 | No |

**`POST /store/:slug/view`** — `productId?`, `referrer?`  
**`POST /store/:slug/share`** — `productId?`, `channel?`

---

### Categories

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/categories` | Public | List all product categories |

---

### Products (Owner)

All routes require **JWT** + role **`OWNER`**.

| Method | Path | Description |
|---|---|---|
| `POST` | `/products` | Create product (`multipart/form-data`) |
| `GET` | `/products` | List authenticated owner's products |
| `GET` | `/products/:id` | Get single product by UUID |
| `PATCH` | `/products/:id` | Update product fields (JSON) |
| `PATCH` | `/products/:id/image` | Replace product image (`multipart`: field `image`) |
| `DELETE` | `/products/:id` | Delete product |

**`POST /products`** — `multipart/form-data`

| Field | Type | Required |
|---|---|---|
| `image` | file | Yes |
| `name` | string | Yes |
| `price` | number | Yes |
| `descriptionRaw` | string | Yes |
| `sku` | string | No |
| `stockQuantity` | number | No |
| `lowStockThreshold` | number | No |
| `featured` | boolean | No |
| `categoryIds` | comma-separated UUIDs or JSON array string | No |
| `isPublished` | boolean | No |

**`PATCH /products/:id`** — JSON (all optional): `name`, `price`, `descriptionRaw`, `descriptionAi`, `captionAi`, `sku`, `stockQuantity`, `lowStockThreshold`, `featured`, `categoryIds`, `isPublished`

---

### Store Settings (Owner)

Requires **JWT** + **`OWNER`**.

| Method | Path | Description |
|---|---|---|
| `GET` | `/store-settings` | Get store branding settings |
| `PATCH` | `/store-settings` | Update settings (all fields optional) |

**`PATCH /store-settings`** — JSON: `whatsAppPhone`, `bannerUrl`, `accentColor`, `tagline`, `showChatWidget`

---

### Chat — REST

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/chat/conversations/start` | Public* | Start a conversation |
| `GET` | `/chat/conversations` | JWT | List conversations (owner sees all; customer sees own) |
| `GET` | `/chat/conversations/:id/messages` | Public* | Paginated messages (guests use `guestToken` query param) |
| `POST` | `/chat/conversations/:id/messages` | Public* | Send a message |
| `PATCH` | `/chat/conversations/:id/archive` | JWT + **OWNER** | Archive conversation |

\* **Public*** = no JWT required for guests. If a valid `Authorization: Bearer` header is present, the user is identified automatically.

**`POST /chat/conversations/start`** — JSON body: `storeSlug`  
**`GET /chat/conversations/:id/messages`** — query: `page` (default 1), `limit` (default 50, max 100), `guestToken?`  
**`POST /chat/conversations/:id/messages`** — JSON body: `body`, `guestToken?` (required for guest threads)

---

### Leads (Owner)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/leads` | JWT + **OWNER** | List all leads for authenticated owner's store |

---

### Analytics (Owner)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/analytics/overview` | JWT + **OWNER** | Dashboard metrics: total views, shares, leads; per-product breakdown |

---

### AI (Owner)

Stricter rate limit applies (default **20 requests / 60 s** per IP).

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/ai/improve-description` | JWT + **OWNER** | Generate improved description + social caption via Gemini |
| `POST` | `/ai/suggest-sku` | JWT + **OWNER** | Suggest SKU codes for a product |
| `POST` | `/ai/enhance-product-image` | JWT + **OWNER** | AI-enhanced product image via Gemini Vision |
| `POST` | `/ai/localize-product` | JWT + **OWNER** | Generate translated product content |
| `POST` | `/ai/suggest-inbox-replies` | JWT + **OWNER** | Suggest quick-reply options for a chat thread |

**`POST /ai/improve-description`** — JSON body: `descriptionRaw` (required), `productName` (optional)

---

### Notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/notifications/fcm-token` | JWT | Register an FCM push token for the current user |
| `GET` | `/notifications` | JWT | List notifications for the current user |
| `PATCH` | `/notifications/:id/read` | JWT | Mark a notification as read |

---

### Admin Console

All routes require **JWT** + role **`ADMIN`**.  
Pagination: `page` (≥ 1) and `limit` (1–100).

| Method | Path | Notes |
|---|---|---|
| `GET` | `/admin/users` | Query: `page`, `limit`, `role?`, `search?` |
| `GET` | `/admin/users/:id` | |
| `PATCH` | `/admin/users/:id` | Body: `role?`, `disabled?` |
| `GET` | `/admin/products` | Query: `page`, `limit`, `userId?`, `search?` |
| `GET` | `/admin/products/:id` | |
| `PATCH` | `/admin/products/:id` | Body: `name?`, `price?`, `isPublished?`, `featured?` |
| `DELETE` | `/admin/products/:id` | |
| `GET` | `/admin/metrics` | Platform-wide metrics including category stats |
| `GET` | `/admin/categories` | Per-category stats (products, views, shares, 7-day windows) |
| `POST` | `/admin/categories` | Body: `name`, `slug?` (auto-generated from name if omitted) |
| `GET` | `/admin/conversations` | Query: `page`, `limit` |
| `GET` | `/admin/conversations/:id/messages` | Query: `page`, `limit` (default 50) |
| `GET` | `/admin/audit-logs` | Query: `page`, `limit`, `actorUserId?`, `entityType?` |

---

### OpenAPI (Swagger)

When `NODE_ENV` is not `production`, interactive API documentation is available at:

```
http://localhost:4000/api/docs
```

Use the **Authorize** button to enter a Bearer token and test protected endpoints directly.

---

## WebSocket (Socket.IO) Reference

**Namespace:** `/chat`  
**Connect to:** `http://<host>:<port>/chat`

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:4000/chat", {
  auth: { token: "<jwt>" },         // omit for guest
  transports: ["websocket"],
});
```

CORS: the connecting origin must be listed in `CORS_ORIGINS`.

### Client → Server Events

| Event | Payload | Description |
|---|---|---|
| `join` | `{ conversationId: string, guestToken?: string }` | Join a conversation room |
| `sendMessage` | `{ conversationId: string, body: string, guestToken?: string }` | Send a message |
| `typing` | `{ conversationId: string, typing: boolean }` | Broadcast typing indicator |

### Server → Client Events

| Event | Payload | Description |
|---|---|---|
| `message` | Message object (same shape as REST) | New message received |
| `typing` | `{ conversationId: string, typing: boolean }` | Typing indicator from another participant |

### Horizontal Scaling

When `REDIS_URL` is set, the `RedisIoAdapter` is used automatically. All Socket.IO instances publish and subscribe via Redis pub/sub, allowing multiple API pods to deliver events to the correct client regardless of which pod it is connected to.

---

## Authentication & Authorization

### JWT Flow

1. Client calls `POST /auth/login` or `POST /auth/register` and receives `access_token`.
2. Client attaches the token on every subsequent request:
   ```
   Authorization: Bearer <access_token>
   ```
3. The global `JwtAuthGuard` validates the token using `JWT_SECRET` and attaches the decoded payload to `request.user`.
4. The `RolesGuard` enforces `@Roles(Role.OWNER)` etc. at the handler level.

### Roles

| Role | Capabilities |
|---|---|
| `OWNER` | Manage own products, store settings, view leads & analytics, use AI tools |
| `CUSTOMER` | Access own chat conversations, profile |
| `ADMIN` | Full platform access — users, all products, categories, metrics, audit trail |

### Public Routes

Handlers decorated with `@Public()` bypass the global `JwtAuthGuard`. Chat endpoints also support an **optional** auth pattern: guests proceed without a token but pass a `guestToken`, while authenticated users are identified via the Bearer header if present.

### Admin Bootstrap

On startup, `AdminBootstrapService` checks for `ADMIN_BOOTSTRAP_EMAIL` and creates or resets the admin account. Set `ADMIN_SEED_RESET_PASSWORD=false` after the first boot to prevent the password being reset on every restart.

---

## Rate Limiting

A global `ThrottlerGuard` is applied to every route.

| Scope | Default | Env Override |
|---|---|---|
| Global | 120 requests / 60 s per IP | `THROTTLE_LIMIT` / `THROTTLE_TTL_MS` |
| `/ai/*` endpoints | 20 requests / 60 s per IP | `AI_THROTTLE_LIMIT` |

Clients exceeding the limit receive **HTTP 429 Too Many Requests**. Implement exponential back-off in frontend clients.

---

## File Uploads & Image Storage

### Cloudinary (recommended / default for production)

When `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are set, all product images and store banners are uploaded to Cloudinary. Transformations are applied at CDN level.

### Local Storage (development fallback)

If `USE_LOCAL_IMAGE_UPLOAD=true` (or Cloudinary credentials are absent), files are stored in the `uploads/` directory and served at `/files/` via Express static middleware.

- `uploads/products/` — product images
- `uploads/store-profiles/` — store banner images

> **Do not use local storage in production.** Use Cloudinary or an equivalent CDN-backed storage service.

---

## AI Features

The `AiModule` integrates multiple AI providers:

| Feature | Provider | Endpoint |
|---|---|---|
| Description improvement & caption | Google Gemini (`GEMINI_MODEL`) | `POST /ai/improve-description` |
| Product image enhancement | Google Gemini Vision (`GEMINI_IMAGE_MODEL`) | `POST /ai/enhance-product-image` |
| SKU suggestion | Gemini / OpenRouter | `POST /ai/suggest-sku` |
| Product localisation (translation) | Gemini | `POST /ai/localize-product` |
| Inbox reply suggestions | Gemini | `POST /ai/suggest-inbox-replies` |

AI input is sanitised via `src/common/utils/sanitize-prompt.util.ts` before being forwarded to external providers to mitigate prompt injection.

Provider fallback order: Gemini primary → OpenRouter secondary (configurable per feature).

---

## Notifications (FCM)

The `NotificationsModule` uses **Firebase Admin SDK** (`firebase-admin`) to send push notifications via FCM.

1. Frontend registers an FCM device token: `POST /notifications/fcm-token`.
2. Server-side events (new chat message, new lead, etc.) call `FcmService.send(...)` to push a notification to the registered token.
3. Users can list and mark notifications via the notifications REST endpoints.

Firebase service account credentials must be configured (typically via a `GOOGLE_APPLICATION_CREDENTIALS` environment variable pointing to the service account JSON, or by embedding the JSON in an environment variable).

---

## Internationalization (Locales)

The `LocalesModule` manages platform locale records seeded into the database. The `LocalesBootstrapService` seeds default locales on startup. Owners and admins can manage per-store and per-product translations.

Translation DTOs live in:
- `src/products/dto/upsert-product-translation.dto.ts`
- `src/store-settings/dto/upsert-store-translation.dto.ts`

---

## Audit Logging

Every significant administrative action is recorded by `AuditService` in the `audit_logs` table. Logs capture:

- `actorUserId` — the user who performed the action
- `entityType` — e.g. `USER`, `PRODUCT`, `CATEGORY`
- `entityId` — the affected record's UUID
- `action` — e.g. `UPDATE`, `DELETE`
- `changes` — JSON diff of before/after state
- `createdAt` — timestamp

Admins can query audit logs at `GET /admin/audit-logs` with optional filters `actorUserId` and `entityType`.

---

## Health Checks

| Endpoint | Returns | Purpose |
|---|---|---|
| `GET /health` | `{ status: "ok" }` | Kubernetes / load-balancer liveness probe |
| `GET /health/ready` | `{ status: "ok" }` or 503 | Readiness probe — verifies Prisma can reach the database |

Configure your container orchestrator to:
- Use `/health` as the **liveness** probe.
- Use `/health/ready` as the **readiness** probe, giving the pod time to establish a DB connection before receiving traffic.

---

## Testing
# 1. Install dependencies
npm install

# 2. Copy and edit environment file
cp .env.example .env
# Fill in your local PostgreSQL credentials, API keys, etc.

# 3. Generate Prisma client
npm run prisma:generate

# 4. Run database migrations
npm run prisma:migrate

# 5. (Optional) Seed the database
npm run db:seed

# 6. Start in watch mode
npm run start:dev
```

The API will be available at `http://localhost:4000`.  
Interactive Swagger docs: `http://localhost:4000/api/docs` (non-production only).

---

## Database & Migrations

| Command | Description |
|---|---|
| `npm run prisma:generate` | Regenerate the Prisma client after schema changes |
| `npm run prisma:migrate` | Apply pending migrations |
| `npm run prisma:studio` | Open Prisma Studio GUI at `http://localhost:5555` |
| `npm run db:seed` | Run `prisma/seed.ts` to seed initial data |

Schema lives at `prisma/schema.prisma`.

> In production, run `npx prisma migrate deploy` (not `migrate dev`) to apply migrations without generating new files.

---

## Running the Server

| Script | Description |
|---|---|
| `npm run start` | Start (no watch) |
| `npm run start:dev` | Start with file watcher (hot reload) |
| `npm run start:debug` | Start with debugger + file watcher |
| `npm run start:prod` | Run compiled output from `dist/` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run format` | Run Prettier across `src/` and `test/` |
| `npm run lint` | Run ESLint with auto-fix |

---

## API Reference

**Base URL:** `http://localhost:4000`

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Liveness — returns `{ status: "ok" }` |
| `GET` | `/health/ready` | Public | Readiness — verifies DB connectivity |

---

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register a business owner account |
| `POST` | `/auth/register-customer` | Public | Register a customer account |
| `POST` | `/auth/login` | Public | Login (any role) |
| `GET` | `/auth/me` | JWT | Return current user's profile |
| `POST` | `/auth/forgot-password` | Public | Trigger password-reset email via SendGrid |
| `POST` | `/auth/reset-password` | Public | Consume reset token and set new password |

**`POST /auth/register`** — JSON body

| Field | Type | Required |
|---|---|---|
| `fullName` | string | Yes |
| `email` | string (email) | Yes |
| `password` | string (min 8) | Yes |
| `businessName` | string | Yes |
| `phone` | string | No |

**`POST /auth/register-customer`** — JSON body: `fullName`, `email`, `password`

**`POST /auth/login`** — JSON body: `email`, `password`

Response shape (register / login):
```json
{
  "access_token": "<jwt>",
  "user": { "id": "...", "email": "...", "role": "OWNER" }
}
```

---

### Public Storefront

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/store/:slug` | Public | Full store payload (products, settings, branding) |
| `GET` | `/store/:slug/products/:productId` | Public | Single product on that store |
| `POST` | `/store/:slug/leads` | Public | Submit a contact lead |
| `POST` | `/store/:slug/view` | Public | Record a page or product view event |
| `POST` | `/store/:slug/share` | Public | Record a share event (e.g. WhatsApp) |

**`POST /store/:slug/leads`** — JSON body

| Field | Type | Required |
|---|---|---|
| `name` | string | Yes |
| `phone` | string (5–32 chars) | Yes |
| `message` | string | No |
| `productId` | UUID v4 | No |

---

### Categories

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/categories` | Public | List all product categories |

---

### Products (Owner)

All routes require **JWT** + role **`OWNER`**.

| Method | Path | Description |
|---|---|---|
| `POST` | `/products` | Create product (`multipart/form-data`) |
| `GET` | `/products` | List authenticated owner's products |
| `GET` | `/products/:id` | Get single product by UUID |
| `PATCH` | `/products/:id` | Update product fields (JSON) |
| `PATCH` | `/products/:id/image` | Replace product image (`multipart`: field `image`) |
| `DELETE` | `/products/:id` | Delete product |

**`POST /products`** — `multipart/form-data`

| Field | Type | Required |
|---|---|---|
| `image` | file | Yes |
| `name` | string | Yes |
| `price` | number | Yes |
| `descriptionRaw` | string | Yes |
| `sku` | string | No |
| `stockQuantity` | number | No |
| `lowStockThreshold` | number | No |
| `featured` | boolean | No |
| `categoryIds` | comma-separated UUIDs or JSON array string | No |
| `isPublished` | boolean | No |

---

### Store Settings (Owner)

Requires **JWT** + **`OWNER`**.

| Method | Path | Description |
|---|---|---|
| `GET` | `/store-settings` | Get store branding settings |
| `PATCH` | `/store-settings` | Update settings (all fields optional) |

**`PATCH /store-settings`** — JSON: `whatsAppPhone`, `bannerUrl`, `accentColor`, `tagline`, `showChatWidget`

---

### Chat — REST

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/chat/conversations/start` | Public* | Start a conversation |
| `GET` | `/chat/conversations` | JWT | List conversations |
| `GET` | `/chat/conversations/:id/messages` | Public* | Paginated messages |
| `POST` | `/chat/conversations/:id/messages` | Public* | Send a message |
| `PATCH` | `/chat/conversations/:id/archive` | JWT + **OWNER** | Archive conversation |

\* **Public*** = no JWT required for guests. Pass `guestToken` as a query param or body field for guest threads.

---

### Leads (Owner)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/leads` | JWT + **OWNER** | List all leads for authenticated owner's store |

---

### Analytics (Owner)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/analytics/overview` | JWT + **OWNER** | Dashboard metrics: total views, shares, leads; per-product breakdown |

---

### AI (Owner)

Stricter rate limit applies (default **20 requests / 60 s** per IP). All routes require **JWT** + **`OWNER`**.

| Method | Path | Description |
|---|---|---|
| `POST` | `/ai/improve-description` | Generate improved description + social caption via Gemini |
| `POST` | `/ai/suggest-sku` | Suggest SKU codes for a product |
| `POST` | `/ai/enhance-product-image` | AI-enhanced product image via Gemini Vision |
| `POST` | `/ai/localize-product` | Generate translated product content |
| `POST` | `/ai/suggest-inbox-replies` | Suggest quick-reply options for a chat thread |

---

### Notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/notifications/fcm-token` | JWT | Register an FCM push token |
| `GET` | `/notifications` | JWT | List notifications for the current user |
| `PATCH` | `/notifications/:id/read` | JWT | Mark a notification as read |

---

### Admin Console

All routes require **JWT** + role **`ADMIN`**.  
Pagination: `page` (≥ 1) and `limit` (1–100).

| Method | Path | Notes |
|---|---|---|
| `GET` | `/admin/users` | Query: `page`, `limit`, `role?`, `search?` |
| `GET` | `/admin/users/:id` | |
| `PATCH` | `/admin/users/:id` | Body: `role?`, `disabled?` |
| `GET` | `/admin/products` | Query: `page`, `limit`, `userId?`, `search?` |
| `GET` | `/admin/products/:id` | |
| `PATCH` | `/admin/products/:id` | Body: `name?`, `price?`, `isPublished?`, `featured?` |
| `DELETE` | `/admin/products/:id` | |
| `GET` | `/admin/metrics` | Platform-wide metrics including category stats |
| `GET` | `/admin/categories` | Per-category stats |
| `POST` | `/admin/categories` | Body: `name`, `slug?` |
| `GET` | `/admin/conversations` | Query: `page`, `limit` |
| `GET` | `/admin/conversations/:id/messages` | Query: `page`, `limit` |
| `GET` | `/admin/audit-logs` | Query: `page`, `limit`, `actorUserId?`, `entityType?` |

---

### OpenAPI (Swagger)

When `NODE_ENV` is not `production`, interactive API docs are available at:

```
http://localhost:4000/api/docs
```

---

## WebSocket (Socket.IO) Reference

**Namespace:** `/chat`

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:4000/chat", {
  auth: { token: "<jwt>" },   // omit for guest
  transports: ["websocket"],
});
```

### Client → Server Events

| Event | Payload | Description |
|---|---|---|
| `join` | `{ conversationId: string, guestToken?: string }` | Join a conversation room |
| `sendMessage` | `{ conversationId: string, body: string, guestToken?: string }` | Send a message |
| `typing` | `{ conversationId: string, typing: boolean }` | Broadcast typing indicator |

### Server → Client Events

| Event | Payload | Description |
|---|---|---|
| `message` | Message object | New message received |
| `typing` | `{ conversationId: string, typing: boolean }` | Typing indicator from another participant |

When `REDIS_URL` is set, the `RedisIoAdapter` is used automatically for horizontal Socket.IO scaling.

---

## Authentication & Authorization

### JWT Flow

1. Client calls `POST /auth/login` or `POST /auth/register` and receives `access_token`.
2. Client attaches the token: `Authorization: Bearer <access_token>`.
3. The global `JwtAuthGuard` validates the token and attaches the decoded payload to `request.user`.
4. The `RolesGuard` enforces `@Roles(Role.OWNER)` etc. at the handler level.

### Roles

| Role | Capabilities |
|---|---|
| `OWNER` | Manage own products, store settings, view leads & analytics, use AI tools |
| `CUSTOMER` | Access own chat conversations and profile |
| `ADMIN` | Full platform access — users, all products, categories, metrics, audit trail |

### Admin Bootstrap

On startup, `AdminBootstrapService` creates or resets the admin account from `ADMIN_BOOTSTRAP_EMAIL`. Set `ADMIN_SEED_RESET_PASSWORD=false` after the first boot to prevent the password from being reset on every restart.

---

## Rate Limiting

| Scope | Default | Env Override |
|---|---|---|
| Global | 120 requests / 60 s per IP | `THROTTLE_LIMIT` / `THROTTLE_TTL_MS` |
| `/ai/*` endpoints | 20 requests / 60 s per IP | `AI_THROTTLE_LIMIT` |

Clients exceeding the limit receive **HTTP 429 Too Many Requests**.

---

## File Uploads & Image Storage

### Cloudinary (production)

When Cloudinary credentials are set, all product images and store banners are uploaded to Cloudinary and served via CDN.

### Local Storage (development fallback)

If `USE_LOCAL_IMAGE_UPLOAD=true` or Cloudinary credentials are absent, files are stored in `uploads/` and served at `/files/`.

> **Do not use local storage in production.**

---

## AI Features

| Feature | Provider | Endpoint |
|---|---|---|
| Description improvement & caption | Google Gemini | `POST /ai/improve-description` |
| Product image enhancement | Google Gemini Vision | `POST /ai/enhance-product-image` |
| SKU suggestion | Gemini / OpenRouter | `POST /ai/suggest-sku` |
| Product localisation (translation) | Gemini | `POST /ai/localize-product` |
| Inbox reply suggestions | Gemini | `POST /ai/suggest-inbox-replies` |

AI input is sanitised via `sanitize-prompt.util.ts` before being forwarded to external providers to mitigate prompt injection. Provider fallback order: Gemini primary → OpenRouter secondary.

---

## Notifications (FCM)

1. Frontend registers an FCM device token: `POST /notifications/fcm-token`.
2. Server-side events (new chat message, new lead, etc.) trigger push notifications via `FcmService`.
3. Users can list and mark notifications via the notifications REST endpoints.

Firebase service account credentials must be configured via `GOOGLE_APPLICATION_CREDENTIALS` or an equivalent environment variable.

---

## Internationalization (Locales)

The `LocalesModule` manages platform locale records seeded on startup. Owners and admins can manage per-store and per-product translations via DTOs in `src/products/dto/` and `src/store-settings/dto/`.

---

## Audit Logging

Every significant administrative action is recorded in the `audit_logs` table.

| Field | Description |
|---|---|
| `actorUserId` | The user who performed the action |
| `entityType` | e.g. `USER`, `PRODUCT`, `CATEGORY` |
| `entityId` | Affected record's UUID |
| `action` | e.g. `UPDATE`, `DELETE` |
| `changes` | JSON diff of before/after state |
| `createdAt` | Timestamp |

Query audit logs at `GET /admin/audit-logs` with optional `actorUserId` and `entityType` filters.

---

## Health Checks

| Endpoint | Returns | Purpose |
|---|---|---|
| `GET /health` | `{ status: "ok" }` | Liveness probe |
| `GET /health/ready` | `{ status: "ok" }` or 503 | Readiness probe — verifies DB connectivity |

---

## Testing

```bash
# Unit tests (watches src/**/*.spec.ts)
npm test

# Unit tests in watch mode
npm run test:watch

# Coverage report
npm run test:cov

# End-to-end tests
npm run test:e2e
```

Unit test files live alongside their module files (`*.spec.ts`). E2E test configuration is at `test/jest-e2e.json`.

Coverage output is written to `coverage/`.

---

## Docker

A multi-stage `Dockerfile` is included for production images.

### Build
# Unit tests
npm test

# Unit tests in watch mode
npm run test:watch

# Coverage report
npm run test:cov

# End-to-end tests
npm run test:e2e
```

---

## Docker

### Build

```bash
docker build -t herbizreach-api:latest .
```

### Run

```bash
docker run -d \
  --name herbizreach-api \
  -p 4000:4000 \
  --env-file .env.production \
  herbizreach-api:latest
```

### Docker Compose (example)

```yaml
version: "3.9"
services:
  api:
    image: herbizreach-api:latest
    build: .
    ports:
      - "4000:4000"
    env_file: .env.production
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: herbizreach
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redissecret

volumes:
  pgdata:
```

The production image runs as a non-root user (`nestjs`, UID 1001) for improved container security.

---

## Production Deployment Checklist

- [ ] Set `NODE_ENV=production` (disables Swagger UI)
- [ ] Replace `JWT_SECRET` with a cryptographically random 32+ character secret
- [ ] Set `ADMIN_SEED_RESET_PASSWORD=false` after initial admin setup
- [ ] Configure `CORS_ORIGINS` to only include trusted frontend origins
- [ ] Provide real `CLOUDINARY_*` credentials — do not use local file storage
- [ ] Provide `SENDGRID_API_KEY` and verify sender domain / single sender in SendGrid
- [ ] Confirm `GEMINI_API_KEY` (and/or `OPENROUTER_API_KEY`) are set if AI features are needed
- [ ] Set `REDIS_URL` if running multiple API instances (required for Socket.IO consistency)
- [ ] Run `npx prisma migrate deploy` before starting the container (not `migrate dev`)
- [ ] Configure liveness (`/health`) and readiness (`/health/ready`) probes in Kubernetes / ECS
- [ ] Set resource limits on the container (recommended: ≥ 512 MB RAM, ≥ 0.5 vCPU)
- [ ] Enable structured logging and forward logs to your observability stack (Datadog, Grafana Loki, etc.)
- [ ] Set up an external secrets manager (AWS Secrets Manager, HashiCorp Vault) instead of `.env` files

---

## Security Hardening Notes

- **Helmet** is applied globally, hardening all HTTP response headers (X-Frame-Options, X-Content-Type-Options, etc.).
- **`whitelist: true` + `forbidNonWhitelisted: true`** on the global `ValidationPipe` strips and rejects any unknown body properties, preventing mass-assignment attacks.
- **CORS** is restricted to an explicit allow-list. Wildcard `*` should never be used in production.
- **Prisma exception filter** (`PrismaClientExceptionFilter`) prevents raw database error messages from leaking to clients.
- **Prompt sanitisation** (`sanitize-prompt.util.ts`) strips potential injection strings before forwarding user input to LLM APIs.
- **Rate limiting** protects against brute-force and denial-of-service on all endpoints; AI endpoints have a stricter quota.
- **bcryptjs** is used for password hashing — plain-text passwords are never persisted.
- **Non-root Docker user** (`nestjs`, UID 1001) limits container privilege escalation risk.

---

## Project Structure

```
backened/herbizreach/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Database seeder
│   └── migrations/            # Prisma migration history
├── src/
│   ├── admin/                 # Admin module (users, products, metrics, audit)
│   ├── ai/                    # AI module (Gemini, OpenRouter)
│   ├── analytics/             # Analytics module
│   ├── audit/                 # Audit log service
│   ├── auth/                  # Authentication & JWT strategy
│   │   ├── dto/               # Register, login, forgot/reset password DTOs
│   │   └── strategies/        # passport-jwt strategy
│   ├── categories/            # Product categories
│   ├── chat/                  # Chat REST + Socket.IO gateway
│   ├── cloudinary/            # Cloudinary upload service
│   ├── common/
│   │   ├── decorators/        # @Public(), @Roles(), @CurrentUser()
│   │   ├── filters/           # PrismaClientExceptionFilter
│   │   ├── guards/            # JwtAuthGuard, RolesGuard
│   │   └── utils/             # slug.util, sanitize-prompt.util
│   ├── config/                # Typed config factory + Joi env validation
│   ├── health/                # Liveness & readiness endpoints
│   ├── leads/                 # Lead inbox for owners
│   ├── locales/               # Platform locale management
│   ├── mail/                  # SendGrid email service
│   ├── notifications/         # FCM push notifications
│   ├── prisma/                # Global Prisma module & service
│   ├── products/              # Product CRUD + image upload
│   ├── store/                 # Public storefront + event tracking
│   ├── store-settings/        # Store branding settings
│   ├── users/                 # User query/update service
│   ├── app.module.ts          # Root application module
│   ├── main.ts                # Bootstrap (CORS, Swagger, Helmet, pipes)
│   └── redis-io.adapter.ts    # Redis Socket.IO adapter
├── test/
│   └── jest-e2e.json
├── .env                       # Local environment (not committed)
├── .dockerignore
├── Dockerfile                 # Multi-stage production image
├── FRONTEND_API.md            # Frontend integration quick-reference
├── nest-cli.json
├── package.json
├── tsconfig.json
└── tsconfig.seed.json         # TypeScript config for Prisma seed script
```

---

*HerBizReach API — Women in Tech Hackathon 2026*

docker run -d \
  --name herbizreach-api \
  -p 4000:4000 \
  --env-file .env.production \
  herbizreach-api:latest
```

### Docker Compose (example)

```yaml
version: "3.9"
services:
  api:
    image: herbizreach-api:latest
    build: .
    ports:
      - "4000:4000"
    env_file: .env.production
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: herbizreach
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redissecret

volumes:
  pgdata:
```

The production image runs as a non-root user (`nestjs`, UID 1001) for improved container security.

---

## Production Deployment Checklist

- [ ] Set `NODE_ENV=production` (disables Swagger UI)
- [ ] Replace `JWT_SECRET` with a cryptographically random 32+ character secret
- [ ] Set `ADMIN_SEED_RESET_PASSWORD=false` after initial admin setup
- [ ] Configure `CORS_ORIGINS` to only include trusted frontend origins
- [ ] Provide real Cloudinary credentials — do not use local file storage
- [ ] Provide `SENDGRID_API_KEY` and verify sender domain in SendGrid
- [ ] Confirm `GEMINI_API_KEY` (and/or `OPENROUTER_API_KEY`) are set if AI features are needed
- [ ] Set `REDIS_URL` if running multiple API instances (required for Socket.IO consistency)
- [ ] Run `npx prisma migrate deploy` before starting the container (not `migrate dev`)
- [ ] Configure liveness (`/health`) and readiness (`/health/ready`) probes in Kubernetes / ECS
- [ ] Set resource limits on the container (recommended: ≥ 512 MB RAM, ≥ 0.5 vCPU)
- [ ] Enable structured logging and forward to your observability stack
- [ ] Use a secrets manager (AWS Secrets Manager, HashiCorp Vault) instead of `.env` files in production

---

## Security Hardening Notes

- **Helmet** is applied globally, hardening all HTTP response headers.
- **`whitelist: true` + `forbidNonWhitelisted: true`** on the global `ValidationPipe` prevents mass-assignment attacks.
- **CORS** is restricted to an explicit allow-list — wildcard `*` should never be used in production.
- **Prisma exception filter** prevents raw database error messages from leaking to clients.
- **Prompt sanitisation** strips potential injection strings before forwarding user input to LLM APIs.
- **Rate limiting** protects all endpoints; AI endpoints have a stricter quota.
- **bcryptjs** is used for password hashing — plain-text passwords are never persisted.
- **Non-root Docker user** (`nestjs`, UID 1001) limits container privilege escalation risk.

---

## Project Structure

```
backened/herbizreach/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Database seeder
│   └── migrations/            # Prisma migration history
├── src/
│   ├── admin/                 # Admin module (users, products, metrics, audit)
│   ├── ai/                    # AI module (Gemini, OpenRouter)
│   ├── analytics/             # Analytics module
│   ├── audit/                 # Audit log service
│   ├── auth/                  # Authentication & JWT strategy
│   │   ├── dto/               # Register, login, forgot/reset password DTOs
│   │   └── strategies/        # passport-jwt strategy
│   ├── categories/            # Product categories
│   ├── chat/                  # Chat REST + Socket.IO gateway
│   ├── cloudinary/            # Cloudinary upload service
│   ├── common/
│   │   ├── decorators/        # @Public(), @Roles(), @CurrentUser()
│   │   ├── filters/           # PrismaClientExceptionFilter
│   │   ├── guards/            # JwtAuthGuard, RolesGuard
│   │   └── utils/             # slug.util, sanitize-prompt.util
│   ├── config/                # Typed config factory + Joi env validation
│   ├── health/                # Liveness & readiness endpoints
│   ├── leads/                 # Lead inbox for owners
│   ├── locales/               # Platform locale management
│   ├── mail/                  # SendGrid email service
│   ├── notifications/         # FCM push notifications
│   ├── prisma/                # Global Prisma module & service
│   ├── products/              # Product CRUD + image upload
│   ├── store/                 # Public storefront + event tracking
│   ├── store-settings/        # Store branding settings
│   ├── users/                 # User query/update service
│   ├── app.module.ts          # Root application module
│   ├── main.ts                # Bootstrap (CORS, Swagger, Helmet, pipes)
│   └── redis-io.adapter.ts    # Redis Socket.IO adapter
├── test/
│   └── jest-e2e.json
├── .env.example               # Environment variable reference (no secrets)
├── .dockerignore
├── Dockerfile                 # Multi-stage production image
├── FRONTEND_API.md            # Frontend integration quick-reference
├── nest-cli.json
├── package.json
├── tsconfig.json
└── tsconfig.seed.json         # TypeScript config for Prisma seed script
```

---

*HerBizReach API — Women in Tech Hackathon 2026*
