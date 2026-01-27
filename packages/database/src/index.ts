import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export function createDbClient(connectionString?: string) {
  const connection = postgres(
    connectionString || process.env.DATABASE_URL || 'postgresql://creatorops:creatorops_password@localhost:5432/creatorops'
  );

  return drizzle(connection, { schema });
}

export type DbClient = ReturnType<typeof createDbClient>;

// Re-export schema and types
export * from './schema/index.js';
