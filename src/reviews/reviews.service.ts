import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { sanitizeHtml } from '../common/utils/sanitize-html';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.applicationReview.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateReviewDto, userId?: number) {
    return this.prisma.applicationReview.create({
      data: {
        reviewerName: sanitizeHtml(dto.reviewerName),
        rating: dto.rating,
        comment: sanitizeHtml(dto.comment),
        userId: userId || null,
      },
    });
  }
}
