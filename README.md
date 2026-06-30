# SEAPEDIA Backend

Multi-role seafood marketplace backend built with NestJS, Prisma, PostgreSQL, and JWT authentication.

## Overview

SEAPEDIA backend is a NestJS REST API for a multi-role seafood marketplace. It serves a separate frontend application and handles all business logic, data persistence, file storage, and authorization.

**Roles:**
- **Admin** — system monitoring, user management, discounts, time simulation, overdue refunds
- **Buyer** — wallet, addresses, cart, checkout, orders, spending reports
- **Seller** — store management, product CRUD (with image upload), order processing, income reports
- **Driver** — delivery job discovery, pickup, completion, earnings

**Domains:**
- Authentication & role management
- Public product catalog & reviews
- Seller store & product management (with Supabase image upload)
- Buyer wallet, cart, checkout & orders
- Voucher & promo discounts
- Driver delivery workflow
- Admin dashboard, system time simulation, overdue refunds

## Tech Stack

- **Framework:** NestJS 11
- **ORM:** Prisma 7 (with generated client at `prisma/generated/`)
- **Database:** PostgreSQL via `pg` driver
- **Authentication:** JWT (24h expiry) + Passport + Passport JWT
- **Password Hashing:** bcrypt (10 rounds)
- **Validation:** `class-validator` + `class-transformer` (global `ValidationPipe` with `whitelist: true`)
- **API Docs:** Swagger/OpenAPI via `@nestjs/swagger`
- **Security:** Helmet, Rate Limiting (`@nestjs/throttler`: 100 req/min global, 10 req/min on auth)
- **File Storage:** Supabase Storage (`@supabase/supabase-js`)
- **Config:** `@nestjs/config` (loads `.env`)
- **Other:** `reflect-metadata`, `rxjs`

## Requirements

- **Node.js** >= 18
- **npm** (comes with Node.js)
- **PostgreSQL** database (local or remote)
- **Supabase project** with a **public storage bucket** — required only if you need product image uploads. The API runs without it but image features will fail.

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. All variables are required unless noted as optional.

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/seapedia?schema=public` |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens. Generate a secure random string (e.g. `openssl rand -hex 32`). The app will **fail to start** if missing. | `a1b2c3d4e5f6...` (64 hex chars) |
| `PORT` | No (default 3000) | Port the server listens on | `3000` |
| `FRONTEND_URL` | Yes | Allowed CORS origin. Must match the deployed frontend URL exactly. | `http://localhost:5173` |
| `SUPABASE_URL` | Only for image upload | Your Supabase project URL | `https://your-project-id.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Only for image upload | Supabase service role key (not anon key) — required for server-side storage operations | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_STORAGE_BUCKET` | No (default `products`) | Name of the Supabase Storage bucket for product and profile images | `products` |

> **Important:** `JWT_SECRET` is mandatory. The app throws a clear error on startup if missing.
> **Supabase:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are only needed for image upload (product + profile photos). Other API features work without them.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create environment file and edit with your values
cp .env.example .env

# 3. Generate Prisma client
npx prisma generate

# 4. Push schema to your PostgreSQL database (creates tables)
npx prisma db push

# 5. Seed the database with demo data
npm run db:seed

# 6. Start the development server (hot reload)
npm run start:dev
```

- **API base URL:** `http://localhost:3000/api`
- **Swagger docs:** `http://localhost:3000/api/docs`

## Prisma / Database Setup

```bash
# Generate the Prisma client (required after every schema change)
npx prisma generate

# Push schema to database (creates/updates tables directly — fast for development)
npx prisma db push

# Alternative: use migrations (prisma/migrations/ already exists)
npx prisma migrate dev

# Seed the database with demo accounts, products, discounts
npm run db:seed

# Open Prisma Studio to browse data visually
npm run db:studio
```

**User model schema note:** The `User` model includes `profileImageUrl` (optional, `String?`) mapped to the `profile_image_url` database column. After pulling the latest schema changes, update your database:

- **Local/dev with push:** `npx prisma db push`
- **Local/dev with migration:** `npx prisma migrate dev`
- **Production:** `npx prisma migrate deploy`

If no migration file exists for `profile_image_url`, use `npx prisma db push` for demo/dev, or create a migration (`npx prisma migrate dev --name add-profile-image-url`) before production deployment.

**Reset local database:** Drop the database (or truncate all tables), then run `npx prisma db push` and `npm run db:seed` again. There is no dedicated reset script.

Seed files are at `prisma/seed.ts`.

## Demo Accounts

Created by `npm run db:seed`. All use password `password123`.

| Account | Username | Password | Role(s) | Notes |
|---------|----------|----------|---------|-------|
| Admin | `admin` | `password123` | Admin | Full system access |
| Seller 1 | `tokoindah` | `password123` | Seller | Store: Toko Indah (3 products) |
| Seller 2 | `elektronikku` | `password123` | Seller | Store: Elektronikku (4 products) |
| Buyer | `pembeli` | `password123` | Buyer | Wallet: Rp 1.000.000, has address |
| Driver | `supir` | `password123` | Driver | No active jobs initially |
| Multi-role | `multiuser` | `password123` | Seller + Buyer | Wallet: Rp 500.000, has address, store: Multi Store (2 products) |

**Additional seed data:**
- Buyer wallets: Rp 1.000.000 (pembeli), Rp 500.000 (multiuser)
- Sample reviews (4 reviews from guest users)
- Vouchers: `DISKON10` (10% off, max Rp 50k), `HEMAT25RB` (fixed Rp 25k off), `EXPIRED` (already expired)
- Promos: `CASHBACK15RB` (fixed Rp 15k), `PROMO5PERSEN` (5% off)
- System time: `2026-01-01T00:00:00Z` (simulated, not real clock)

## Available Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run start:dev` | `nest start --watch` | Development server with hot reload |
| `npm run build` | `nest build` | Compile TypeScript to `dist/` |
| `npm run start:prod` | `node dist/main` | Run compiled production build |
| `npm start` | `nest start` | Start without watch |
| `npm run lint` | `eslint ".../*.ts" --fix` | Lint and auto-fix TypeScript files |
| `npm test` | `jest` | Run Jest test suite |
| `npm run db:generate` | `prisma generate` | Generate Prisma client |
| `npm run db:push` | `prisma db push` | Push schema to DB |
| `npm run db:migrate` | `prisma migrate dev` | Run database migrations |
| `npm run db:seed` | `ts-node prisma/seed.ts` | Seed database with demo data |
| `npm run db:studio` | `prisma studio` | Open Prisma Studio GUI |

## API Documentation

Interactive Swagger/OpenAPI docs are available at:

```
http://localhost:3000/api/docs
```

- Requires the backend server to be running.
- Protected endpoints require a **Bearer token**. Use the `/api/auth/login` endpoint or Swagger's "Authorize" button to set the token.
- The docs are generated from `@nestjs/swagger` decorators and reflect the actual request/response schemas.
- For full endpoint details, use Swagger — this README only describes high-level flows.

## CORS and Frontend Connection

CORS is configured in `src/main.ts`:

```ts
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});
```

- `FRONTEND_URL` in `.env` controls which origin is allowed.
- For local development, set `FRONTEND_URL=http://localhost:5173` (the default Vite port).
- In production, `FRONTEND_URL` must match the deployed frontend origin exactly.
- The frontend's `VITE_API_BASE_URL` should point to the backend API base URL (e.g. `http://localhost:3000/api` locally).

## Profile Management

The authenticated user can view and edit their profile.

**View profile**
- `GET /api/auth/me` (authenticated) — returns current user with roles and active role

**Edit profile**
- `PATCH /api/auth/profile` (authenticated) — JSON body
- Editable fields: `fullName`, `phone` (both optional; at least one required)
- Validation: `fullName` (string, 2–100 chars), `phone` (Indonesian phone format)
- Returns the same safe profile response format as `GET /api/auth/me`

**Profile photo**
- `PATCH /api/auth/profile-photo` (authenticated) — `multipart/form-data`, field `photo`
- Accepted types: `image/jpeg`, `image/png`, `image/webp`; max 5 MB
- Uploads to Supabase Storage and updates `profileImageUrl`

**User response `profileImageUrl`** is included in the response of all auth endpoints:
```
GET /api/auth/me
PATCH /api/auth/profile
PATCH /api/auth/profile-photo
POST /api/auth/register
POST /api/auth/login
POST /api/auth/select-role
POST /api/auth/roles
```

## Image Upload / Supabase Notes

Images are stored in **Supabase Storage**, not on the local filesystem.

**Product images**
- Create product: image **required** via `multipart/form-data` field `image`
- Update product: image optional; replaces existing if provided
- Accepted types: `image/jpeg`, `image/png`, `image/webp`
- Max file size: 5 MB
- Object path: `products/seller-<sellerId>/product-<timestamp>-<random>.<ext>`
- The bucket **must be public** for `getPublicUrl()` to return accessible URLs.
- Soft-deleted product images are **not** automatically deleted.
- Database stores both `imageUrl` (public display URL) and `imagePath` (internal storage path).

**Profile photos**
- Upload/replace: `PATCH /api/auth/profile-photo` (authenticated)
- Request format: `multipart/form-data` with field name `photo`
- Accepted types: `image/jpeg`, `image/png`, `image/webp`
- Max file size: 5 MB
- Storage path: `profile-photos/user-<userId>/<timestamp>-<random>.<ext>`
- Uses the same `SUPABASE_STORAGE_BUCKET` as product images.
- Old profile photos are **not** automatically deleted on re-upload.
- The bucket must be public for `getPublicUrl()` to return accessible URLs.
- User response includes `profileImageUrl` (nullable string).

**If Supabase is not configured,** upload endpoints return a 500 error. Other API features (auth, product catalog, checkout, etc.) continue to work.

## CI / Automated Checks

A backend CI workflow is defined in `.github/workflows/backend-ci.yml`. It runs on push and pull request to `main` and `dev` branches:

- **`npm ci`** — clean install dependencies
- **`npx prisma generate`** — generate Prisma client
- **`npm run build`** — compile TypeScript

CI does **not** deploy and does **not** run database migrations.

## Production Build / Deployment

1. Set all environment variables on your hosting provider (see [Environment Variables](#environment-variables) above).
2. Ensure `DATABASE_URL` points to your production PostgreSQL database.
3. Run Prisma setup:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```
4. (Optional) Seed demo data — skip for production unless needed.
5. Build and start:
   ```bash
   npm ci && npx prisma generate && npm run build
   npm run start:prod
   ```
   > **Important:** Use `npm run start:prod` (runs `node dist/main`) for production. Do **not** use `nest start` — it loads dev dependencies.

6. Configure `FRONTEND_URL` to match your deployed frontend origin.
7. Configure `JWT_SECRET` with a strong random secret.
8. Configure Supabase env vars if image upload is needed.
9. Verify the API responds at `https://your-domain.com/api` and Swagger at `/api/docs`.

**Zeabur / VPS notes:**
- Ensure memory is at least **512 MB** (1 GB recommended for NestJS + Prisma).
- Run database migration (**`npx prisma migrate deploy`** or **`npx prisma db push`**) before testing profile photo upload.
- `FRONTEND_URL` must match the deployed frontend origin exactly for CORS.
- The frontend's `VITE_API_BASE_URL` must point to the backend's `/api` base URL.

## Manual Demo Flow

Walk through these steps after running `npm run start:dev`:

**Guest (no auth)**
- Browse active products: `GET /api/products`
- View product detail: `GET /api/products/:id`
- Read reviews: `GET /api/reviews`
- View store info: `GET /api/stores/:id`
- List active vouchers/promos: `GET /api/discounts/vouchers`, `GET /api/discounts/promos`

**Authentication**
- Register a new user: `POST /api/auth/register` (roles: `["Seller"]`, `["Buyer"]`, `["Driver"]`, or `["Seller", "Buyer"]` for multi-role — Admin role is auto-assigned, not registerable)
- Login: `POST /api/auth/login` with `username` and `password`
- Multi-role users can switch active role: `POST /api/auth/select-role`
- View profile: `GET /api/auth/me`

**Buyer flow**

Login as `pembeli` / `password123`.
1. Check wallet balance: `GET /api/wallet`
2. Top up wallet: `POST /api/wallet/top-up`
3. Manage addresses: `GET/POST/PATCH/DELETE /api/addresses`
4. Browse products: `GET /api/products`
5. Add to cart: `POST /api/cart/items`
6. View cart: `GET /api/cart`
7. Validate a discount code: `GET /api/discounts/validate?code=DISKON10&subtotal=200000`
8. Checkout: `POST /api/checkout` (uses wallet balance)
9. View orders: `GET /api/orders`
10. View spending report: `GET /api/buyer/reports/spending`
    - Returns: `totalSpending`, `totalOrders`, `averageOrderValue`, `monthlyTrend`, `spendingByStore`, `spendingByDeliveryMethod`, `spendingByStatus`, `topProducts`, `exportRows`

**Seller flow**

Login as `tokoindah` / `password123`.
1. Create or view store: `POST` or `GET /api/seller/store`
2. List own products: `GET /api/seller/products`
3. Create product (with image): `POST /api/seller/products` (multipart/form-data)
4. View store orders: `GET /api/seller/orders`
5. Process an order: `POST /api/seller/orders/:id/process`
6. View income report: `GET /api/seller/reports/income`
    - Returns: `totalIncome`, `totalOrders`, `averageIncomePerOrder`, `monthlyTrend`, `incomeByProduct`, `incomeByStatus`, `incomeByDeliveryMethod`, `exportRows`
7. View dashboard: `GET /api/seller/dashboard`

**Driver flow**

Login as `supir` / `password123`.
1. Browse available jobs: `GET /api/driver/jobs` (orders processed by seller become available)
2. Take a job: `POST /api/driver/jobs/:id/take`
3. Complete delivery: `POST /api/driver/jobs/:id/complete`
4. View delivery history: `GET /api/driver/history`
5. View earnings: `GET /api/driver/earnings`
    - Returns: `totalEarnings`, `totalCompletedJobs`, `averageEarningPerJob`, `monthlyTrend`, `earningsByDeliveryMethod`, `earningsByStatus`, `exportRows`

**Admin flow**

Login as `admin` / `password123`.
1. View dashboard summary: `GET /api/admin/summary`
2. List users/stores/products/orders: admin management endpoints
3. View overdue orders: `GET /api/admin/overdue-orders`
4. Create vouchers & promos: `POST /api/admin/vouchers`, `POST /api/admin/promos`
5. Simulate next day (for testing overdue refunds): `POST /api/admin/system-time/simulate-next-day`
6. Refund an order: `POST /api/admin/orders/:id/refund`
7. Bulk refund overdue orders: `POST /api/admin/overdue-orders/refund-all`

## Security

- **SQL Injection:** Prevented by Prisma ORM parameterized queries (no raw SQL).
- **XSS:** User-generated content (reviews, store/product names/descriptions, full names) is sanitized via HTML entity escaping.
- **Validation:** Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`.
- **JWT:** 24-hour expiry; secret loaded from `JWT_SECRET` env var (server fails on missing secret).
- **RBAC:** Global `JwtAuthGuard` + `RolesGuard` with `@ActiveRoles()` decorator; single-role users auto-select on login.
- **Ownership:** All resource access is validated against the authenticated user's ownership.
- **Rate Limiting:** 10 req/min on auth endpoints (login, register); 100 req/min global.
- **HTTP Headers:** Helmet middleware sets standard security headers (`X-Content-Type-Options`, `X-Frame-Options`, etc.).
- **CORS:** Confined to the origin set in `FRONTEND_URL` env var.
- **Registration:** Admin role cannot be self-assigned during registration.

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|--------------|-----|
| `PrismaClientInitializationError` | Prisma client not generated | Run `npx prisma generate` |
| `Can't reach database server` | `DATABASE_URL` invalid or PostgreSQL not running | Verify connection string and that PostgreSQL is running |
| `JWT_SECRET is required` | Missing or empty `JWT_SECRET` in `.env` | Set a secure random string in `.env` |
| `CORS error` in browser | `FRONTEND_URL` does not match the frontend origin | Set `FRONTEND_URL` to the exact URL serving the frontend |
| `Supabase Storage not configured` error | Missing `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` | Set Supabase env vars or skip image upload features |
| No data or empty lists | Database not seeded | Run `npm run db:seed` |
| `EADDRINUSE :::3000` | Port 3000 already in use | Kill the other process or change `PORT` in `.env` |
| Auth returns 401 | Wrong credentials or expired token | Use demo credentials from the table above or re-login for a fresh token |
