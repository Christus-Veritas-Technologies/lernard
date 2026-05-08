import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { PlanLimitsGuard } from '../common/guards/plan-limits.guard';

@Global()
@Module({
  providers: [RedisService, PlanLimitsGuard],
  exports: [RedisService, PlanLimitsGuard],
})
export class RedisModule {}
