import { IsString, IsNumber, Min, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ValidateDiscountDto {
  @ApiProperty({ example: 'DISKON10' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 150000, description: 'Subtotal before discount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  subtotal!: number;
}
