import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findBuyerOrders(userId: number) {
    return this.prisma.order.findMany({
      where: { buyerId: userId },
      include: {
        store: { select: { id: true, name: true } },
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBuyerOrderDetail(userId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId: userId },
      include: {
        store: { select: { id: true, name: true } },
        address: true,
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }
}
