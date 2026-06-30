import { IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Aido Nayaka' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: '08123456789' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+62|62|0)[0-9]{8,12}$/, { message: 'Phone must be a valid Indonesian number (e.g. 08123456789, 628123456789, or +628123456789)' })
  phone?: string;
}
