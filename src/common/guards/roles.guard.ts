import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/active-role.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('No authenticated user');
    }
    if (!user.activeRole) {
      throw new ForbiddenException('No active role selected');
    }
    if (!requiredRoles.includes(user.activeRole)) {
      throw new ForbiddenException(`Access denied. Required role: ${requiredRoles.join(', ')}`);
    }
    return true;
  }
}
