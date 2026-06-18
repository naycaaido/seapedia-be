import { IsString, IsEmail, IsArray, ArrayMinSize, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username!: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({ example: '08123456789' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+62|62|0)[0-9]{8,12}$/, { message: 'Phone must be a valid Indonesian number (e.g. 08123456789, 628123456789, or +628123456789)' })
  phone?: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: ['Buyer', 'Seller'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  roles!: string[];
}
