import { PrismaClient, RoleName, DiscountType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.Admin },
    update: {},
    create: { name: RoleName.Admin },
  });
  const sellerRole = await prisma.role.upsert({
    where: { name: RoleName.Seller },
    update: {},
    create: { name: RoleName.Seller },
  });
  const buyerRole = await prisma.role.upsert({
    where: { name: RoleName.Buyer },
    update: {},
    create: { name: RoleName.Buyer },
  });
  const driverRole = await prisma.role.upsert({
    where: { name: RoleName.Driver },
    update: {},
    create: { name: RoleName.Driver },
  });

  const password = await bcrypt.hash('password123', 10);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@seapedia.com',
      fullName: 'Admin Seapedia',
      passwordHash: password,
      userRoles: { create: { roleId: adminRole.id } },
    },
  });

  // Seller 1
  const seller1 = await prisma.user.upsert({
    where: { username: 'tokoindah' },
    update: {},
    create: {
      username: 'tokoindah',
      email: 'tokoindah@seapedia.com',
      fullName: 'Toko Indah',
      passwordHash: password,
      userRoles: { create: { roleId: sellerRole.id } },
    },
  });

  // Seller 2
  const seller2 = await prisma.user.upsert({
    where: { username: 'elektronikku' },
    update: {},
    create: {
      username: 'elektronikku',
      email: 'elektronikku@seapedia.com',
      fullName: 'Elektronikku Store',
      passwordHash: password,
      userRoles: { create: { roleId: sellerRole.id } },
    },
  });

  // Buyer
  const buyer = await prisma.user.upsert({
    where: { username: 'pembeli' },
    update: {},
    create: {
      username: 'pembeli',
      email: 'pembeli@seapedia.com',
      fullName: 'Pembeli Setia',
      passwordHash: password,
      userRoles: { create: { roleId: buyerRole.id } },
    },
  });

  // Driver
  const driver = await prisma.user.upsert({
    where: { username: 'supir' },
    update: {},
    create: {
      username: 'supir',
      email: 'supir@seapedia.com',
      fullName: 'Supir Handal',
      passwordHash: password,
      userRoles: { create: { roleId: driverRole.id } },
    },
  });

  // Multi-role user (Seller + Buyer)
  const multiRole = await prisma.user.upsert({
    where: { username: 'multiuser' },
    update: {},
    create: {
      username: 'multiuser',
      email: 'multi@seapedia.com',
      fullName: 'Multi Role User',
      passwordHash: password,
      userRoles: {
        create: [
          { roleId: sellerRole.id },
          { roleId: buyerRole.id },
        ],
      },
    },
  });

  // Stores
  const store1 = await prisma.store.upsert({
    where: { sellerUserId: seller1.id },
    update: {},
    create: {
      name: 'Toko Indah',
      description: 'Toko yang menjual berbagai kebutuhan rumah tangga dengan kualitas terbaik.',
      sellerUserId: seller1.id,
    },
  });

  const store2 = await prisma.store.upsert({
    where: { sellerUserId: seller2.id },
    update: {},
    create: {
      name: 'Elektronikku',
      description: 'Spesialis elektronik dan gadget terbaru dengan harga kompetitif.',
      sellerUserId: seller2.id,
    },
  });

  const store3 = await prisma.store.upsert({
    where: { sellerUserId: multiRole.id },
    update: {},
    create: {
      name: 'Multi Store',
      description: 'Toko serba ada dari multi-role user.',
      sellerUserId: multiRole.id,
    },
  });

  // Helper: create product if it doesn't already exist
  const createIfMissing = async (storeId: number, products: { name: string; description: string; price: number; stock: number }[]) => {
    for (const p of products) {
      const existing = await prisma.product.findFirst({ where: { name: p.name } });
      if (!existing) {
        await prisma.product.create({
          data: { storeId, name: p.name, description: p.description, price: p.price, stock: p.stock },
        });
      }
    }
  };

  // Products for Store 1
  await createIfMissing(store1.id, [
    { name: 'Piring Keramik 6 Pcs', description: 'Set piring keramik berkualitas tinggi, cocok untuk makan sehari-hari.', price: 85000, stock: 50 },
    { name: 'Gelas Kaca 4 Pcs', description: 'Gelas kaca bening tebal, tahan panas.', price: 45000, stock: 100 },
    { name: 'Panci Stainless Steel', description: 'Panci stainless steel anti lengket, ukuran 20cm.', price: 125000, stock: 30 },
  ]);

  // Products for Store 2
  await createIfMissing(store2.id, [
    { name: 'Headphone Bluetooth', description: 'Headphone nirkabel dengan noise cancellation, baterai tahan 20 jam.', price: 350000, stock: 25 },
    { name: 'Power Bank 20000mAh', description: 'Power bank kapasitas besar dengan fast charging.', price: 180000, stock: 40 },
    { name: 'Mouse Wireless', description: 'Mouse wireless ergonomis dengan sensor optik 1600 DPI.', price: 95000, stock: 60 },
    { name: 'Keyboard Mechanical', description: 'Keyboard mechanical RGB dengan switch blue, cocok untuk gaming dan typing.', price: 280000, stock: 15 },
  ]);

  // Products for Store 3
  await createIfMissing(store3.id, [
    { name: 'Tas Ransel', description: 'Tas ransel anti air dengan banyak kompartemen.', price: 150000, stock: 20 },
    { name: 'Botol Minum 1L', description: 'Botol minum Tritan bebas BPA, desain简约.', price: 65000, stock: 35 },
  ]);

  // Sample reviews (only if no reviews exist yet)
  const reviewCount = await prisma.applicationReview.count();
  if (reviewCount === 0) {
    const reviews = [
      { reviewerName: 'Andi Pratama', rating: 5, comment: 'Seapedia sangat membantu saya menemukan produk berkualitas dengan harga terbaik!' },
      { reviewerName: 'Siti Rahma', rating: 4, comment: 'Pengalaman berbelanja yang menyenangkan. Pengiriman cepat dan aman.' },
      { reviewerName: 'Budi Santoso', rating: 5, comment: 'Marketplace yang lengkap dan mudah digunakan. Sangat direkomendasikan!' },
      { reviewerName: 'Dewi Lestari', rating: 3, comment: 'Cukup baik, tapi masih perlu perbaikan di bagian filter produk.' },
    ];

    for (const r of reviews) {
      await prisma.applicationReview.create({
        data: {
          reviewerName: r.reviewerName,
          rating: r.rating,
          comment: r.comment,
        },
      });
    }
  }

  // Wallets for buyers
  await prisma.wallet.upsert({
    where: { userId: buyer.id },
    update: {},
    create: { userId: buyer.id, balance: 1000000 },
  });

  await prisma.wallet.upsert({
    where: { userId: multiRole.id },
    update: {},
    create: { userId: multiRole.id, balance: 500000 },
  });

  // Addresses for buyers
  const buyerAddress = await prisma.address.findFirst({
    where: { buyerId: buyer.id },
  });
  if (!buyerAddress) {
    await prisma.address.create({
      data: {
        buyerId: buyer.id,
        recipientName: 'Pembeli Setia',
        phone: '08123456789',
        addressDetail: 'Jl. Merdeka No. 10, Blok B',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        postalCode: '12190',
        isDefault: true,
      },
    });
  }

  const multiAddress = await prisma.address.findFirst({
    where: { buyerId: multiRole.id },
  });
  if (!multiAddress) {
    await prisma.address.create({
      data: {
        buyerId: multiRole.id,
        recipientName: 'Multi Role User',
        phone: '08987654321',
        addressDetail: 'Jl. Gatot Subroto No. 25',
        city: 'Bandung',
        province: 'Jawa Barat',
        postalCode: '40231',
        isDefault: true,
      },
    });
  }

  // SystemSetting singleton
  const settingCount = await prisma.systemSetting.count();
  if (settingCount === 0) {
    await prisma.systemSetting.create({
      data: {
        currentDatetime: new Date('2026-01-01T00:00:00Z'),
      },
    });
  }

  // Sample Vouchers
  const voucher1 = await prisma.voucher.findUnique({ where: { code: 'DISKON10' } });
  if (!voucher1) {
    await prisma.voucher.create({
      data: {
        name: 'Diskon 10%',
        code: 'DISKON10',
        description: 'Voucher diskon 10% untuk semua produk, maksimal Rp 50.000',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        maxDiscountAmount: 50000,
        minPurchaseAmount: 100000,
        remainingUsage: 100,
        expiryDate: new Date('2026-12-31T23:59:59Z'),
        isActive: true,
      },
    });
  }

  const voucher2 = await prisma.voucher.findUnique({ where: { code: 'HEMAT25RB' } });
  if (!voucher2) {
    await prisma.voucher.create({
      data: {
        name: 'Hemat Rp 25.000',
        code: 'HEMAT25RB',
        description: 'Potongan langsung Rp 25.000 untuk pembelian minimal Rp 150.000',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 25000,
        minPurchaseAmount: 150000,
        remainingUsage: 50,
        expiryDate: new Date('2026-12-31T23:59:59Z'),
        isActive: true,
      },
    });
  }

  // Expired voucher for testing
  const expiredVoucher = await prisma.voucher.findUnique({ where: { code: 'EXPIRED' } });
  if (!expiredVoucher) {
    await prisma.voucher.create({
      data: {
        name: 'Voucher Expired',
        code: 'EXPIRED',
        description: 'Voucher yang sudah kedaluwarsa',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        remainingUsage: 10,
        expiryDate: new Date('2025-01-01T00:00:00Z'),
        isActive: true,
      },
    });
  }

  // Sample Promos
  const promo1 = await prisma.promo.findUnique({ where: { code: 'CASHBACK15RB' } });
  if (!promo1) {
    await prisma.promo.create({
      data: {
        name: 'Cashback Rp 15.000',
        code: 'CASHBACK15RB',
        description: 'Cashback Rp 15.000 untuk pembelian minimal Rp 100.000',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 15000,
        minPurchaseAmount: 100000,
        expiryDate: new Date('2026-06-30T23:59:59Z'),
        isActive: true,
      },
    });
  }

  const promo2 = await prisma.promo.findUnique({ where: { code: 'PROMO5PERSEN' } });
  if (!promo2) {
    await prisma.promo.create({
      data: {
        name: 'Promo 5%',
        code: 'PROMO5PERSEN',
        description: 'Diskon 5% tanpa batas maksimum',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 5,
        expiryDate: new Date('2026-12-31T23:59:59Z'),
        isActive: true,
      },
    });
  }

  console.log('Seed completed!');
  console.log('');
  console.log('Demo Accounts:');
  console.log('  Admin:     admin / password123');
  console.log('  Seller 1:  tokoindah / password123');
  console.log('  Seller 2:  elektronikku / password123');
  console.log('  Buyer:     pembeli / password123');
  console.log('  Driver:    supir / password123');
  console.log('  Multi:     multiuser / password123 (Seller + Buyer roles)');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
