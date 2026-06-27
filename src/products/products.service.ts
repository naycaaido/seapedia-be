import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string) {
    return this.prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(search?.trim()
          ? {
              OR: [
                { name: { contains: search.trim(), mode: 'insensitive' } },
                { description: { contains: search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        storeId: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        imageUrl: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        store: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        storeId: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        imageUrl: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        store: {
          select: { id: true, name: true, description: true },
        },
      },
    });

    if (!product || product.deletedAt !== null) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }
}
