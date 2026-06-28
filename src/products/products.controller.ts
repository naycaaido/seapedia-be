import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all active products' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search products by name or description' })
  findAll(@Query('search') search?: string) {
    return this.productsService.findAll(search);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get product detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }
}
