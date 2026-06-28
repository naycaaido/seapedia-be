import { Injectable } from '@nestjs/common';
import { Prisma, OrderStatus } from '../../prisma/generated/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getBuyerSpending(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: {
        buyerId: userId,
        paidAt: { not: null },
        status: { not: OrderStatus.DIKEMBALIKAN },
      },
    });

    const totalSpending = orders.reduce(
      (sum, order) => sum.add(order.finalTotal),
      new Prisma.Decimal(0),
    );

    const totalOrders = orders.length;
    const averageOrderValue =
      totalOrders > 0
        ? totalSpending.div(totalOrders)
        : new Prisma.Decimal(0);

    return {
      totalSpending,
      totalOrders,
      averageOrderValue,
    };
  }

  async getSellerIncome(userId: number) {
    const store = await this.prisma.store.findUnique({
      where: { sellerUserId: userId },
    });

    if (!store) {
      return {
        totalIncome: new Prisma.Decimal(0),
        totalOrders: 0,
        averageIncomePerOrder: new Prisma.Decimal(0),
      };
    }

    const incomes = await this.prisma.sellerIncome.findMany({
      where: { storeId: store.id },
    });

    const totalIncome = incomes.reduce(
      (sum, income) => sum.add(income.amount),
      new Prisma.Decimal(0),
    );

    const totalOrders = incomes.length;
    const averageIncomePerOrder =
      totalOrders > 0
        ? totalIncome.div(totalOrders)
        : new Prisma.Decimal(0);

    return {
      totalIncome,
      totalOrders,
      averageIncomePerOrder,
    };
  }
}
