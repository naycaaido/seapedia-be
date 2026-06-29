import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SelectRoleDto } from './dto/select-role.dto';
import { AddRoleDto } from './dto/add-role.dto';
import { RoleName } from '../../prisma/generated/client';
import { MulterFile } from '../common/types/multer-file';
import { sanitizeHtml } from '../common/utils/sanitize-html';

const VALID_NON_ADMIN_ROLES = [RoleName.Seller, RoleName.Buyer, RoleName.Driver] as const;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private storageService: SupabaseStorageService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.username }, { email: dto.email }],
      },
    });
    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const invalidRoles = dto.roles.filter((r) => !VALID_NON_ADMIN_ROLES.includes(r as typeof VALID_NON_ADMIN_ROLES[number]));
    if (invalidRoles.length > 0) {
      throw new BadRequestException(`Invalid roles: ${invalidRoles.join(', ')}`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const roleRecords = await this.prisma.role.findMany({
      where: { name: { in: dto.roles as RoleName[] } },
    });

    if (roleRecords.length !== dto.roles.length) {
      throw new BadRequestException('One or more roles not found in system');
    }

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        fullName: sanitizeHtml(dto.fullName),
        phone: dto.phone,
        passwordHash,
        userRoles: {
          create: roleRecords.map((role) => ({ roleId: role.id })),
        },
      },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    return this.buildUserResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildUserResponse(user);
  }

  async getProfile(userId: number, activeRole?: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.buildUserResponse(user, activeRole);
  }

  async selectRole(userId: number, dto: SelectRoleDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roleNames = user.userRoles.map((ur) => ur.role.name);
    if (!roleNames.includes(dto.role as RoleName)) {
      throw new BadRequestException('User does not have the specified role');
    }

    return this.buildUserResponse(user, dto.role);
  }

  async addRole(userId: number, dto: AddRoleDto, currentActiveRole?: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const alreadyHasRole = user.userRoles.some(
      (ur) => ur.role.name === (dto.role as RoleName),
    );
    if (alreadyHasRole) {
      return this.buildUserResponse(user, currentActiveRole);
    }

    const roleRecord = await this.prisma.role.findUnique({
      where: { name: dto.role as RoleName },
    });

    if (!roleRecord) {
      throw new BadRequestException('Role not found in system');
    }

    await this.prisma.userRole.create({
      data: {
        userId,
        roleId: roleRecord.id,
      },
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    return this.buildUserResponse(updatedUser!, currentActiveRole);
  }

  async updateProfilePhoto(userId: number, file: MulterFile) {
    const uploaded = await this.storageService.uploadProfilePhoto(userId, file);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: uploaded.imageUrl },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    return this.buildUserResponse(user);
  }

  private buildUserResponse(user: any, activeRole?: string | null) {
    const roles = user.userRoles.map((ur: any) => ur.role.name);

    // Auto-select active role for single-role users
    // When activeRole is undefined (login/register), auto-select if only one role exists
    if (activeRole === undefined && roles.length === 1) {
      activeRole = roles[0];
    }

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      activeRole: activeRole || null,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        profileImageUrl: user.profileImageUrl,
      },
      roles,
      activeRole: activeRole || null,
      accessToken: token,
    };
  }
}
