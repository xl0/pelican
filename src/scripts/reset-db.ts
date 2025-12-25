import 'dotenv/config';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not defined');
}

const sql = postgres(process.env.DATABASE_URL);

async function main() {
	console.log('Dropping schemas...');
	await sql`DROP SCHEMA IF EXISTS pelican CASCADE;`;
	await sql`DROP SCHEMA IF EXISTS drizzle_pelican CASCADE;`;
	// NOTE: do not drop public schema, as it is shared with other projects
	console.log('Schemas dropped (pelican, drizzle).');
	await sql.end();
}

main().catch((err) => {
	console.error('Reset failed!');
	console.error(err);
	process.exit(1);
});
