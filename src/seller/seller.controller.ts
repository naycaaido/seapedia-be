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
import { SellerService } from './seller.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ActiveRoles } from '../common/decorators/active-role.decorator';

@ApiTags('Seller')
@ApiBearerAuth()
@ActiveRoles('Seller')
@Controller('seller')
export class SellerController {
  constructor(private sellerService: SellerService) {}

  // --- Store ---

  @Get('store')
  @ApiOperation({ summary: 'View own store' })
  getStore(@Req() req: any) {
    return this.sellerService.getStore(req.user.id);
  }

  @Post('store')
  @ApiOperation({ summary: 'Create store' })
  createStore(@Req() req: any, @Body() dto: CreateStoreDto) {
    return this.sellerService.createStore(req.user.id, dto);
  }

  @Patch('store')
  @ApiOperation({ summary: 'Update own store' })
  updateStore(@Req() req: any, @Body() dto: UpdateStoreDto) {
    return this.sellerService.updateStore(req.user.id, dto);
  }

  // --- Products ---

  @Get('products')
  @ApiOperation({ summary: 'List own products' })
  listProducts(@Req() req: any) {
    return this.sellerService.listProducts(req.user.id);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'View own product' })
  getProduct(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.sellerService.getProduct(req.user.id, id);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create product under own store' })
  createProduct(@Req() req: any, @Body() dto: CreateProductDto) {
    return this.sellerService.createProduct(req.user.id, dto);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update own product' })
  updateProduct(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.sellerService.updateProduct(req.user.id, id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Soft delete own product' })
  deleteProduct(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.sellerService.deleteProduct(req.user.id, id);
  }

  // --- Dashboard ---

  @Get('dashboard')
  @ApiOperation({ summary: 'Seller dashboard summary' })
  getDashboard(@Req() req: any) {
    return this.sellerService.getDashboardSummary(req.user.id);
  }
}
