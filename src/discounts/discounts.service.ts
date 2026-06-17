import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, DiscountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SystemTimeService } from '../system-time/system-time.service';

export interface DiscountResult {
  discountAmount: Prisma.Decimal;
  voucherId: number | null;
  promoId: number | null;
  discountType: DiscountType;
  discountValue: Prisma.Decimal;
  originalDiscount: Prisma.Decimal;
}

@Injectable()
export class DiscountsService {
  constructor(
    private prisma: PrismaService,
    private systemTime: SystemTimeService,
  ) {}

  async listActiveVouchers() {
    const now = await this.systemTime.getCurrentTime();
    return this.prisma.voucher.findMany({
      where: {
        isActive: true,
        expiryDate: { gt: now },
        remainingUsage: { gt: 0 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listActivePromos() {
    const now = await this.systemTime.getCurrentTime();
    return this.prisma.promo.findMany({
      where: {
        isActive: true,
        expiryDate: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async validateCode(code: string, subtotal: Prisma.Decimal) {
    const now = await this.systemTime.getCurrentTime();

    const voucher = await this.prisma.voucher.findUnique({
      where: { code },
    });

    if (voucher) {
      return this.validateVoucher(voucher, subtotal, now);
    }

    const promo = await this.prisma.promo.findUnique({
      where: { code },
    });

    if (promo) {
      return this.validatePromo(promo, subtotal, now);
    }

    throw new NotFoundException('Discount code not found');
  }

  async validateAndApply(
    code: string | undefined,
    subtotal: Prisma.Decimal,
  ): Promise<DiscountResult> {
    if (!code) {
      return {
        discountAmount: new Prisma.Decimal(0),
        voucherId: null,
        promoId: null,
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Prisma.Decimal(0),
        originalDiscount: new Prisma.Decimal(0),
      };
    }

    const now = await this.systemTime.getCurrentTime();

    const voucher = await this.prisma.voucher.findUnique({
      where: { code },
    });

    if (voucher) {
      const validated = this.validateVoucher(voucher, subtotal, now);
      return {
        discountAmount: validated.discountAmount,
        voucherId: voucher.id,
        promoId: null,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        originalDiscount: validated.originalDiscount,
      };
    }

    const promo = await this.prisma.promo.findUnique({
      where: { code },
    });

    if (promo) {
      const validated = this.validatePromo(promo, subtotal, now);
      return {
        discountAmount: validated.discountAmount,
        voucherId: null,
        promoId: promo.id,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        originalDiscount: validated.originalDiscount,
      };
    }

    throw new NotFoundException('Discount code not found');
  }

  private validateVoucher(
    voucher: any,
    subtotal: Prisma.Decimal,
    now: Date,
  ) {
    if (!voucher.isActive) {
      throw new BadRequestException('Voucher is not active');
    }

    if (voucher.expiryDate <= now) {
      throw new BadRequestException('Voucher has expired');
    }

    if (voucher.remainingUsage <= 0) {
      throw new BadRequestException('Voucher has no remaining usage');
    }

    if (
      voucher.minPurchaseAmount &&
      subtotal.lessThan(voucher.minPurchaseAmount)
    ) {
      throw new BadRequestException(
        `Minimum purchase amount is Rp ${voucher.minPurchaseAmount.toString()}`,
      );
    }

    const discountAmount = this.computeDiscount(
      voucher.discountType,
      voucher.discountValue,
      voucher.maxDiscountAmount,
      subtotal,
    );

    return {
      code: voucher.code,
      type: 'voucher' as const,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      discountAmount,
      originalDiscount: discountAmount,
      minPurchaseAmount: voucher.minPurchaseAmount,
      maxDiscountAmount: voucher.maxDiscountAmount,
    };
  }

  private validatePromo(
    promo: any,
    subtotal: Prisma.Decimal,
    now: Date,
  ) {
    if (!promo.isActive) {
      throw new BadRequestException('Promo is not active');
    }

    if (promo.expiryDate <= now) {
      throw new BadRequestException('Promo has expired');
    }

    if (
      promo.minPurchaseAmount &&
      subtotal.lessThan(promo.minPurchaseAmount)
    ) {
      throw new BadRequestException(
        `Minimum purchase amount is Rp ${promo.minPurchaseAmount.toString()}`,
      );
    }

    const discountAmount = this.computeDiscount(
      promo.discountType,
      promo.discountValue,
      promo.maxDiscountAmount,
      subtotal,
    );

    return {
      code: promo.code,
      type: 'promo' as const,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discountAmount,
      originalDiscount: discountAmount,
      minPurchaseAmount: promo.minPurchaseAmount,
      maxDiscountAmount: promo.maxDiscountAmount,
    };
  }

  async createVoucher(dto: {
    name: string;
    code: string;
    description?: string;
    discountType: DiscountType;
    discountValue: number;
    maxDiscountAmount?: number;
    minPurchaseAmount?: number;
    remainingUsage: number;
    expiryDate: string;
    isActive?: boolean;
  }) {
    try {
      return await this.prisma.voucher.create({
        data: {
          name: dto.name,
          code: dto.code,
          description: dto.description,
          discountType: dto.discountType,
          discountValue: dto.discountValue,
          maxDiscountAmount: dto.maxDiscountAmount,
          minPurchaseAmount: dto.minPurchaseAmount,
          remainingUsage: dto.remainingUsage,
          expiryDate: new Date(dto.expiryDate),
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new BadRequestException(
          'A voucher with this code already exists',
        );
      }
      throw error;
    }
  }

  async createPromo(dto: {
    name: string;
    code: string;
    description?: string;
    discountType: DiscountType;
    discountValue: number;
    maxDiscountAmount?: number;
    minPurchaseAmount?: number;
    expiryDate: string;
    isActive?: boolean;
  }) {
    try {
      return await this.prisma.promo.create({
        data: {
          name: dto.name,
          code: dto.code,
          description: dto.description,
          discountType: dto.discountType,
          discountValue: dto.discountValue,
          maxDiscountAmount: dto.maxDiscountAmount,
          minPurchaseAmount: dto.minPurchaseAmount,
          expiryDate: new Date(dto.expiryDate),
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new BadRequestException(
          'A promo with this code already exists',
        );
      }
      throw error;
    }
  }

  computeDiscount(
    discountType: DiscountType,
    discountValue: Prisma.Decimal,
    maxDiscountAmount: Prisma.Decimal | null,
    subtotal: Prisma.Decimal,
  ): Prisma.Decimal {
    let discount: Prisma.Decimal;

    if (discountType === DiscountType.PERCENTAGE) {
      discount = subtotal.mul(discountValue).div(100);
      if (maxDiscountAmount && discount.greaterThan(maxDiscountAmount)) {
        discount = maxDiscountAmount;
      }
    } else {
      discount = discountValue;
    }

    if (discount.greaterThan(subtotal)) {
      discount = subtotal;
    }

    return discount;
  }
}
