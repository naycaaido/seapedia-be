import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ActiveRoles } from '../common/decorators/active-role.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('buyer/reports/spending')
  @ActiveRoles('Buyer')
  @ApiOperation({
    summary: 'Get buyer spending report',
    description: 'Returns spending analytics including summary, monthly trends, breakdowns by store/delivery/status, top products, and export-ready order rows.',
  })
  @ApiOkResponse({
    description: 'Buyer spending report with financial analytics',
  })
  getBuyerSpending(@Req() req: any) {
    return this.reportsService.getBuyerSpending(req.user.id);
  }

  @Get('seller/reports/income')
  @ActiveRoles('Seller')
  @ApiOperation({
    summary: 'Get seller income report',
    description: 'Returns income analytics including summary, monthly trends, breakdowns by product/status/delivery, and export-ready income rows.',
  })
  @ApiOkResponse({
    description: 'Seller income report with financial analytics',
  })
  getSellerIncome(@Req() req: any) {
    return this.reportsService.getSellerIncome(req.user.id);
  }
}
