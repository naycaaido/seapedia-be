import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { OrderStatus, DeliveryJobStatus, Prisma } from '../../prisma/generated/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../prisma/prisma.service';
import { SystemTimeService } from '../system-time/system-time.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private systemTime: SystemTimeService,
  ) {}

  async getSummary() {
    const now = await this.systemTime.getCurrentTime();

    const [
      totalUsers,
      totalStores,
      totalProducts,
      totalOrders,
      totalCompletedOrders,
      totalReturnedOrders,
      totalDeliveryJobs,
      revenueAgg,
      sellerIncomeAgg,
      driverEarningAgg,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.store.count(),
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PESANAN_SELESAI } }),
      this.prisma.order.count({ where: { status: OrderStatus.DIKEMBALIKAN } }),
      this.prisma.deliveryJob.count(),
      this.prisma.order.aggregate({
        _sum: { finalTotal: true },
        where: {
          paidAt: { not: null },
          status: { not: OrderStatus.DIKEMBALIKAN },
        },
      }),
      this.prisma.sellerIncome.aggregate({ _sum: { amount: true } }),
      this.prisma.driverEarning.aggregate({ _sum: { amount: true } }),
    ]);

    return {
      totalUsers,
      totalStores,
      totalProducts,
      totalOrders,
      totalCompletedOrders,
      totalReturnedOrders,
      totalDeliveryJobs,
      totalRevenue: revenueAgg._sum.finalTotal || new Prisma.Decimal(0),
      totalSellerIncome: sellerIncomeAgg._sum.amount || new Prisma.Decimal(0),
      totalDriverEarnings: driverEarningAgg._sum.amount || new Prisma.Decimal(0),
      currentSystemTime: now,
    };
  }

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        createdAt: true,
        userRoles: {
          include: { role: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listStores() {
    return this.prisma.store.findMany({
      include: {
        sellerUser: {
          select: { id: true, username: true, fullName: true, email: true },
        },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listProducts() {
    return this.prisma.product.findMany({
      include: {
        store: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listOrders() {
    return this.prisma.order.findMany({
      include: {
        buyer: { select: { id: true, username: true, fullName: true } },
        store: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderDetail(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, username: true, fullName: true, email: true } },
        store: { select: { id: true, name: true } },
        address: true,
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        deliveryJob: {
          include: {
            driver: { select: { id: true, username: true, fullName: true } },
          },
        },
        voucher: { select: { code: true, name: true } },
        promo: { select: { code: true, name: true } },
        refund: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async listDeliveryJobs() {
    return this.prisma.deliveryJob.findMany({
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            store: { select: { id: true, name: true } },
          },
        },
        driver: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listDiscounts() {
    const now = await this.systemTime.getCurrentTime();

    const [vouchers, promos] = await Promise.all([
      this.prisma.voucher.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.promo.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    const vouchersWithStatus = vouchers.map((v) => ({
      ...v,
      isExpired: v.expiryDate < now,
      isAvailable: v.isActive && v.expiryDate >= now && v.remainingUsage > 0,
    }));

    const promosWithStatus = promos.map((p) => ({
      ...p,
      isExpired: p.expiryDate < now,
      isAvailable: p.isActive && p.expiryDate >= now,
    }));

    return {
      vouchers: vouchersWithStatus,
      promos: promosWithStatus,
    };
  }

  async getSystemTime() {
    const now = await this.systemTime.getCurrentTime();
    return { currentDatetime: now };
  }

  async simulateNextDay(adminUserId: number) {
    const previousTime = await this.systemTime.getCurrentTime();
    const newSetting = await this.systemTime.nextDay(adminUserId);

    const refundResult = await this.refundAllOverdueOrders(adminUserId);

    return {
      previousTime,
      newTime: newSetting.currentDatetime,
      refundResult,
    };
  }

  async getOverdueOrders() {
    const now = await this.systemTime.getCurrentTime();

    const orders = await this.prisma.order.findMany({
      where: {
        expiredAt: { lte: now },
        status: {
          notIn: [OrderStatus.PESANAN_SELESAI, OrderStatus.DIKEMBALIKAN],
        },
      },
      include: {
        buyer: { select: { id: true, username: true, fullName: true } },
        store: { select: { id: true, name: true } },
      },
      orderBy: { expiredAt: 'asc' },
    });

    return orders.map((order) => {
      const overdueMs = now.getTime() - new Date(order.expiredAt).getTime();
      const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));
      const overdueDays = Math.floor(overdueHours / 24);

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        buyer: order.buyer,
        store: order.store,
        status: order.status,
        finalTotal: order.finalTotal,
        expiredAt: order.expiredAt,
        currentSystemTime: now,
        overdueDuration: `${overdueDays} days, ${overdueHours % 24} hours`,
      };
    });
  }

  async refundOrder(orderId: number, adminUserId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        deliveryJob: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const now = await this.systemTime.getCurrentTime();

    if (order.status === OrderStatus.PESANAN_SELESAI) {
      throw new BadRequestException('Cannot refund a completed order');
    }

    if (order.status === OrderStatus.DIKEMBALIKAN) {
      throw new BadRequestException('Order has already been refunded');
    }

    if (new Date(order.expiredAt) > now) {
      throw new BadRequestException('Order is not yet overdue');
    }

    const existingRefund = await this.prisma.refund.findUnique({
      where: { orderId },
    });

    if (existingRefund) {
      throw new ConflictException('Refund already exists for this order');
    }

    const refundAmount = order.finalTotal;

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.DIKEMBALIKAN,
            returnedAt: now,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: OrderStatus.DIKEMBALIKAN,
            changedByUserId: adminUserId,
          },
        });

        await tx.refund.create({
          data: {
            orderId,
            buyerId: order.buyerId,
            amount: refundAmount,
            reason: 'Overdue order refund',
            status: 'PROCESSED',
            processedAt: now,
          },
        });

        await tx.wallet.upsert({
          where: { userId: order.buyerId },
          create: {
            userId: order.buyerId,
            balance: refundAmount,
          },
          update: {
            balance: { increment: refundAmount },
          },
        });

        const wallet = await tx.wallet.findUnique({
          where: { userId: order.buyerId },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet!.id,
            type: 'REFUND',
            amount: refundAmount,
            description: `Refund untuk order ${order.orderNumber}`,
            referenceId: orderId,
          },
        });

        if (
          order.deliveryJob &&
          (order.deliveryJob.status === DeliveryJobStatus.AVAILABLE ||
            order.deliveryJob.status === DeliveryJobStatus.TAKEN)
        ) {
          await tx.deliveryJob.update({
            where: { id: order.deliveryJob.id },
            data: { status: DeliveryJobStatus.RETURNED },
          });
        }

        return tx.refund.findUnique({
          where: { orderId },
        });
      });
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This order has already been refunded');
      }
      throw error;
    }
  }

  async refundAllOverdueOrders(adminUserId: number) {
    const now = await this.systemTime.getCurrentTime();

    const overdueOrders = await this.prisma.order.findMany({
      where: {
        expiredAt: { lte: now },
        status: {
          notIn: [OrderStatus.PESANAN_SELESAI, OrderStatus.DIKEMBALIKAN],
        },
      },
      include: {
        deliveryJob: true,
      },
    });

    const processedOrderIds: number[] = [];
    const skippedOrders: { orderId: number; reason: string }[] = [];

    for (const order of overdueOrders) {
      const existingRefund = await this.prisma.refund.findUnique({
        where: { orderId: order.id },
      });

      if (existingRefund) {
        skippedOrders.push({
          orderId: order.id,
          reason: 'Refund already exists',
        });
        continue;
      }

      try {
        await this.refundOrder(order.id, adminUserId);
        processedOrderIds.push(order.id);
      } catch (error) {
        skippedOrders.push({
          orderId: order.id,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      processedCount: processedOrderIds.length,
      skippedCount: skippedOrders.length,
      processedOrderIds,
      skippedOrders,
    };
  }
}
