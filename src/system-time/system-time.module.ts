import { Module, Global } from '@nestjs/common';
import { SystemTimeService } from './system-time.service';

@Global()
@Module({
  providers: [SystemTimeService],
  exports: [SystemTimeService],
})
export class SystemTimeModule {}
