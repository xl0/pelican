import 'dotenv/config';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not defined');
}

const sql = postgres(process.env.DATABASE_URL);

async function main() {
	console.log('Setting all generations to pending + gallery...');
	const result = await sql`UPDATE pelican.generations SET approval = 'pending', access = 'gallery'`;
	console.log(`Updated ${result.count} generations.`);
	await sql.end();
}

main().catch((err) => {
	console.error('Reset approvals failed!');
	console.error(err);
	process.exit(1);
});
