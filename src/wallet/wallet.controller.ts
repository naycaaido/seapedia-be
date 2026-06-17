import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { TopUpDto } from './dto/top-up.dto';
import { ActiveRoles } from '../common/decorators/active-role.decorator';

@ApiTags('Wallet')
@ApiBearerAuth()
@ActiveRoles('Buyer')
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get wallet balance' })
  getWallet(@Req() req: any) {
    return this.walletService.getWallet(req.user.id);
  }

  @Post('top-up')
  @ApiOperation({ summary: 'Top up wallet (dummy simulation)' })
  topUp(@Req() req: any, @Body() dto: TopUpDto) {
    return this.walletService.topUp(req.user.id, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get wallet transaction history' })
  getTransactions(@Req() req: any) {
    return this.walletService.getTransactions(req.user.id);
  }
}
