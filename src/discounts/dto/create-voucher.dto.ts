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

export class CreateVoucherDto {
  @ApiProperty({ example: 'Diskon 10%' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'DISKON10' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'Voucher diskon 10% untuk semua produk' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ example: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchaseAmount?: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  remainingUsage: number;

  @ApiProperty({ example: '2026-12-31T23:59:59Z' })
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
