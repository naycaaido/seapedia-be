import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStoreDto {
  @ApiPropertyOptional({ example: 'Toko Berkah Jaya' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Toko yang menjual berbagai kebutuhan rumah tangga.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
