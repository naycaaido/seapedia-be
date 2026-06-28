import { IsString, MinLength, MaxLength, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Headphone Bluetooth' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'Headphone nirkabel dengan noise cancellation.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ example: 350000 })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 25 })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  stock!: number;
}
