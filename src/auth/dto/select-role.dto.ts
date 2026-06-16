import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectRoleDto {
  @ApiProperty({ example: 'Buyer', description: 'Role to activate' })
  @IsString()
  role: string;
}
