import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateDiscountDto {
  @ApiProperty({ example: 'DISKON10' })
  @IsString()
  code: string;

  @ApiProperty({ example: 150000, description: 'Subtotal before discount' })
  @IsNumber()
  @Min(0)
  subtotal: number;
}
