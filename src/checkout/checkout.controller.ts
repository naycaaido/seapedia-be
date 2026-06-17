import { Controller, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
import { ActiveRoles } from '../common/decorators/active-role.decorator';

@ApiTags('Checkout')
@ApiBearerAuth()
@ActiveRoles('Buyer')
@Controller('checkout')
export class CheckoutController {
  constructor(private checkoutService: CheckoutService) {}

  @Post()
  @ApiOperation({ summary: 'Process checkout from cart' })
  checkout(@Req() req: any, @Body() dto: CheckoutDto) {
    return this.checkoutService.checkout(req.user.id, dto);
  }
}
