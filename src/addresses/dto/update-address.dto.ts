import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAddressDto {
  @ApiPropertyOptional({ example: 'Budi Santoso' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  recipientName?: string;

  @ApiPropertyOptional({ example: '08123456789' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'Jl. Sudirman No. 123, Blok A' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  addressDetail?: string;

  @ApiPropertyOptional({ example: 'Jakarta Selatan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'DKI Jakarta' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({ example: '12190' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;
}
