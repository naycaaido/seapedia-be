# SESSION HANDOFF — SEAPEDIA Backend

## Current Backend Status

**Levels 1, 2, 3, 4, and 5 are complete.** The backend is ready for Level 6.

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

**Total endpoints: 43**

## Architecture

- **Framework:** NestJS 10.3
- **ORM:** Prisma 5.7 with PostgreSQL
- **Auth:** JWT + Passport, 24h expiry
- **Validation:** class-validator + class-transformer
- **API Docs:** Swagger at `/api/docs`
- **Global prefix:** `/api`

### Key Patterns
- Global `JwtAuthGuard` + `RolesGuard` via `APP_GUARD`
- `@Public()` decorator for unauthenticated endpoints
- `@ActiveRoles('Buyer')` / `@ActiveRoles('Seller')` / `@ActiveRoles('Driver')` for role-based access
- Ownership checks via `ensureOwnership()` in services
- Prisma transactions for multi-step operations
- `SystemTimeService` for business timestamps
- Centralized discount validation in `DiscountsService`
- Conditional `updateMany` to prevent race conditions on job take

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

## Known Risks (Non-blocking)

1. **Cart store lock race condition** — concurrent adds to empty cart could set different storeIds. Acceptable for Level 3.
2. **Wallet balance race condition** — concurrent checkouts could both pass balance check and both deduct. Acceptable for Level 3.
3. **Order number collision** — `Math.random()` has low entropy. Very unlikely, caught by unique constraint.
4. **Voucher remainingUsage race condition** — concurrent checkouts with same voucher could both pass remainingUsage check. Acceptable for Level 4.
5. **Driver job take race condition** — two drivers could simultaneously call take on same job. Mitigated by conditional `updateMany` with `status=AVAILABLE AND driverId=null`. Only one will succeed. Acceptable for Level 5.

## Level 4 Implementation Summary

### New Files Created
| File | Purpose |
|---|---|
| `src/discounts/discounts.module.ts` | Discounts module definition |
| `src/discounts/discounts.controller.ts` | Voucher/Promo CRUD + validation endpoints |
| `src/discounts/discounts.service.ts` | Centralized discount validation and computation |
| `src/discounts/dto/create-voucher.dto.ts` | Admin create voucher DTO |
| `src/discounts/dto/create-promo.dto.ts` | Admin create promo DTO |
| `src/discounts/dto/validate-discount.dto.ts` | Validate discount code DTO |
| `src/reports/reports.module.ts` | Reports module definition |
| `src/reports/reports.controller.ts` | Buyer spending + Seller income report endpoints |
| `src/reports/reports.service.ts` | Report query logic |

### Modified Files
| File | Changes |
|---|---|
| `src/app.module.ts` | Import DiscountsModule, ReportsModule |
| `src/checkout/dto/checkout.dto.ts` | Add optional voucherCode/promoCode with mutual exclusion validator |
| `src/checkout/checkout.module.ts` | Import DiscountsModule |
| `src/checkout/checkout.service.ts` | Use DiscountsService for discount validation, record voucherId/promoId, decrement remainingUsage |
| `src/seller/seller.service.ts` | Add SystemTimeService, add processOrder() method |
| `src/seller/seller.controller.ts` | Add POST /seller/orders/:id/process endpoint |
| `prisma/seed.ts` | Add DiscountType import, seed vouchers and promos |

### Business Rules Enforced
- Voucher and Promo cannot be combined in one checkout
- Expired voucher/promo cannot be used
- Voucher with zero remaining usage cannot be used
- Percentage discount capped at maxDiscountAmount
- Discount amount cannot exceed subtotal
- Minimum purchase amount enforced
- Discount validation uses SystemTimeService
- Seller can only process orders from own store
- Only SEDANG_DIKEMAS orders can be processed
- Buyer spending excludes returned orders (status != DIKEMBALIKAN)
- Seller income report returns 0 until Level 5 creates SellerIncome records

## Level 5 Implementation Summary

### New Files Created
| File | Purpose |
|---|---|
| `src/driver/driver.module.ts` | Driver module definition |
| `src/driver/driver.controller.ts` | Driver REST endpoints (6 endpoints) |
| `src/driver/driver.service.ts` | Driver business logic (jobs, take, complete, history, earnings) |

### Modified Files
| File | Changes |
|---|---|
| `src/app.module.ts` | Import DriverModule |
| `src/seller/seller.service.ts` | Add SystemTimeService injection, create DeliveryJob in processOrder transaction |

### Business Rules Enforced
- DeliveryJob created when seller processes order (Option A, inside transaction)
- Driver only sees AVAILABLE jobs with order status MENUNGGU_PENGIRIM
- Driver only sees AVAILABLE job detail (not taken jobs)
- Conditional updateMany prevents race condition on job take
- Driver can only complete jobs assigned to themselves
- Driver can only complete TAKEN jobs with order status SEDANG_DIKIRIM
- DriverEarning = deliveryFee * 90% (Decimal-safe)
- SellerIncome = subtotal - discountAmount (not recalculated from OrderItems)
- All status changes recorded in OrderStatusHistory
- SystemTimeService used for takenAt, completedAt, order.completedAt
- DriverEarning and SellerIncome idempotent (unique constraints on deliveryJobId and orderId)

## Next Target: Level 6 Only

Implement Level 6 backend:

### What to implement
- Admin monitoring (users, stores, products, orders, delivery jobs, discounts)
- Admin summary endpoint
- System time simulation (simulate next day)
- Overdue order detection and refund handling

### What NOT to implement yet
- ❌ Security hardening (Level 7)
- ❌ Frontend code

## Key Files to Reference

- `PRD_BACKEND.md` — full PRD with all levels
- `DECISIONS.md` — architectural decisions
- `PROGRESS.md` — completion status
- `TASKS.md` — detailed task checklists
- `prisma/schema.prisma` — database schema
- `prisma/seed.ts` — seed data
