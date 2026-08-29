import amqp, { ChannelModel, ConsumeMessage } from 'amqplib';
import pino from 'pino';

const EXCHANGE = 'keynest.events';
const DEAD_LETTER_EXCHANGE = 'keynest.events.dlx';
const QUEUE = 'keynest.security-events';
const DEAD_LETTER_QUEUE = 'keynest.security-events.dead';
const streams: pino.StreamEntry[] = [{ stream: process.stdout }];
if (process.env.LOG_FILE)
  streams.push({ stream: pino.destination(process.env.LOG_FILE) });
const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? 'info',
    base: {
      service: 'keynest-security-worker',
      environment: process.env.NODE_ENV ?? 'development',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream(streams),
);

let connection: ChannelModel | undefined;

async function main() {
  const url =
    process.env.RABBITMQ_URL ?? 'amqp://keynest:keynest@localhost:5673';
  connection = await amqp.connect(url);
  const channel = await connection.createChannel();
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
  await channel.prefetch(20);
  await channel.consume(QUEUE, (message) => processMessage(message), {
    noAck: false,
  });

  function processMessage(message: ConsumeMessage | null) {
    if (!message) return;
    try {
      const payload = JSON.parse(message.content.toString()) as Record<
        string,
        unknown
      >;
      if (
        typeof payload.id !== 'string' ||
        typeof payload.action !== 'string' ||
        typeof payload.targetType !== 'string'
      ) {
        throw new Error('Invalid security event envelope');
      }
      logger.info(
        {
          eventId: payload.id,
          action: payload.action,
          targetType: payload.targetType,
          outcome: payload.outcome,
          rabbitMessageId: message.properties.messageId,
        },
        'security_event.processed',
      );
      channel.ack(message);
    } catch (error) {
      logger.error(
        {
          rabbitMessageId: message.properties.messageId,
          error: error instanceof Error ? error.message : String(error),
        },
        'security_event.rejected',
      );
      channel.nack(message, false, false);
    }
  }

  logger.info({ queue: QUEUE, prefetch: 20 }, 'worker.ready');
}

async function shutdown(signal: string) {
  logger.info({ signal }, 'worker.shutdown');
  await connection?.close().catch(() => undefined);
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

main().catch((error: unknown) => {
  logger.fatal(
    { error: error instanceof Error ? error.message : String(error) },
    'worker.startup_failed',
  );
  process.exitCode = 1;
});
