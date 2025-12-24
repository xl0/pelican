import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	out: './drizzle',
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL!
	},
	schemaFilter: ['cards'],
	migrations: { table: '__drizzle_migrations', schema: 'drizzle_cards' },
	verbose: true,
	strict: true
});
