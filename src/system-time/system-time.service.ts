import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemTimeService {
  constructor(private prisma: PrismaService) {}

  async getCurrentTime(): Promise<Date> {
    const setting = await this.prisma.systemSetting.findFirst({
      orderBy: { id: 'asc' },
    });

    if (setting) {
      return setting.currentDatetime;
    }

    return new Date();
  }
}
