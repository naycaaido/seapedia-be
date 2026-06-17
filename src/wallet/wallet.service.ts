import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TopUpDto } from './dto/top-up.dto';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateWallet(userId: number) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId },
      });
    }

    return wallet;
  }

  async getWallet(userId: number) {
    return this.getOrCreateWallet(userId);
  }

  async topUp(userId: number, dto: TopUpDto) {
    const wallet = await this.getOrCreateWallet(userId);

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: dto.amount },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'TOP_UP',
          amount: dto.amount,
          description: `Top-up sebesar Rp ${dto.amount.toLocaleString('id-ID')}`,
        },
      });

      return updated;
    });

    return result;
  }

  async getTransactions(userId: number) {
    const wallet = await this.getOrCreateWallet(userId);

    return this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
