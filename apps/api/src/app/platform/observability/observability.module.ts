import { Global, Module } from '@nestjs/common';
import { KeyNestLogger } from './keynest-logger.service';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [KeyNestLogger, MetricsService],
  exports: [KeyNestLogger, MetricsService],
})
export class ObservabilityModule {}
