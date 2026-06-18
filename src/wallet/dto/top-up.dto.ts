import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TopUpDto {
  @ApiProperty({ example: 500000, description: 'Top-up amount (minimum 1000)' })
  @IsNumber()
  @Min(1000)
  amount!: number;
}
