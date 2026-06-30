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
      include: {
        store: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { paidAt: 'desc' },
    });

    const zero = new Prisma.Decimal(0);

    // ── Existing summary ──
    const totalSpending = orders.reduce(
      (sum, o) => sum.add(o.finalTotal),
      zero,
    );
    const totalOrders = orders.length;
    const averageOrderValue =
      totalOrders > 0 ? totalSpending.div(totalOrders) : zero;

    // ── Extended summary metrics ──
    const latestOrderDate = orders.length > 0 ? orders[0].paidAt : null;

    const totalDiscountUsed = orders.reduce(
      (sum, o) => sum.add(o.discountAmount),
      zero,
    );
    const totalDeliveryFees = orders.reduce(
      (sum, o) => sum.add(o.deliveryFee),
      zero,
    );
    const totalTaxPaid = orders.reduce(
      (sum, o) => sum.add(o.ppnAmount),
      zero,
    );
    const totalItemsPurchased = orders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
      0,
    );

    // ── Monthly trend ──
    const monthMap = new Map<string, { totalSpending: Prisma.Decimal; totalOrders: number }>();
    for (const o of orders) {
      const d = o.paidAt ?? o.createdAt;
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const e = monthMap.get(m);
      if (e) {
        e.totalSpending = e.totalSpending.add(o.finalTotal);
        e.totalOrders++;
      } else {
        monthMap.set(m, { totalSpending: o.finalTotal, totalOrders: 1 });
      }
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend = Array.from(monthMap.entries())
      .map(([month, data]) => {
        const [y, m] = month.split('-');
        const label = `${months[Number(m) - 1]} ${y}`;
        return { month, label, totalSpending: data.totalSpending, totalOrders: data.totalOrders };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    const highestSpendingMonth = monthlyTrend.length > 0
      ? monthlyTrend.reduce((max, cur) => (cur.totalSpending.gt(max.totalSpending) ? cur : max))
      : null;

    // ── Spending by store (top 10) ──
    const storeMap = new Map<number, { storeName: string; totalSpending: Prisma.Decimal; totalOrders: number }>();
    for (const o of orders) {
      const e = storeMap.get(o.storeId);
      if (e) {
        e.totalSpending = e.totalSpending.add(o.finalTotal);
        e.totalOrders++;
      } else {
        storeMap.set(o.storeId, { storeName: o.store.name, totalSpending: o.finalTotal, totalOrders: 1 });
      }
    }
    const spendingByStore = Array.from(storeMap.entries())
      .map(([storeId, d]) => ({ storeId, ...d }))
      .sort((a, b) => b.totalSpending.toNumber() - a.totalSpending.toNumber())
      .slice(0, 10);

    // ── Spending by delivery method ──
    const methodMap = new Map<string, { totalSpending: Prisma.Decimal; totalOrders: number }>();
    for (const o of orders) {
      const e = methodMap.get(o.deliveryMethod);
      if (e) {
        e.totalSpending = e.totalSpending.add(o.finalTotal);
        e.totalOrders++;
      } else {
        methodMap.set(o.deliveryMethod, { totalSpending: o.finalTotal, totalOrders: 1 });
      }
    }
    const spendingByDeliveryMethod = Array.from(methodMap.entries())
      .map(([deliveryMethod, d]) => ({ deliveryMethod, ...d }));

    // ── Spending by order status ──
    const statusMap = new Map<string, { totalSpending: Prisma.Decimal; totalOrders: number }>();
    for (const o of orders) {
      const e = statusMap.get(o.status);
      if (e) {
        e.totalSpending = e.totalSpending.add(o.finalTotal);
        e.totalOrders++;
      } else {
        statusMap.set(o.status, { totalSpending: o.finalTotal, totalOrders: 1 });
      }
    }
    const spendingByStatus = Array.from(statusMap.entries())
      .map(([status, d]) => ({ status, ...d }));

    // ── Top purchased products (top 10) ──
    const prodMap = new Map<number, { productName: string; quantity: number; totalSpending: Prisma.Decimal }>();
    for (const o of orders) {
      for (const item of o.items) {
        const pid = item.productId ?? 0;
        const e = prodMap.get(pid);
        if (e) {
          e.quantity += item.quantity;
          e.totalSpending = e.totalSpending.add(item.subtotal);
        } else {
          prodMap.set(pid, { productName: item.productName, quantity: item.quantity, totalSpending: item.subtotal });
        }
      }
    }
    const topProducts = Array.from(prodMap.entries())
      .map(([productId, d]) => ({ productId, ...d }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // ── Export rows ──
    const exportRows = orders.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      date: (o.paidAt ?? o.createdAt).toISOString(),
      storeName: o.store.name,
      status: o.status,
      deliveryMethod: o.deliveryMethod,
      subtotal: o.subtotal,
      discountAmount: o.discountAmount,
      deliveryFee: o.deliveryFee,
      taxAmount: o.ppnAmount,
      totalAmount: o.finalTotal,
    }));

    return {
      totalSpending,
      totalOrders,
      averageOrderValue,
      highestSpendingMonth,
      latestOrderDate,
      totalDiscountUsed,
      totalDeliveryFees,
      totalTaxPaid,
      totalItemsPurchased,
      monthlyTrend,
      spendingByStore,
      spendingByDeliveryMethod,
      spendingByStatus,
      topProducts,
      exportRows,
    };
  }

  async getSellerIncome(userId: number) {
    const store = await this.prisma.store.findUnique({
      where: { sellerUserId: userId },
    });

    const zero = new Prisma.Decimal(0);

    if (!store) {
      return {
        totalIncome: zero,
        totalOrders: 0,
        averageIncomePerOrder: zero,
        highestIncomeMonth: null,
        latestIncomeDate: null,
        totalItemsSold: 0,
        grossSales: zero,
        totalDiscountGiven: zero,
        netIncome: zero,
        monthlyTrend: [],
        incomeByProduct: [],
        incomeByStatus: [],
        incomeByDeliveryMethod: [],
        exportRows: [],
      };
    }

    const incomes = await this.prisma.sellerIncome.findMany({
      where: { storeId: store.id },
      include: {
        order: {
          include: {
            items: true,
            buyer: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ── Existing summary ──
    const totalIncome = incomes.reduce(
      (sum, inc) => sum.add(inc.amount),
      zero,
    );
    const totalOrders = incomes.length;
    const averageIncomePerOrder =
      totalOrders > 0 ? totalIncome.div(totalOrders) : zero;

    // ── Extended summary metrics ──
    const latestIncomeDate = incomes.length > 0 ? incomes[0].createdAt : null;

    let totalItemsSold = 0;
    let grossSales = zero;
    let totalDiscountGiven = zero;

    for (const inc of incomes) {
      for (const item of inc.order.items) {
        totalItemsSold += item.quantity;
      }
      grossSales = grossSales.add(inc.order.subtotal);
      totalDiscountGiven = totalDiscountGiven.add(inc.order.discountAmount);
    }
    const netIncome = totalIncome;

    // ── Monthly trend ──
    const monthMap = new Map<string, { totalIncome: Prisma.Decimal; totalOrders: number }>();
    for (const inc of incomes) {
      const d = inc.createdAt;
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const e = monthMap.get(m);
      if (e) {
        e.totalIncome = e.totalIncome.add(inc.amount);
        e.totalOrders++;
      } else {
        monthMap.set(m, { totalIncome: inc.amount, totalOrders: 1 });
      }
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend = Array.from(monthMap.entries())
      .map(([month, data]) => {
        const [y, m] = month.split('-');
        const label = `${months[Number(m) - 1]} ${y}`;
        return { month, label, totalIncome: data.totalIncome, totalOrders: data.totalOrders };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    const highestIncomeMonth = monthlyTrend.length > 0
      ? monthlyTrend.reduce((max, cur) => (cur.totalIncome.gt(max.totalIncome) ? cur : max))
      : null;

    // ── Income by product (top 10) ──
    const prodMap = new Map<number, { productName: string; quantity: number; grossSales: Prisma.Decimal; totalIncome: Prisma.Decimal }>();
    for (const inc of incomes) {
      const orderSubtotal = inc.order.subtotal;
      for (const item of inc.order.items) {
        const pid = item.productId ?? 0;
        const e = prodMap.get(pid);
        const itemGross = item.subtotal;
        const itemIncome = orderSubtotal.gt(0)
          ? inc.amount.mul(item.subtotal).div(orderSubtotal)
          : zero;
        if (e) {
          e.quantity += item.quantity;
          e.grossSales = e.grossSales.add(itemGross);
          e.totalIncome = e.totalIncome.add(itemIncome);
        } else {
          prodMap.set(pid, {
            productName: item.productName,
            quantity: item.quantity,
            grossSales: itemGross,
            totalIncome: itemIncome,
          });
        }
      }
    }
    const incomeByProduct = Array.from(prodMap.entries())
      .map(([productId, d]) => ({ productId, ...d }))
      .sort((a, b) => b.totalIncome.toNumber() - a.totalIncome.toNumber())
      .slice(0, 10);

    // ── Income by order status ──
    const statusMap = new Map<string, { totalIncome: Prisma.Decimal; totalOrders: number }>();
    for (const inc of incomes) {
      const s = inc.order.status;
      const e = statusMap.get(s);
      if (e) {
        e.totalIncome = e.totalIncome.add(inc.amount);
        e.totalOrders++;
      } else {
        statusMap.set(s, { totalIncome: inc.amount, totalOrders: 1 });
      }
    }
    const incomeByStatus = Array.from(statusMap.entries())
      .map(([status, d]) => ({ status, ...d }));

    // ── Income by delivery method ──
    const methodMap = new Map<string, { totalIncome: Prisma.Decimal; totalOrders: number }>();
    for (const inc of incomes) {
      const dm = inc.order.deliveryMethod;
      const e = methodMap.get(dm);
      if (e) {
        e.totalIncome = e.totalIncome.add(inc.amount);
        e.totalOrders++;
      } else {
        methodMap.set(dm, { totalIncome: inc.amount, totalOrders: 1 });
      }
    }
    const incomeByDeliveryMethod = Array.from(methodMap.entries())
      .map(([deliveryMethod, d]) => ({ deliveryMethod, ...d }));

    // ── Export rows ──
    const exportRows = incomes.map((inc) => {
      const totalItems = inc.order.items.reduce((s, item) => s + item.quantity, 0);
      return {
        orderId: inc.orderId,
        orderNumber: inc.order.orderNumber,
        date: inc.createdAt.toISOString(),
        buyerName: inc.order.buyer.fullName,
        status: inc.order.status,
        deliveryMethod: inc.order.deliveryMethod,
        subtotal: inc.order.subtotal,
        discountAmount: inc.order.discountAmount,
        sellerIncome: inc.amount,
        totalItems,
      };
    });

    return {
      totalIncome,
      totalOrders,
      averageIncomePerOrder,
      highestIncomeMonth,
      latestIncomeDate,
      totalItemsSold,
      grossSales,
      totalDiscountGiven,
      netIncome,
      monthlyTrend,
      incomeByProduct,
      incomeByStatus,
      incomeByDeliveryMethod,
      exportRows,
    };
  }
}
