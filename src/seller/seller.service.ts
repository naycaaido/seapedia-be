import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class SellerService {
  constructor(private prisma: PrismaService) {}

  private async getSellerStore(userId: number) {
    const store = await this.prisma.store.findUnique({
      where: { sellerUserId: userId },
      include: {
        products: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    return store;
  }

  private async ensureOwnership(userId: number) {
    const store = await this.prisma.store.findUnique({
      where: { sellerUserId: userId },
    });
    if (!store) {
      throw new NotFoundException(
        'You do not have a store yet. Please create one first.',
      );
    }
    return store;
  }

  async getStore(userId: number) {
    const store = await this.getSellerStore(userId);
    if (!store) {
      throw new NotFoundException(
        'You do not have a store yet. Please create one first.',
      );
    }
    return store;
  }

  async createStore(userId: number, dto: CreateStoreDto) {
    const existingStore = await this.prisma.store.findUnique({
      where: { sellerUserId: userId },
    });
    if (existingStore) {
      throw new ConflictException(
        'You already have a store. Each seller can only have one store.',
      );
    }

    try {
      return await this.prisma.store.create({
        data: {
          sellerUserId: userId,
          name: dto.name,
          description: dto.description,
        },
        include: {
          products: true,
        },
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        const target = error?.meta?.target as string[] | undefined;
        if (target?.includes('name')) {
          throw new ConflictException(
            'A store with this name already exists. Please choose a different name.',
          );
        }
      }
      throw error;
    }
  }

  async updateStore(userId: number, dto: UpdateStoreDto) {
    const store = await this.ensureOwnership(userId);

    if (!dto.name && !dto.description) {
      throw new BadRequestException(
        'At least one field (name or description) must be provided.',
      );
    }

    try {
      return await this.prisma.store.update({
        where: { id: store.id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
        },
        include: {
          products: true,
        },
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        const target = error?.meta?.target as string[] | undefined;
        if (target?.includes('name')) {
          throw new ConflictException(
            'A store with this name already exists. Please choose a different name.',
          );
        }
      }
      throw error;
    }
  }

  async listProducts(userId: number) {
    const store = await this.ensureOwnership(userId);

    return this.prisma.product.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProduct(userId: number, productId: number) {
    const store = await this.ensureOwnership(userId);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, storeId: store.id },
    });

    if (!product) {
      throw new NotFoundException(
        'Product not found or does not belong to your store.',
      );
    }

    return product;
  }

  async createProduct(userId: number, dto: CreateProductDto) {
    const store = await this.ensureOwnership(userId);

    if (dto.price < 0) {
      throw new BadRequestException('Price must not be negative.');
    }
    if (dto.stock < 0) {
      throw new BadRequestException('Stock must not be negative.');
    }

    return this.prisma.product.create({
      data: {
        storeId: store.id,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        imageUrl: dto.imageUrl,
      },
    });
  }

  async updateProduct(userId: number, productId: number, dto: UpdateProductDto) {
    const store = await this.ensureOwnership(userId);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, storeId: store.id },
    });

    if (!product) {
      throw new NotFoundException(
        'Product not found or does not belong to your store.',
      );
    }

    if (dto.price !== undefined && dto.price < 0) {
      throw new BadRequestException('Price must not be negative.');
    }
    if (dto.stock !== undefined && dto.stock < 0) {
      throw new BadRequestException('Stock must not be negative.');
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      },
    });
  }

  async deleteProduct(userId: number, productId: number) {
    const store = await this.ensureOwnership(userId);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, storeId: store.id },
    });

    if (!product) {
      throw new NotFoundException(
        'Product not found or does not belong to your store.',
      );
    }

    if (product.deletedAt !== null) {
      throw new BadRequestException('This product is already deactivated.');
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    });
  }

  async getDashboardSummary(userId: number) {
    const store = await this.prisma.store.findUnique({
      where: { sellerUserId: userId },
      include: {
        products: true,
      },
    });

    if (!store) {
      return {
        hasStore: false,
        store: null,
        totalProducts: 0,
        activeProducts: 0,
      };
    }

    const activeProducts = store.products.filter((p) => !p.deletedAt);

    return {
      hasStore: true,
      store: {
        id: store.id,
        name: store.name,
        description: store.description,
        createdAt: store.createdAt,
      },
      totalProducts: store.products.length,
      activeProducts: activeProducts.length,
    };
  }

  async listOrders(userId: number) {
    const store = await this.ensureOwnership(userId);

    return this.prisma.order.findMany({
      where: { storeId: store.id },
      include: {
        buyer: {
          select: { id: true, username: true, fullName: true },
        },
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(userId: number, orderId: number) {
    const store = await this.ensureOwnership(userId);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId: store.id },
      include: {
        buyer: {
          select: { id: true, username: true, fullName: true },
        },
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

  async processOrder(userId: number, orderId: number) {
    const store = await this.ensureOwnership(userId);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId: store.id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.SEDANG_DIKEMAS) {
      throw new BadRequestException(
        `Order can only be processed from SEDANG_DIKEMAS status. Current status: ${order.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.MENUNGGU_PENGIRIM,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: orderId,
          status: OrderStatus.MENUNGGU_PENGIRIM,
          changedByUserId: userId,
        },
      });

      return updatedOrder;
    });
  }
}
