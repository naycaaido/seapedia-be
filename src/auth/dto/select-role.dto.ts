import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectRoleDto {
  @ApiProperty({ example: 'Buyer', description: 'Role to activate', enum: ['Seller', 'Buyer', 'Driver'] })
  @IsString()
  @IsIn(['Seller', 'Buyer', 'Driver'])
  role: string;
}
