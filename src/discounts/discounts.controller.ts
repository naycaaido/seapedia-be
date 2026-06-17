import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DiscountsService } from './discounts.service';
import { ActiveRoles } from '../common/decorators/active-role.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Prisma } from '@prisma/client';
import { ValidateDiscountDto } from './dto/validate-discount.dto';

@ApiTags('Discounts')
@Controller('discounts')
export class DiscountsController {
  constructor(private discountsService: DiscountsService) {}

  @Public()
  @Get('vouchers')
  @ApiOperation({ summary: 'List all active vouchers' })
  listVouchers() {
    return this.discountsService.listActiveVouchers();
  }

  @Public()
  @Get('promos')
  @ApiOperation({ summary: 'List all active promos' })
  listPromos() {
    return this.discountsService.listActivePromos();
  }

  @ApiBearerAuth()
  @ActiveRoles('Buyer')
  @Get('validate')
  @ApiOperation({ summary: 'Validate a discount code' })
  @ApiQuery({ name: 'code', type: String })
  @ApiQuery({ name: 'subtotal', type: Number })
  validateCode(@Query() query: ValidateDiscountDto) {
    return this.discountsService.validateCode(
      query.code,
      new Prisma.Decimal(query.subtotal),
    );
  }
}
