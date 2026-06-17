import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DiscountsService } from './discounts.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { CreatePromoDto } from './dto/create-promo.dto';
import { ActiveRoles } from '../common/decorators/active-role.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@ActiveRoles('Admin')
@Controller('admin')
export class AdminDiscountsController {
  constructor(private discountsService: DiscountsService) {}

  @Post('vouchers')
  @ApiOperation({ summary: 'Create a new voucher (Admin only)' })
  createVoucher(@Body() dto: CreateVoucherDto) {
    return this.discountsService.createVoucher(dto);
  }

  @Post('promos')
  @ApiOperation({ summary: 'Create a new promo (Admin only)' })
  createPromo(@Body() dto: CreatePromoDto) {
    return this.discountsService.createPromo(dto);
  }
}
