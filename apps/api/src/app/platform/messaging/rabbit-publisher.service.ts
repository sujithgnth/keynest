import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import amqp, { ChannelModel, ConfirmChannel } from 'amqplib';
import { KeyNestLogger } from '../observability/keynest-logger.service';

const EXCHANGE = 'keynest.events';
const DEAD_LETTER_EXCHANGE = 'keynest.events.dlx';
const QUEUE = 'keynest.security-events';
const DEAD_LETTER_QUEUE = 'keynest.security-events.dead';

@Injectable()
export class RabbitPublisherService implements OnModuleInit, OnModuleDestroy {
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;

  constructor(private readonly logger: KeyNestLogger) {}

  async onModuleInit() {
    await this.getChannel();
  }

  isReady() {
    return Boolean(this.connection && this.channel);
  }

  async publish(messageId: string, eventType: string, payload: unknown) {
    const channel = await this.getChannel();
    channel.publish(EXCHANGE, eventType, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      contentType: 'application/json',
      messageId,
      timestamp: Date.now(),
      type: eventType,
    });
    await channel.waitForConfirms();
  }

  async onModuleDestroy() {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  private async getChannel(): Promise<ConfirmChannel> {
    if (this.channel) return this.channel;
    const url =
      process.env.RABBITMQ_URL ?? 'amqp://keynest:keynest@localhost:5673';
    if (process.env.NODE_ENV === 'production' && !process.env.RABBITMQ_URL) {
      throw new Error('RABBITMQ_URL is required in production');
    }
    this.connection = await amqp.connect(url);
    this.connection.on('close', () => {
      this.connection = undefined;
      this.channel = undefined;
    });
    this.connection.on('error', (error) =>
      this.logger.failure('rabbitmq.connection.error', error),
    );
    const channel = await this.connection.createConfirmChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'fanout', {
      durable: true,
    });
    await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
    await channel.bindQueue(DEAD_LETTER_QUEUE, DEAD_LETTER_EXCHANGE, '');
    await channel.assertQueue(QUEUE, {
      durable: true,
      arguments: { 'x-dead-letter-exchange': DEAD_LETTER_EXCHANGE },
    });
    await channel.bindQueue(QUEUE, EXCHANGE, 'audit.*');
    this.channel = channel;
    this.logger.info('rabbitmq.publisher.ready', {
      exchange: EXCHANGE,
      queue: QUEUE,
    });
    return channel;
  }
}
