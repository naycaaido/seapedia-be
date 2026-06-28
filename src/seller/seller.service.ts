import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, OrderStatus } from '../../prisma/generated/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../prisma/prisma.service';
import { SystemTimeService } from '../system-time/system-time.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { sanitizeHtml } from '../common/utils/sanitize-html';
import { MulterFile } from '../common/types/multer-file';

@Injectable()
export class SellerService {
  constructor(
    private prisma: PrismaService,
    private systemTime: SystemTimeService,
    private storageService: SupabaseStorageService,
  ) {}

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
          name: sanitizeHtml(dto.name),
          description: sanitizeHtml(dto.description),
        },
        include: {
          products: true,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = error.meta?.target as string[] | undefined;
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
          ...(dto.name !== undefined && { name: sanitizeHtml(dto.name) }),
          ...(dto.description !== undefined && { description: sanitizeHtml(dto.description) }),
        },
        include: {
          products: true,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = error.meta?.target as string[] | undefined;
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

  async createProduct(userId: number, dto: CreateProductDto, file: MulterFile) {
    const store = await this.ensureOwnership(userId);

    if (dto.price < 0) {
      throw new BadRequestException('Price must not be negative.');
    }
    if (dto.stock < 0) {
      throw new BadRequestException('Stock must not be negative.');
    }

    let uploadedImage: { imageUrl: string; imagePath: string } | null = null;

    try {
      uploadedImage = await this.storageService.uploadProductImage(userId, file);

      return await this.prisma.product.create({
        data: {
          storeId: store.id,
          name: sanitizeHtml(dto.name),
          description: sanitizeHtml(dto.description),
          price: dto.price,
          stock: dto.stock,
          imageUrl: uploadedImage.imageUrl,
          imagePath: uploadedImage.imagePath,
        },
      });
    } catch (error) {
      if (uploadedImage) {
        await this.storageService.deleteProductImage(uploadedImage.imagePath);
      }
      throw error;
    }
  }

  async updateProduct(userId: number, productId: number, dto: UpdateProductDto, file?: MulterFile) {
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
      throw new BadRequestException('Cannot update a deactivated product.');
    }

    if (dto.price !== undefined && dto.price < 0) {
      throw new BadRequestException('Price must not be negative.');
    }
    if (dto.stock !== undefined && dto.stock < 0) {
      throw new BadRequestException('Stock must not be negative.');
    }

    let uploadedImage: { imageUrl: string; imagePath: string } | null = null;
    const oldImagePath = product.imagePath;

    if (file) {
      uploadedImage = await this.storageService.uploadProductImage(userId, file);
    }

    try {
      const updatedProduct = await this.prisma.product.update({
        where: { id: productId },
        data: {
          ...(dto.name !== undefined && { name: sanitizeHtml(dto.name) }),
          ...(dto.description !== undefined && { description: sanitizeHtml(dto.description) }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(dto.stock !== undefined && { stock: dto.stock }),
          ...(uploadedImage && {
            imageUrl: uploadedImage.imageUrl,
            imagePath: uploadedImage.imagePath,
          }),
        },
      });

      if (oldImagePath && uploadedImage) {
        await this.storageService.deleteProductImage(oldImagePath);
      }

      return updatedProduct;
    } catch (error) {
      if (uploadedImage) {
        await this.storageService.deleteProductImage(uploadedImage.imagePath);
      }
      throw error;
    }
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

    const now = await this.systemTime.getCurrentTime();

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

      await tx.deliveryJob.create({
        data: {
          orderId: orderId,
          deliveryMethod: order.deliveryMethod,
          deliveryFee: order.deliveryFee,
          status: 'AVAILABLE',
        },
      });

      return updatedOrder;
    });
  }
}
