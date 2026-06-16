import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.applicationReview.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateReviewDto, userId?: number) {
    const sanitizedComment = dto.comment
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return this.prisma.applicationReview.create({
      data: {
        reviewerName: dto.reviewerName,
        rating: dto.rating,
        comment: sanitizedComment,
        userId: userId || null,
      },
    });
  }
}
