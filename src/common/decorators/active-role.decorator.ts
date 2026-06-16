import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'activeRoles';
export const ActiveRoles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
