import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { DriverService } from './driver.service';
import { ActiveRoles } from '../common/decorators/active-role.decorator';

@ApiTags('Driver')
@ApiBearerAuth()
@ActiveRoles('Driver')
@Controller('driver')
export class DriverController {
  constructor(private driverService: DriverService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'List available delivery jobs' })
  listJobs() {
    return this.driverService.listAvailableJobs();
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'View available job detail' })
  getJob(@Param('id', ParseIntPipe) id: number) {
    return this.driverService.getAvailableJobDetail(id);
  }

  @Post('jobs/:id/take')
  @ApiOperation({ summary: 'Take a delivery job' })
  takeJob(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.driverService.takeJob(req.user.id, id);
  }

  @Post('jobs/:id/complete')
  @ApiOperation({ summary: 'Complete a delivery job' })
  completeJob(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.driverService.completeJob(req.user.id, id);
  }

  @Get('history')
  @ApiOperation({ summary: 'View delivery history' })
  getHistory(@Req() req: any) {
    return this.driverService.getDeliveryHistory(req.user.id);
  }

  @Get('earnings')
  @ApiOperation({
    summary: 'View earnings summary',
    description: 'Returns earnings analytics including summary, monthly trends, breakdowns by delivery method/status, and export-ready earnings rows.',
  })
  @ApiOkResponse({
    description: 'Driver earnings report with financial analytics',
  })
  getEarnings(@Req() req: any) {
    return this.driverService.getEarnings(req.user.id);
  }
}
