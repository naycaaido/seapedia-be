import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: number) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        products: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        sellerUser: {
          select: { fullName: true },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }
}
