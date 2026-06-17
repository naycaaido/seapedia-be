import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, DeliveryMethod, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SystemTimeService } from '../system-time/system-time.service';
import { CheckoutDto } from './dto/checkout.dto';

const DELIVERY_FEES: Record<DeliveryMethod, number> = {
  INSTANT: 20000,
  NEXT_DAY: 12000,
  REGULAR: 8000,
};

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private systemTime: SystemTimeService,
  ) {}

  async checkout(userId: number, dto: CheckoutDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { buyerId: userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    if (!cart.storeId) {
      throw new BadRequestException('Cart has no store assigned');
    }

    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, buyerId: userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found or does not belong to you');
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found. Please top up your wallet first.');
    }

    for (const item of cart.items) {
      if (item.product.deletedAt !== null) {
        throw new BadRequestException(
          `Product "${item.product.name}" is no longer available`,
        );
      }
    }

    const now = await this.systemTime.getCurrentTime();

    const subtotal = cart.items.reduce(
      (sum, item) => sum.add(item.product.price.mul(item.quantity)),
      new Prisma.Decimal(0),
    );

    const discountAmount = new Prisma.Decimal(0);

    const deliveryFee = new Prisma.Decimal(DELIVERY_FEES[dto.deliveryMethod]);

    const taxBase = subtotal.sub(discountAmount);

    const ppnAmount = taxBase.mul(new Prisma.Decimal(0.12));

    const finalTotal = taxBase.add(deliveryFee).add(ppnAmount);

    if (wallet.balance.lessThan(finalTotal)) {
      throw new BadRequestException(
        `Insufficient wallet balance. Required: Rp ${finalTotal.toString()}, Available: Rp ${wallet.balance.toString()}`,
      );
    }

    const expiredAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const orderNumber = this.generateOrderNumber(now);

    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          buyerId: userId,
          storeId: cart.storeId!,
          addressId: address.id,
          shippingRecipientName: address.recipientName,
          shippingPhone: address.phone,
          shippingAddress: [
            address.addressDetail,
            address.city,
            address.province,
            address.postalCode,
          ]
            .filter(Boolean)
            .join(', '),
          deliveryMethod: dto.deliveryMethod,
          subtotal,
          discountAmount,
          deliveryFee,
          ppnAmount,
          finalTotal,
          status: OrderStatus.SEDANG_DIKEMAS,
          paidAt: now,
          expiredAt,
        },
      });

      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.product.id,
            productName: item.product.name,
            productPrice: item.product.price,
            quantity: item.quantity,
            subtotal: item.product.price.mul(item.quantity),
          },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.SEDANG_DIKEMAS,
          changedByUserId: userId,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: finalTotal },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'PAYMENT',
          amount: finalTotal.negated(),
          description: `Payment for order ${orderNumber}`,
          referenceId: order.id,
        },
      });

      for (const item of cart.items) {
        const updateResult = await tx.product.updateMany({
          where: {
            id: item.product.id,
            stock: { gte: item.quantity },
            deletedAt: null,
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (updateResult.count === 0) {
          throw new BadRequestException(
            `Insufficient stock for "${item.product.name}"`,
          );
        }
      }

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: { storeId: null },
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: true,
          statusHistory: true,
          store: { select: { id: true, name: true } },
          address: true,
        },
      });
    });

    return result;
  }

  private generateOrderNumber(now: Date): string {
    const timestamp = now.getTime().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }
}
