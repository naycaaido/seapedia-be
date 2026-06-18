import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @MinLength(1)
  username!: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(1)
  password!: string;
}
