import {
  Global,
  Inject,
  Injectable,
  Module,
  OnModuleDestroy,
} from '@nestjs/common';
import { Db, MongoClient } from 'mongodb';
import { MONGO_CLIENT, MONGO_DATABASE } from './database.constants';

function mongoUrl(): string {
  const configured = process.env.MONGODB_URI;
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('MONGODB_URI is required in production');
  }
  return 'mongodb://localhost:27018/keynest?replicaSet=rs0&directConnection=true';
}

@Injectable()
class DatabaseLifecycle implements OnModuleDestroy {
  constructor(@Inject(MONGO_CLIENT) private readonly client: MongoClient) {}

  async onModuleDestroy() {
    await this.client.close();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: MONGO_CLIENT,
      useFactory: async () => {
        const client = new MongoClient(mongoUrl(), {
          appName: 'keynest-api',
          maxPoolSize: Number(process.env.DATABASE_POOL_SIZE ?? 10),
          maxIdleTimeMS: 30_000,
          connectTimeoutMS: 5_000,
        });
        await client.connect();
        return client;
      },
    },
    {
      provide: MONGO_DATABASE,
      inject: [MONGO_CLIENT],
      useFactory: (client: MongoClient): Db =>
        client.db(process.env.MONGODB_DATABASE ?? 'keynest'),
    },
    DatabaseLifecycle,
  ],
  exports: [MONGO_CLIENT, MONGO_DATABASE],
})
export class DatabaseModule {}
