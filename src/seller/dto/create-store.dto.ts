import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({ example: 'Toko Berkah' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Toko yang menjual berbagai kebutuhan sehari-hari.' })
  @IsString()
  @MaxLength(500)
  description: string;
}
