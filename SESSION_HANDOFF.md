# SESSION HANDOFF — SEAPEDIA Backend

## Current Backend Status

**All levels (1-7) are complete.** The backend is ready for submission.

- `npx tsc --noEmit` — passes
- `npx nest build` — passes
- Database is seeded with all Level 4 data

## Completed Levels

| Level | Status | Endpoints |
|---|---|---|
| Level 1 | ✅ Complete | Auth (5), Public Catalog (3), Reviews (2) |
| Level 2 | ✅ Complete | Seller Store (3), Seller Products (5), Dashboard (1) |
| Level 3 | ✅ Complete | Wallet (3), Addresses (5), Cart (5), Checkout (1), Buyer Orders (2), Seller Orders (2) |
| Level 4 | ✅ Complete | Discounts (5), Checkout Update, Seller Process Order (1), Reports (2) |
| Level 5 | ✅ Complete | Driver Jobs (2), Driver Take/Complete (2), Driver History (1), Driver Earnings (1) |
| Level 6 | ✅ Complete | Admin Monitoring (9), System Time (2), Refund (2) |
| Level 7 | ✅ Complete | Security Hardening (Helmet, Rate Limiting, XSS, JWT Safety, DTO Validation, README) |

**Total endpoints: 56**

## Architecture

- **Framework:** NestJS 10.3
- **ORM:** Prisma 5.7 with PostgreSQL
- **Auth:** JWT + Passport, 24h expiry
- **Validation:** class-validator + class-transformer
- **API Docs:** Swagger at `/api/docs`
- **Global prefix:** `/api`
- **Security:** Helmet, Rate Limiting (@nestjs/throttler), XSS sanitization

### Key Patterns
- Global `ThrottlerGuard` + `JwtAuthGuard` + `RolesGuard` via `APP_GUARD`
- `@Public()` decorator for unauthenticated endpoints
- `@Throttle()` decorator for auth-specific rate limiting (10 req/min)
- `@ActiveRoles('Buyer')` / `@ActiveRoles('Seller')` / `@ActiveRoles('Driver')` / `@ActiveRoles('Admin')` for role-based access
- Ownership checks via `ensureOwnership()` in services
- Prisma transactions for multi-step operations
- `SystemTimeService` for business timestamps (getCurrentTime, setCurrentTime, nextDay)
- Centralized discount validation in `DiscountsService`
- Shared `sanitizeHtml()` utility for XSS prevention

## Existing Modules

| Module | Location | Purpose |
|---|---|---|
| PrismaModule | `src/prisma/` | Global DB client |
| AuthModule | `src/auth/` | Register, login, JWT, role selection |
| ProductsModule | `src/products/` | Public product catalog |
| StoresModule | `src/stores/` | Public store detail |
| ReviewsModule | `src/reviews/` | Application reviews |
| SellerModule | `src/seller/` | Seller store, product, order management |
| SystemTimeModule | `src/system-time/` | Business time from SystemSetting |
| WalletModule | `src/wallet/` | Buyer wallet + top-up |
| AddressesModule | `src/addresses/` | Buyer address CRUD |
| CartModule | `src/cart/` | Buyer cart with single-store enforcement |
| CheckoutModule | `src/checkout/` | Transactional checkout with discount integration |
| OrdersModule | `src/orders/` | Buyer order list/detail |
| DiscountsModule | `src/discounts/` | Voucher/Promo CRUD and validation |
| ReportsModule | `src/reports/` | Buyer spending + Seller income reports |
| DriverModule | `src/driver/` | Driver delivery workflow (jobs, take, complete, history, earnings) |
| AdminModule | `src/admin/` | Admin monitoring, system time simulation, overdue/refund handling |

## Prisma Schema

- 19 models, 8 enums
- All money fields use `Decimal(12, 2)`
- Product soft delete via `deletedAt`
- SystemSetting singleton for business time
- Voucher and Promo models with discount fields
- Order.voucherId, Order.promoId, Order.discountAmount

## Seed Data

| Account | Username | Password | Role(s) |
|---|---|---|---|
| Admin | admin | password123 | Admin |
| Seller 1 | tokoindah | password123 | Seller |
| Seller 2 | elektronikku | password123 | Seller |
| Buyer | pembeli | password123 | Buyer |
| Driver | supir | password123 | Driver |
| Multi | multiuser | password123 | Seller + Buyer |

- Buyer wallet: Rp 1.000.000
- Multi wallet: Rp 500.000
- Addresses for buyer and multiuser
- SystemSetting: 2026-01-01T00:00:00Z
- Vouchers: DISKON10 (10%, max 50k, min 100k), HEMAT25RB (fixed 25k, min 150k), EXPIRED (expired)
- Promos: CASHBACK15RB (fixed 15k, min 100k), PROMO5PERSEN (5%)

## Level 7 Implementation Summary

### Security Hardening Applied

| Security Measure | Implementation |
|---|---|
| HTTP Security Headers | Helmet middleware in `main.ts` |
| Rate Limiting | @nestjs/throttler: 10 req/min on login/register, 100 req/min global |
| JWT Secret Safety | Required from env, no hardcoded fallback, clear error if missing |
| XSS Sanitization | Shared `sanitizeHtml()` utility applied to review comments, reviewer names, store names/descriptions, product names/descriptions, user full names |
| Input Validation | Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true` |
| SQL Injection | Prevented by Prisma ORM (no raw SQL) |
| RBAC | Global `JwtAuthGuard` + `RolesGuard` with `@ActiveRoles()` decorator |
| Ownership Checks | All resource access validated against authenticated user |

### New Files Created
| File | Purpose |
|---|---|
| `src/common/utils/sanitize-html.ts` | Shared HTML entity escaping utility |

### Modified Files
| File | Changes |
|---|---|
| `src/main.ts` | Added Helmet middleware |
| `src/app.module.ts` | Added ThrottlerModule + ThrottlerGuard |
| `src/auth/auth.module.ts` | Removed hardcoded JWT fallback, require env var |
| `src/auth/auth.controller.ts` | Added @Throttle on login/register |
| `src/auth/jwt.strategy.ts` | Removed hardcoded JWT fallback, require env var |
| `src/auth/auth.service.ts` | Added sanitizeHtml for fullName on register |
| `src/auth/dto/select-role.dto.ts` | Added @IsIn(['Seller', 'Buyer', 'Driver']) |
| `src/reviews/reviews.service.ts` | Use shared sanitizeHtml, sanitize reviewerName |
| `src/seller/seller.service.ts` | Added sanitizeHtml for store/product names and descriptions |
| `src/seller/dto/create-store.dto.ts` | Removed no-op @MinLength(0) |
| `src/seller/dto/update-store.dto.ts` | Removed no-op @MinLength(0) |
| `src/discounts/discounts.controller.ts` | Use ValidateDiscountDto for query validation |
| `src/discounts/dto/validate-discount.dto.ts` | Added @IsNotEmpty, @MaxLength, @Type |
| `src/discounts/dto/create-voucher.dto.ts` | Added @IsNotEmpty, @MaxLength on name/code/description |
| `src/discounts/dto/create-promo.dto.ts` | Added @IsNotEmpty, @MaxLength on name/code/description |
| `README.md` | Full rewrite with documentation |
| `PROGRESS.md` | Updated with Level 7 status |
| `TASKS.md` | Added Level 7 task checklist |

### Packages Installed
| Package | Version | Purpose |
|---|---|---|
| `helmet` | ^8.2.0 | HTTP security headers |
| `@nestjs/throttler` | ^6.5.0 | Rate limiting |

## Known Risks (Non-blocking)

1. **Cart store lock race condition** — concurrent adds to empty cart could set different storeIds. Acceptable for Level 3.
2. **Wallet balance race condition** — concurrent checkouts could both pass balance check and both deduct. Acceptable for Level 3.
3. **Order number collision** — `Math.random()` has low entropy. Very unlikely, caught by unique constraint.
4. **Voucher remainingUsage race condition** — concurrent checkouts with same voucher could both pass remainingUsage check. Acceptable for Level 4.
5. **Driver job take race condition** — two drivers could simultaneously call take on same job. Mitigated by conditional `updateMany` with `status=AVAILABLE AND driverId=null`. Only one will succeed. Acceptable for Level 5.
6. **Concurrent refund calls** — two admin calls simultaneously on same order could both pass validation. Mitigated by unique constraint on `Refund.orderId` — second insert fails with P2002, caught as ConflictException. Acceptable for Level 6.

## Key Files to Reference

- `PRD_BACKEND.md` — full PRD with all levels
- `DECISIONS.md` — architectural decisions
- `PROGRESS.md` — completion status
- `TASKS.md` — detailed task checklists
- `prisma/schema.prisma` — database schema
- `prisma/seed.ts` — seed data
- `README.md` — full project documentation
