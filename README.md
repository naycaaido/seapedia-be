# SEAPEDIA Backend

Multi-role e-commerce marketplace backend built with NestJS, Prisma, PostgreSQL, and JWT authentication.

## Tech Stack

- **Framework:** NestJS 10.3
- **ORM:** Prisma 5.7
- **Database:** PostgreSQL
- **Authentication:** JWT (24h expiry) + Passport
- **Password Hashing:** bcrypt (10 rounds)
- **Validation:** class-validator + class-transformer
- **API Docs:** Swagger/OpenAPI at `/api/docs`
- **Security:** Helmet, Rate Limiting (Throttler), XSS sanitization

## Features by Level

| Level | Features |
|-------|----------|
| 1 | Public catalog, Auth (register/login/logout/profile/select-role), Reviews |
| 2 | Seller store and product management, Product soft delete |
| 3 | Buyer wallet, addresses, cart (single-store), checkout with Prisma transaction |
| 4 | Voucher/Promo discounts, Seller order processing, Reports |
| 5 | Driver delivery workflow (take/complete jobs, earnings) |
| 6 | Admin monitoring, System time simulation, Overdue refund handling |
| 7 | Security hardening (Helmet, rate limiting, XSS sanitization, input validation) |

## Setup

### Prerequisites

- Node.js >= 18
- PostgreSQL

### Environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and a secure JWT secret:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/seapedia?schema=public"
JWT_SECRET="your-secure-random-string-here"
PORT=3000
FRONTEND_URL="http://localhost:5173"
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_STORAGE_BUCKET="products"
```

> **Important:** `JWT_SECRET` is required. The app will fail to start if it is missing.
> **Supabase:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are required for product image uploads.

### Database Setup

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### Run Development Server

```bash
npm run start:dev
```

The API runs at `http://localhost:3000/api`.

### Swagger Documentation

Open `http://localhost:3000/api/docs` in your browser.

## Seed Data

| Account | Username | Password | Role(s) |
|---------|----------|----------|---------|
| Admin | admin | password123 | Admin |
| Seller 1 | tokoindah | password123 | Seller |
| Seller 2 | elektronikku | password123 | Seller |
| Buyer | pembeli | password123 | Buyer |
| Driver | supir | password123 | Driver |
| Multi-role | multiuser | password123 | Seller + Buyer |

- Buyer wallet: Rp 1.000.000
- Multi wallet: Rp 500.000
- System time: 2026-01-01T00:00:00Z
- Vouchers: DISKON10 (10%), HEMAT25RB (fixed 25k), EXPIRED (expired)
- Promos: CASHBACK15RB (fixed 15k), PROMO5PERSEN (5%)

## API Endpoints Summary

### Public (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/products` | List active products |
| GET | `/api/products/:id` | Product detail |
| GET | `/api/stores/:id` | Store detail |
| GET | `/api/reviews` | List reviews |
| POST | `/api/reviews` | Submit review |
| GET | `/api/discounts/vouchers` | List active vouchers |
| GET | `/api/discounts/promos` | List active promos |

### Authenticated

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/logout` | Any | Logout |
| GET | `/api/auth/me` | Any | Profile |
| POST | `/api/auth/select-role` | Any | Switch active role |

### Buyer

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wallet` | Wallet balance |
| POST | `/api/wallet/top-up` | Top up wallet |
| GET | `/api/wallet/transactions` | Transaction history |
| GET | `/api/addresses` | List addresses |
| POST | `/api/addresses` | Create address |
| PATCH | `/api/addresses/:id` | Update address |
| DELETE | `/api/addresses/:id` | Delete address |
| PATCH | `/api/addresses/:id/default` | Set default address |
| GET | `/api/cart` | View cart |
| POST | `/api/cart/items` | Add to cart |
| PATCH | `/api/cart/items/:id` | Update cart item |
| DELETE | `/api/cart/items/:id` | Remove cart item |
| DELETE | `/api/cart/clear` | Clear cart |
| POST | `/api/checkout` | Checkout |
| GET | `/api/orders` | My orders |
| GET | `/api/orders/:id` | Order detail |
| GET | `/api/discounts/validate` | Validate discount code |
| GET | `/api/buyer/reports/spending` | Spending report |

### Seller

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/seller/store` | View own store |
| POST | `/api/seller/store` | Create store |
| PATCH | `/api/seller/store` | Update store |
| GET | `/api/seller/products` | List own products |
| POST | `/api/seller/products` | Create product (multipart/form-data, image required) |
| GET | `/api/seller/products/:id` | View own product |
| PATCH | `/api/seller/products/:id` | Update product (multipart/form-data, image optional) |
| DELETE | `/api/seller/products/:id` | Soft delete product |
| GET | `/api/seller/dashboard` | Dashboard summary |
| GET | `/api/seller/orders` | Store orders |
| GET | `/api/seller/orders/:id` | Order detail |
| POST | `/api/seller/orders/:id/process` | Process order |
| GET | `/api/seller/reports/income` | Income report |

### Driver

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/driver/jobs` | Available jobs |
| GET | `/api/driver/jobs/:id` | Job detail |
| POST | `/api/driver/jobs/:id/take` | Take job |
| POST | `/api/driver/jobs/:id/complete` | Complete job |
| GET | `/api/driver/history` | Delivery history |
| GET | `/api/driver/earnings` | Earnings summary |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/summary` | Dashboard summary |
| GET | `/api/admin/users` | List users |
| GET | `/api/admin/stores` | List stores |
| GET | `/api/admin/products` | List products |
| GET | `/api/admin/orders` | List orders |
| GET | `/api/admin/orders/:id` | Order detail |
| GET | `/api/admin/delivery-jobs` | List delivery jobs |
| GET | `/api/admin/discounts` | List discounts |
| GET | `/api/admin/overdue-orders` | Overdue orders |
| GET | `/api/admin/system-time` | Current system time |
| POST | `/api/admin/system-time/simulate-next-day` | Advance time 1 day |
| POST | `/api/admin/orders/:id/refund` | Refund order |
| POST | `/api/admin/overdue-orders/refund-all` | Refund all overdue |
| POST | `/api/admin/vouchers` | Create voucher |
| POST | `/api/admin/promos` | Create promo |

## Business Rules

### Active Role Authorization

- Users can own multiple roles (Seller, Buyer, Driver) but only one is active at a time.
- Active role is stored in the JWT payload, not in the database.
- Role-specific endpoints verify the active role server-side.
- Single-role users auto-select their role on login.

### Product Soft Delete

- Products are never hard-deleted.
- `deletedAt = null` means visible; `deletedAt != null` means deleted.
- Deleted products are hidden from public catalog and cannot be added to cart.
- Soft-deleted products cannot be updated.

### Single-Store Cart

- A cart can only contain products from one store.
- Adding a product from a different store is rejected until the cart is cleared.

### Checkout Calculation

```
tax_base = subtotal - discount
ppn = tax_base * 12%
final_total = tax_base + delivery_fee + ppn
```

Delivery fee is not included in the PPN calculation.

### Discount Rules

- Voucher and Promo cannot be combined in one checkout.
- Expired or zero-usage vouchers are rejected.
- Percentage discounts are capped at `maxDiscountAmount`.

### Delivery Workflow

```
Checkout -> SEDANG_DIKEMAS -> (Seller process) -> MENUNGGU_PENGIRIM
-> (Driver take) -> SEDANG_DIKIRIM -> (Driver complete) -> PESANAN_SELESAI
```

### System Time Simulation

- Business time comes from `SystemSetting.currentDatetime`.
- Admin can advance time by 1 day via POST `/admin/system-time/simulate-next-day`.
- Used for voucher/promo validation, overdue detection, and checkout timestamps.

### Refund Flow

- Overdue orders (past `expiredAt` and not completed/returned) can be refunded.
- Refund amount equals `order.finalTotal`.
- Refund updates wallet balance, creates wallet transaction, and records refund.

### Product Image Upload

- Product images are stored in Supabase Storage, not local filesystem.
- **Create product:** Image is required. Upload via `multipart/form-data` with field name `image`.
- **Update product:** Image is optional. If provided, replaces the existing image.
- **Accepted MIME types:** `image/jpeg`, `image/png`, `image/webp`
- **Max file size:** 5MB
- **Object path:** `products/seller-<sellerId>/product-<timestamp>-<random>.<ext>`
- **Public bucket:** The Supabase Storage bucket must be set to public for `getPublicUrl` to work.
- **Soft delete:** Deleted products retain their image files (no auto-deletion).
- **Database fields:** `imageUrl` (public URL for display) and `imagePath` (storage path for management, hidden from public responses).

#### Create Product Example (curl)

```bash
curl -X POST http://localhost:3000/api/seller/products \
  -H "Authorization: Bearer <token>" \
  -F "name=Headphone Bluetooth" \
  -F "description=Headphone nirkabel dengan noise cancellation." \
  -F "price=350000" \
  -F "stock=25" \
  -F "image=@/path/to/image.jpg"
```

#### Update Product Example (curl)

```bash
curl -X PATCH http://localhost:3000/api/seller/products/1 \
  -H "Authorization: Bearer <token>" \
  -F "name=Headphone Bluetooth V2" \
  -F "price=300000" \
  -F "image=@/path/to/new-image.jpg"
```

## Security

- **SQL Injection:** Prevented by Prisma ORM (no raw SQL).
- **XSS:** User-generated content (reviews, store/product names/descriptions, user full names) is sanitized by escaping HTML entities.
- **Validation:** Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`.
- **JWT:** 24-hour expiry, secret from environment variable (required).
- **RBAC:** Global `JwtAuthGuard` + `RolesGuard` with `@ActiveRoles()` decorator.
- **Ownership:** All resource access is validated against the authenticated user's ownership.
- **Rate Limiting:** Auth endpoints (login, register) limited to 10 requests per 60 seconds. Global limit of 100 requests per 60 seconds.
- **HTTP Headers:** Helmet middleware adds security headers (X-Content-Type-Options, X-Frame-Options, etc.).
- **CORS:** Configurable via `FRONTEND_URL` environment variable.

## Testing Checklist

### Auth
- [ ] Register with valid data returns JWT
- [ ] Register with Admin role is rejected
- [ ] Login with valid credentials returns JWT without passwordHash
- [ ] Login with invalid credentials returns 401
- [ ] Profile returns user data without passwordHash
- [ ] Select role validates ownership

### Role Authorization
- [ ] Buyer cannot access Seller endpoints (403)
- [ ] Seller cannot access Buyer endpoints (403)
- [ ] Driver cannot access Admin endpoints (403)
- [ ] Non-admin cannot access Admin endpoints (403)

### Security
- [ ] XSS payloads in review comment are escaped
- [ ] SQL-like payloads in login are handled safely
- [ ] Rate limiting triggers after 10 login attempts per minute
- [ ] Helmet headers present in response
- [ ] JWT_SECRET missing causes clear startup error

### Ownership
- [ ] Seller A cannot access Seller B's products
- [ ] Buyer A cannot access Buyer B's addresses
- [ ] Driver cannot complete another driver's job

### Checkout
- [ ] Empty cart checkout fails
- [ ] Insufficient balance checkout fails
- [ ] Deleted product in cart fails
- [ ] Insufficient stock checkout fails
- [ ] Both voucherCode and promoCode rejected
