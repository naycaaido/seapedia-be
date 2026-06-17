import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ActiveRoles } from '../common/decorators/active-role.decorator';

@ApiTags('Cart')
@ApiBearerAuth()
@ActiveRoles('Buyer')
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get cart with items' })
  getCart(@Req() req: any) {
    return this.cartService.getOrCreateCart(req.user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart (or update quantity if exists)' })
  addItem(@Req() req: any, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(req.user.id, dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateItem(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(req.user.id, id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  removeItem(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.cartService.removeItem(req.user.id, id);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear all items from cart' })
  clearCart(@Req() req: any) {
    return this.cartService.clearCart(req.user.id);
  }
}
