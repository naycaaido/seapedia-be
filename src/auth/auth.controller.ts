import { Controller, Post, Get, Patch, Body, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SelectRoleDto } from './dto/select-role.dto';
import { AddRoleDto } from './dto/add-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { MulterFile } from '../common/types/multer-file';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ summary: 'Login and get access token' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (client-side token removal)' })
  logout() {
    return { message: 'Logged out successfully. Remove the token on the client.' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile with roles' })
  getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.id, req.user.activeRole);
  }

  @UseGuards(JwtAuthGuard)
  @Post('select-role')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Select active role for current session' })
  selectRole(@Req() req: any, @Body() dto: SelectRoleDto) {
    return this.authService.selectRole(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('roles')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a new role to the current account' })
  addRole(@Req() req: any, @Body() dto: AddRoleDto) {
    return this.authService.addRole(req.user.id, dto, req.user.activeRole);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profile information (fullName, phone)' })
  updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto, req.user.activeRole);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile-photo')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload or update profile photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['photo'],
      properties: {
        photo: { type: 'string', format: 'binary', description: 'Profile photo (jpeg, png, webp, max 5MB)' },
      },
    },
  })
  updateProfilePhoto(@Req() req: any, @UploadedFile() file: MulterFile) {
    return this.authService.updateProfilePhoto(req.user.id, file);
  }
}
