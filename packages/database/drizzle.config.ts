import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://creatorops:creatorops_password@localhost:5432/creatorops',
  },
  verbose: true,
  strict: true,
});
