import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ActiveRoles } from '../common/decorators/active-role.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('buyer/reports/spending')
  @ActiveRoles('Buyer')
  @ApiOperation({ summary: 'Get buyer spending report' })
  getBuyerSpending(@Req() req: any) {
    return this.reportsService.getBuyerSpending(req.user.id);
  }

  @Get('seller/reports/income')
  @ActiveRoles('Seller')
  @ApiOperation({ summary: 'Get seller income report' })
  getSellerIncome(@Req() req: any) {
    return this.reportsService.getSellerIncome(req.user.id);
  }
}
