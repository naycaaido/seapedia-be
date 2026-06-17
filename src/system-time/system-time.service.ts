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

  async setCurrentTime(newTime: Date, updatedByUserId?: number) {
    const existing = await this.prisma.systemSetting.findFirst({
      orderBy: { id: 'asc' },
    });

    if (existing) {
      return this.prisma.systemSetting.update({
        where: { id: existing.id },
        data: {
          currentDatetime: newTime,
          ...(updatedByUserId && { updatedByUserId }),
        },
      });
    }

    return this.prisma.systemSetting.create({
      data: {
        currentDatetime: newTime,
        ...(updatedByUserId && { updatedByUserId }),
      },
    });
  }

  async nextDay(updatedByUserId?: number) {
    const currentTime = await this.getCurrentTime();
    const nextDayTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
    return this.setCurrentTime(nextDayTime, updatedByUserId);
  }
}
