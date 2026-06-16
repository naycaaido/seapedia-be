import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all application reviews' })
  findAll() {
    return this.reviewsService.findAll();
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit an application review (public)' })
  create(@Body() dto: CreateReviewDto, @Req() req: any) {
    const userId = req.user?.id || undefined;
    return this.reviewsService.create(dto, userId);
  }
}
