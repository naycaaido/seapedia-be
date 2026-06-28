import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddRoleDto {
  @ApiProperty({ example: 'Seller', description: 'Role to add to the account', enum: ['Seller', 'Buyer', 'Driver'] })
  @IsString()
  @IsIn(['Seller', 'Buyer', 'Driver'])
  role!: string;
}
