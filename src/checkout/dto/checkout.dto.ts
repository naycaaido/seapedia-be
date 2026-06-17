import { IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DeliveryMethod } from '@prisma/client';

export class CheckoutDto {
  @ApiProperty({ example: 1, description: 'Address ID belonging to the buyer' })
  @IsNumber()
  @Min(1)
  addressId: number;

  @ApiProperty({
    enum: DeliveryMethod,
    example: DeliveryMethod.REGULAR,
    description: 'Delivery method',
  })
  @IsEnum(DeliveryMethod)
  deliveryMethod: DeliveryMethod;
}
