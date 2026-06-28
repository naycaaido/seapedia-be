import {
  IsNumber,
  IsEnum,
  Min,
  IsOptional,
  IsString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryMethod } from '../../../prisma/generated/client';

@ValidatorConstraint({ name: 'DiscountCodeMutuallyExclusive', async: false })
class DiscountCodeMutuallyExclusive implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments) {
    const obj = args.object as any;
    if (obj.voucherCode && obj.promoCode) {
      return false;
    }
    return true;
  }

  defaultMessage() {
    return 'Only one of voucherCode or promoCode can be provided, not both';
  }
}

export class CheckoutDto {
  @ApiProperty({ example: 1, description: 'Address ID belonging to the buyer' })
  @IsNumber()
  @Min(1)
  addressId!: number;

  @ApiProperty({
    enum: DeliveryMethod,
    example: DeliveryMethod.REGULAR,
    description: 'Delivery method',
  })
  @IsEnum(DeliveryMethod)
  deliveryMethod!: DeliveryMethod;

  @ApiPropertyOptional({
    example: 'DISKON10',
    description: 'Voucher code (mutually exclusive with promoCode)',
  })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({
    example: 'CASHBACK20',
    description: 'Promo code (mutually exclusive with voucherCode)',
  })
  @IsOptional()
  @IsString()
  promoCode?: string;

  @Validate(DiscountCodeMutuallyExclusive)
  _discountCodeCheck: any;
}
