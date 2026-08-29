import { ensureMongoSchema } from '../apps/api/src/app/platform/database/mongo-schema';
import { MongoClient } from 'mongodb';

async function main() {
  const uri =
    process.env.MONGODB_URI ??
    'mongodb://localhost:27018/keynest?replicaSet=rs0&directConnection=true';
  const client = new MongoClient(uri, { appName: 'keynest-schema-setup' });

  try {
    await client.connect();
    const database = client.db(process.env.MONGODB_DATABASE ?? 'keynest');
    await ensureMongoSchema(database);
    process.stdout.write('MongoDB collections and indexes are ready.\n');
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `MongoDB setup failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
