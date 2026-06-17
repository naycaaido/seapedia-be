import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';

export class CreatePromoDto {
  @ApiProperty({ example: 'Promo Cashback 20rb' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'CASHBACK20' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'Cashback Rp 20.000 untuk pembelian minimal Rp 200.000' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.FIXED_AMOUNT })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({ example: 20000 })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ example: 20000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ example: 200000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchaseAmount?: number;

  @ApiProperty({ example: '2026-12-31T23:59:59Z' })
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
