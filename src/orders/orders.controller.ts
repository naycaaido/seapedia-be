import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { ActiveRoles } from '../common/decorators/active-role.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @ActiveRoles('Buyer')
  @ApiOperation({ summary: 'List buyer orders' })
  findBuyerOrders(@Req() req: any) {
    return this.ordersService.findBuyerOrders(req.user.id);
  }

  @Get(':id')
  @ActiveRoles('Buyer')
  @ApiOperation({ summary: 'Get buyer order detail' })
  findBuyerOrderDetail(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.findBuyerOrderDetail(req.user.id, id);
  }
}
