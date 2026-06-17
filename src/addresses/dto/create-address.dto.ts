import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'Budi Santoso' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  recipientName: string;

  @ApiProperty({ example: '08123456789' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: 'Jl. Sudirman No. 123, Blok A' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  addressDetail: string;

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

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
