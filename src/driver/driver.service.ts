import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrderStatus, DeliveryJobStatus, Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { SystemTimeService } from '../system-time/system-time.service';

@Injectable()
export class DriverService {
  constructor(
    private prisma: PrismaService,
    private systemTime: SystemTimeService,
  ) {}

  async listAvailableJobs() {
    return this.prisma.deliveryJob.findMany({
      where: {
        status: DeliveryJobStatus.AVAILABLE,
        order: {
          status: OrderStatus.MENUNGGU_PENGIRIM,
        },
      },
      include: {
        order: {
          include: {
            store: { select: { id: true, name: true } },
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getAvailableJobDetail(jobId: number) {
    const job = await this.prisma.deliveryJob.findFirst({
      where: {
        id: jobId,
        status: DeliveryJobStatus.AVAILABLE,
        order: {
          status: OrderStatus.MENUNGGU_PENGIRIM,
        },
      },
      include: {
        order: {
          include: {
            store: { select: { id: true, name: true } },
            address: true,
            items: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Available delivery job not found');
    }

    return job;
  }

  async takeJob(driverId: number, jobId: number) {
    const job = await this.prisma.deliveryJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Delivery job not found');
    }

    if (job.status !== DeliveryJobStatus.AVAILABLE) {
      throw new BadRequestException(
        `Job is not available. Current status: ${job.status}`,
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: job.orderId },
    });

    if (!order || order.status !== OrderStatus.MENUNGGU_PENGIRIM) {
      throw new BadRequestException(
        'Order is not ready for delivery',
      );
    }

    const now = await this.systemTime.getCurrentTime();

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedJob = await tx.deliveryJob.updateMany({
        where: {
          id: jobId,
          status: DeliveryJobStatus.AVAILABLE,
          driverId: null,
        },
        data: {
          driverId: driverId,
          status: DeliveryJobStatus.TAKEN,
          takenAt: now,
        },
      });

      if (updatedJob.count === 0) {
        throw new BadRequestException(
          'Job has already been taken by another driver',
        );
      }

      const updatedOrder = await tx.order.update({
        where: { id: job.orderId },
        data: { status: OrderStatus.SEDANG_DIKIRIM },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: job.orderId,
          status: OrderStatus.SEDANG_DIKIRIM,
          changedByUserId: driverId,
        },
      });

      return tx.deliveryJob.findUnique({
        where: { id: jobId },
        include: {
          order: {
            include: {
              store: { select: { id: true, name: true } },
            },
          },
        },
      });
    });

    return result;
  }

  async completeJob(driverId: number, jobId: number) {
    const job = await this.prisma.deliveryJob.findUnique({
      where: { id: jobId },
      include: { order: true },
    });

    if (!job) {
      throw new NotFoundException('Delivery job not found');
    }

    if (job.driverId !== driverId) {
      throw new BadRequestException(
        'This job is not assigned to you',
      );
    }

    if (job.status !== DeliveryJobStatus.TAKEN) {
      throw new BadRequestException(
        `Job cannot be completed. Current status: ${job.status}`,
      );
    }

    if (job.order.status !== OrderStatus.SEDANG_DIKIRIM) {
      throw new BadRequestException(
        `Order is not in delivery status. Current status: ${job.order.status}`,
      );
    }

    const now = await this.systemTime.getCurrentTime();

    const driverEarningAmount = job.deliveryFee.mul(
      new Prisma.Decimal(0.9),
    );

    const sellerIncomeAmount = job.order.subtotal.sub(
      job.order.discountAmount,
    );

    const store = await this.prisma.store.findUnique({
      where: { id: job.order.storeId },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.deliveryJob.update({
        where: { id: jobId },
        data: {
          status: DeliveryJobStatus.COMPLETED,
          completedAt: now,
          earning: driverEarningAmount,
        },
      });

      await tx.order.update({
        where: { id: job.orderId },
        data: {
          status: OrderStatus.PESANAN_SELESAI,
          completedAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: job.orderId,
          status: OrderStatus.PESANAN_SELESAI,
          changedByUserId: driverId,
        },
      });

      await tx.driverEarning.create({
        data: {
          driverId: driverId,
          deliveryJobId: jobId,
          amount: driverEarningAmount,
        },
      });

      await tx.sellerIncome.create({
        data: {
          storeId: store!.id,
          orderId: job.orderId,
          amount: sellerIncomeAmount,
        },
      });

      return tx.deliveryJob.findUnique({
        where: { id: jobId },
        include: {
          order: true,
          driverEarning: true,
        },
      });
    });

    return result;
  }

  async getDeliveryHistory(driverId: number) {
    return this.prisma.deliveryJob.findMany({
      where: { driverId },
      include: {
        order: {
          include: {
            store: { select: { id: true, name: true } },
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEarnings(driverId: number) {
    const earnings = await this.prisma.driverEarning.findMany({
      where: { driverId },
      include: {
        deliveryJob: {
          include: {
            order: {
              include: {
                store: { select: { id: true, name: true } },
                buyer: { select: { id: true, fullName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const zero = new Prisma.Decimal(0);

    // ── Existing summary ──
    const totalEarnings = earnings.reduce(
      (sum, e) => sum.add(e.amount),
      zero,
    );
    const totalCompletedJobs = earnings.length;
    const averageEarningPerJob =
      totalCompletedJobs > 0 ? totalEarnings.div(totalCompletedJobs) : zero;

    // ── Extended summary metrics ──
    const latestEarningDate = earnings.length > 0 ? earnings[0].createdAt : null;

    const totalDeliveryFees = earnings.reduce(
      (sum, e) => sum.add(e.deliveryJob.deliveryFee),
      zero,
    );
    const averageDeliveryFee =
      totalCompletedJobs > 0 ? totalDeliveryFees.div(totalCompletedJobs) : zero;
    const averageDriverShare =
      totalDeliveryFees.gt(0) ? totalEarnings.div(totalDeliveryFees) : zero;

    // ── Monthly trend ──
    const monthMap = new Map<string, { totalEarnings: Prisma.Decimal; totalDeliveries: number }>();
    for (const e of earnings) {
      const d = e.createdAt;
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthMap.get(m);
      if (existing) {
        existing.totalEarnings = existing.totalEarnings.add(e.amount);
        existing.totalDeliveries++;
      } else {
        monthMap.set(m, { totalEarnings: e.amount, totalDeliveries: 1 });
      }
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend = Array.from(monthMap.entries())
      .map(([month, data]) => {
        const [y, m] = month.split('-');
        const label = `${months[Number(m) - 1]} ${y}`;
        return { month, label, totalEarnings: data.totalEarnings, totalDeliveries: data.totalDeliveries };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    const highestEarningMonth = monthlyTrend.length > 0
      ? monthlyTrend.reduce((max, cur) => (cur.totalEarnings.gt(max.totalEarnings) ? cur : max))
      : null;

    // ── Earnings by delivery method ──
    const methodMap = new Map<string, { totalEarnings: Prisma.Decimal; totalDeliveries: number }>();
    for (const e of earnings) {
      const dm = e.deliveryJob.deliveryMethod;
      const existing = methodMap.get(dm);
      if (existing) {
        existing.totalEarnings = existing.totalEarnings.add(e.amount);
        existing.totalDeliveries++;
      } else {
        methodMap.set(dm, { totalEarnings: e.amount, totalDeliveries: 1 });
      }
    }
    const earningsByDeliveryMethod = Array.from(methodMap.entries())
      .map(([deliveryMethod, d]) => ({ deliveryMethod, ...d }));

    // ── Earnings by job status ──
    const statusMap = new Map<string, { totalEarnings: Prisma.Decimal; totalDeliveries: number }>();
    for (const e of earnings) {
      const s = e.deliveryJob.status;
      const existing = statusMap.get(s);
      if (existing) {
        existing.totalEarnings = existing.totalEarnings.add(e.amount);
        existing.totalDeliveries++;
      } else {
        statusMap.set(s, { totalEarnings: e.amount, totalDeliveries: 1 });
      }
    }
    const earningsByStatus = Array.from(statusMap.entries())
      .map(([status, d]) => ({ status, ...d }));

    // ── Export rows ──
    const exportRows = earnings.map((e) => ({
      earningId: e.id,
      jobId: e.deliveryJobId,
      orderId: e.deliveryJob.orderId,
      orderNumber: e.deliveryJob.order.orderNumber,
      date: e.createdAt.toISOString(),
      status: e.deliveryJob.status,
      deliveryMethod: e.deliveryJob.deliveryMethod,
      deliveryFee: e.deliveryJob.deliveryFee,
      driverEarning: e.amount,
      storeName: e.deliveryJob.order.store.name,
      buyerName: e.deliveryJob.order.buyer.fullName,
    }));

    return {
      totalEarnings,
      totalCompletedJobs,
      averageEarningPerJob,
      totalDeliveries: totalCompletedJobs,
      averageEarningPerDelivery: averageEarningPerJob,
      highestEarningMonth,
      latestEarningDate,
      totalDeliveryFees,
      averageDeliveryFee,
      averageDriverShare,
      monthlyTrend,
      earningsByDeliveryMethod,
      earningsByStatus,
      exportRows,
      earnings,
    };
  }
}
