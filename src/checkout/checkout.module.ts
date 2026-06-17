import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { WalletModule } from '../wallet/wallet.module';
import { CartModule } from '../cart/cart.module';
import { AddressesModule } from '../addresses/addresses.module';
import { DiscountsModule } from '../discounts/discounts.module';

@Module({
  imports: [WalletModule, CartModule, AddressesModule, DiscountsModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
