import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateCart(userId: number) {
    let cart = await this.prisma.cart.findUnique({
      where: { buyerId: userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                imageUrl: true,
                deletedAt: true,
                storeId: true,
              },
            },
          },
        },
        store: {
          select: { id: true, name: true },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { buyerId: userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  stock: true,
                  imageUrl: true,
                  deletedAt: true,
                  storeId: true,
                },
              },
            },
          },
          store: {
            select: { id: true, name: true },
          },
        },
      });
    }

    return cart;
  }

  async addItem(userId: number, dto: AddCartItemDto) {
    const cart = await this.getOrCreateCart(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.deletedAt !== null) {
      throw new BadRequestException('This product is no longer available');
    }

    if (dto.quantity > product.stock) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}`,
      );
    }

    if (cart.storeId !== null && cart.storeId !== product.storeId) {
      throw new BadRequestException(
        'Cart already contains products from another store. Clear your cart first to add products from a different store.',
      );
    }

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + dto.quantity;

      if (newQuantity > product.stock) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${product.stock}, currently in cart: ${existingItem.quantity}`,
        );
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          quantity: dto.quantity,
        },
      });

      if (cart.storeId === null) {
        await this.prisma.cart.update({
          where: { id: cart.id },
          data: { storeId: product.storeId },
        });
      }
    }

    return this.getOrCreateCart(userId);
  }

  async updateItem(userId: number, cartItemId: number, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);

    const cartItem = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cartId: cart.id },
      include: { product: true },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (cartItem.product.deletedAt !== null) {
      throw new BadRequestException('This product is no longer available');
    }

    if (dto.quantity > cartItem.product.stock) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${cartItem.product.stock}`,
      );
    }

    await this.prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity: dto.quantity },
    });

    return this.getOrCreateCart(userId);
  }

  async removeItem(userId: number, cartItemId: number) {
    const cart = await this.getOrCreateCart(userId);

    const cartItem = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cartId: cart.id },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItem.id },
    });

    const remainingItems = await this.prisma.cartItem.count({
      where: { cartId: cart.id },
    });

    if (remainingItems === 0) {
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { storeId: null },
      });
    }

    return this.getOrCreateCart(userId);
  }

  async clearCart(userId: number) {
    const cart = await this.getOrCreateCart(userId);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { storeId: null },
    });

    return this.getOrCreateCart(userId);
  }
}
