import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ActiveRoles } from '../common/decorators/active-role.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@ActiveRoles('Admin')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Admin dashboard summary' })
  getSummary() {
    return this.adminService.getSummary();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users with roles' })
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get('stores')
  @ApiOperation({ summary: 'List all stores with product count' })
  listStores() {
    return this.adminService.listStores();
  }

  @Get('products')
  @ApiOperation({ summary: 'List all products including deleted' })
  listProducts() {
    return this.adminService.listProducts();
  }

  @Get('orders')
  @ApiOperation({ summary: 'List all orders' })
  listOrders() {
    return this.adminService.listOrders();
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get full order detail' })
  getOrderDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getOrderDetail(id);
  }

  @Get('delivery-jobs')
  @ApiOperation({ summary: 'List all delivery jobs' })
  listDeliveryJobs() {
    return this.adminService.listDeliveryJobs();
  }

  @Get('discounts')
  @ApiOperation({ summary: 'List vouchers and promos with active/expired status' })
  listDiscounts() {
    return this.adminService.listDiscounts();
  }

  @Get('overdue-orders')
  @ApiOperation({ summary: 'Detect overdue orders' })
  getOverdueOrders() {
    return this.adminService.getOverdueOrders();
  }

  @Get('system-time')
  @ApiOperation({ summary: 'Get current system time' })
  getSystemTime() {
    return this.adminService.getSystemTime();
  }

  @Post('system-time/simulate-next-day')
  @ApiOperation({ summary: 'Advance system time by 1 day' })
  simulateNextDay(@Req() req: any) {
    return this.adminService.simulateNextDay(req.user.id);
  }

  @Post('orders/:id/refund')
  @ApiOperation({ summary: 'Refund a single overdue order' })
  refundOrder(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.adminService.refundOrder(id, req.user.id);
  }

  @Post('overdue-orders/refund-all')
  @ApiOperation({ summary: 'Refund all eligible overdue orders' })
  refundAllOverdueOrders(@Req() req: any) {
    return this.adminService.refundAllOverdueOrders(req.user.id);
  }
}
