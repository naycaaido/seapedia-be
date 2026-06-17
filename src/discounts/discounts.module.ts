import { Module } from '@nestjs/common';
import { DiscountsController } from './discounts.controller';
import { AdminDiscountsController } from './admin-discounts.controller';
import { DiscountsService } from './discounts.service';

@Module({
  controllers: [DiscountsController, AdminDiscountsController],
  providers: [DiscountsService],
  exports: [DiscountsService],
})
export class DiscountsModule {}
