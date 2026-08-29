import { Global, Module } from '@nestjs/common';
import { ObservabilityModule } from '../observability/observability.module';
import { RabbitPublisherService } from './rabbit-publisher.service';

@Global()
@Module({
  imports: [ObservabilityModule],
  providers: [RabbitPublisherService],
  exports: [RabbitPublisherService],
})
export class MessagingModule {}
