# DECISIONS — SEAPEDIA Backend

## Architecture Decisions

### 1. Backend-only repository
- This repository contains only the NestJS backend.
- Frontend is maintained in a separate repository.
- Do not create frontend code here.

### 2. Active role is JWT/session-based
- Active role is stored in the JWT payload (`activeRole` field).
- Active role is NOT stored permanently in the database.
- Authorization uses `@ActiveRoles()` decorator + `RolesGuard` which checks `user.activeRole`.
- A user can own multiple roles but only one is active at a time.
- Single-role users auto-select their role on login/register.

### 3. Product delete uses soft delete
- Products are never hard-deleted from the database.
- `deletedAt = null` means product is visible/available.
- `deletedAt != null` means product is deleted and hidden from public catalog.
- Deleted products cannot be added to cart or checked out.
- Deleted product data remains for order history and audit.

### 4. Checkout uses Prisma transaction
- All checkout operations run inside `prisma.$transaction`.
- This includes: order creation, order items, status history, wallet deduction, wallet transaction, stock reduction, cart clearing.
- If any step fails, the entire checkout rolls back.

### 5. Checkout uses SystemTimeService for business timestamps
- `SystemTimeService.getCurrentTime()` reads `SystemSetting.currentDatetime`.
- Used for `paidAt`, `expiredAt`, and status history timestamps in checkout.
- Fallback to `new Date()` only if no SystemSetting row exists.
- Enables admin time simulation in Level 6.

### 6. PPN 12% is calculated after discount
- Formula: `taxBase = subtotal - discountAmount`
- `ppnAmount = taxBase * 12%`
- `finalTotal = taxBase + deliveryFee + ppnAmount`

### 7. Delivery fee is not included in tax base
- Delivery fee is added after PPN calculation.
- `finalTotal = (subtotal - discount) * 1.12 + deliveryFee`
- This is a project-specific rule, not standard tax law.

### 8. Voucher and Promo cannot be combined
- A checkout can use only one discount code (either a Voucher or a Promo).
- Not both. This is enforced in the checkout validation.

### 9. Level 3 checkout has discountAmount = 0
- Voucher/Promo logic is not implemented yet.
- `discountAmount` is hardcoded to `0` in Level 3 checkout.
- PPN is still calculated correctly (on the undiscounted subtotal).

### 10. Driver workflow starts at Level 5
- Level 4 does NOT include driver-related features.
- DeliveryJob creation, driver assignment, driver earning — all Level 5.

### 11. Admin/overdue/refund handling starts at Level 6
- Level 4 does NOT include admin monitoring or overdue handling.
- Admin endpoints, system time simulation, refund processing — all Level 6.

## Technical Decisions

### Decimal for money
- All money values use Prisma `Decimal(12, 2)`.
- Never use JavaScript floating-point for money calculations.
- Prisma Decimal operations are used for all arithmetic.

### Atomic stock reduction
- Checkout uses `updateMany` with `stock >= quantity` condition.
- If `updateCount === 0`, checkout fails with "Insufficient stock".
- Prevents race conditions from concurrent checkouts.

### Single-store cart
- One cart per buyer (enforced by unique `buyerId`).
- Cart locks to a store on first item added.
- Products from other stores are rejected until cart is cleared.

### Seed idempotency
- Seed uses `upsert` for roles/users/stores/wallets.
- Seed uses `findFirst` guards for addresses and SystemSetting.
- Safe to run multiple times without duplicates.
