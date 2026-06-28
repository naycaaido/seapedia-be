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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { SellerService } from './seller.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ActiveRoles } from '../common/decorators/active-role.decorator';
import { MulterFile } from '../common/types/multer-file';

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
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type. Accepted types: image/jpeg, image/png, image/webp'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Create product under own store' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'description', 'price', 'stock', 'image'],
      properties: {
        name: { type: 'string', example: 'Headphone Bluetooth' },
        description: { type: 'string', example: 'Headphone nirkabel dengan noise cancellation.' },
        price: { type: 'number', example: 350000 },
        stock: { type: 'number', example: 25 },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  createProduct(
    @Req() req: any,
    @Body() dto: CreateProductDto,
    @UploadedFile() file: MulterFile,
  ) {
    return this.sellerService.createProduct(req.user.id, dto, file);
  }

  @Patch('products/:id')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type. Accepted types: image/jpeg, image/png, image/webp'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Update own product' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Headphone Bluetooth V2' },
        description: { type: 'string', example: 'Headphone nirkabel dengan noise cancellation v2.' },
        price: { type: 'number', example: 300000 },
        stock: { type: 'number', example: 50 },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  updateProduct(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @UploadedFile() file?: MulterFile,
  ) {
    return this.sellerService.updateProduct(req.user.id, id, dto, file);
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

  // --- Orders ---

  @Get('orders')
  @ApiOperation({ summary: 'List orders for own store' })
  listOrders(@Req() req: any) {
    return this.sellerService.listOrders(req.user.id);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get order detail for own store' })
  getOrder(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.sellerService.getOrder(req.user.id, id);
  }

  @Post('orders/:id/process')
  @ApiOperation({ summary: 'Process order from SEDANG_DIKEMAS to MENUNGGU_PENGIRIM' })
  processOrder(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.sellerService.processOrder(req.user.id, id);
  }
}
