/**
 * Seed script to populate the database with sample generations for testing.
 * Run with: bun run src/scripts/seed-db.ts
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../lib/server/db/schema';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not defined');
}
if (!process.env.DEV_AUTH_USER) {
	throw new Error('DEV_AUTH_USER is not defined');
}

const DEV_USER_ID = process.env.DEV_AUTH_USER;
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, { schema });

const SAMPLE_SVG_PELICAN = `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="600" fill="#87CEEB"/>
  <ellipse cx="400" cy="350" rx="120" ry="80" fill="#FFFFFF"/>
  <ellipse cx="350" cy="300" rx="40" ry="35" fill="#FFFFFF"/>
  <circle cx="340" cy="290" r="8" fill="#000000"/>
  <path d="M 310 310 Q 280 330 250 320 Q 240 315 250 310 Q 280 300 310 310" fill="#FFA500"/>
  <path d="M 310 310 Q 340 340 350 380 Q 345 340 310 310" fill="#FFA500" opacity="0.7"/>
  <ellipse cx="480" cy="400" rx="25" ry="60" fill="#FFFFFF"/>
  <ellipse cx="520" cy="400" rx="25" ry="60" fill="#FFFFFF"/>
  <line x1="480" y1="460" x2="475" y2="520" stroke="#FFA500" stroke-width="8"/>
  <line x1="520" y1="460" x2="525" y2="520" stroke="#FFA500" stroke-width="8"/>
  <ellipse cx="470" cy="525" rx="20" ry="8" fill="#FFA500"/>
  <ellipse cx="530" cy="525" rx="20" ry="8" fill="#FFA500"/>
</svg>`;

const SAMPLE_SVG_CAT = `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="600" fill="#E8D4B8"/>
  <ellipse cx="400" cy="350" rx="150" ry="100" fill="#FF8C00"/>
  <circle cx="400" cy="220" r="80" fill="#FF8C00"/>
  <polygon points="340,160 320,80 360,140" fill="#FF8C00"/>
  <polygon points="460,160 480,80 440,140" fill="#FF8C00"/>
  <polygon points="340,160 320,80 360,140" fill="#FFB347" transform="translate(5,10) scale(0.7)"/>
  <polygon points="460,160 480,80 440,140" fill="#FFB347" transform="translate(-5,10) scale(0.7)"/>
  <ellipse cx="360" cy="210" rx="20" ry="25" fill="#98FB98"/>
  <ellipse cx="440" cy="210" rx="20" ry="25" fill="#98FB98"/>
  <ellipse cx="365" cy="215" rx="8" ry="12" fill="#000000"/>
  <ellipse cx="445" cy="215" rx="8" ry="12" fill="#000000"/>
  <ellipse cx="400" cy="260" rx="12" ry="8" fill="#FF69B4"/>
  <path d="M 380 280 Q 400 300 420 280" stroke="#000000" stroke-width="2" fill="none"/>
  <line x1="350" y1="250" x2="280" y2="240" stroke="#000000" stroke-width="2"/>
  <line x1="350" y1="260" x2="280" y2="265" stroke="#000000" stroke-width="2"/>
  <line x1="350" y1="270" x2="280" y2="290" stroke="#000000" stroke-width="2"/>
  <line x1="450" y1="250" x2="520" y2="240" stroke="#000000" stroke-width="2"/>
  <line x1="450" y1="260" x2="520" y2="265" stroke="#000000" stroke-width="2"/>
  <line x1="450" y1="270" x2="520" y2="290" stroke="#000000" stroke-width="2"/>
  <path d="M 530 380 Q 620 350 650 420 Q 680 500 600 480" stroke="#FF8C00" stroke-width="25" fill="none" stroke-linecap="round"/>
</svg>`;

const SAMPLE_ASCII = `
    /\\___/\\
   (  o o  )
   (  =^=  )
    (--m-m--)
   /|       |\\
  / |  CAT  | \\
 /  |_______|  \\
    |       |
    |_______|
`;

async function seed() {
	console.log('🌱 Seeding database with sample generations...\n');

	// Generation 1: Pelican (SVG, completed with 2 steps)
	console.log('Creating Generation 1: Pelican SVG...');
	const [gen1] = await db
		.insert(schema.generations)
		.values({
			userId: DEV_USER_ID,
			title: 'Pelican on the Beach',
			prompt: 'A friendly pelican standing on a sandy beach with a blue sky',
			format: 'svg',
			width: 800,
			height: 600,
			provider: 'anthropic',
			model: 'claude-3-5-haiku-latest',
			endpoint: null,
			initialTemplate: 'Generate an SVG of: {{prompt}}',
			refinementTemplate: 'Refine the previous SVG...'
		})
		.returning();

	const [step1_1] = await db
		.insert(schema.steps)
		.values({
			generationId: gen1.id,
			renderedPrompt: 'Generate an SVG of: A friendly pelican standing on a sandy beach with a blue sky',
			status: 'completed',
			rawOutput: "<thinking>I'll create a simple pelican...</thinking>\n\n```svg\n" + SAMPLE_SVG_PELICAN + '\n```',
			inputTokens: 150,
			outputTokens: 800,
			inputCost: 0.00012,
			outputCost: 0.0032,
			completedAt: new Date()
		})
		.returning();

	await db.insert(schema.artifacts).values({
		stepId: step1_1.id,
		body: SAMPLE_SVG_PELICAN
	});

	const [step1_2] = await db
		.insert(schema.steps)
		.values({
			generationId: gen1.id,
			renderedPrompt: 'Refine the previous SVG to add more detail',
			status: 'completed',
			rawOutput: '<thinking>Adding more detail to the pelican...</thinking>\n\n```svg\n' + SAMPLE_SVG_PELICAN + '\n```',
			inputTokens: 950,
			outputTokens: 850,
			inputCost: 0.00076,
			outputCost: 0.0034,
			completedAt: new Date()
		})
		.returning();

	await db.insert(schema.artifacts).values({
		stepId: step1_2.id,
		body: SAMPLE_SVG_PELICAN
	});

	console.log(`  ✓ Created generation ${gen1.id} with 2 steps\n`);

	// Generation 2: Cat (SVG, completed with 1 step)
	console.log('Creating Generation 2: Orange Cat SVG...');
	const [gen2] = await db
		.insert(schema.generations)
		.values({
			userId: DEV_USER_ID,
			title: 'Happy Orange Cat',
			prompt: 'A cute orange tabby cat with green eyes sitting happily',
			format: 'svg',
			width: 800,
			height: 600,
			provider: 'openai',
			model: 'gpt-4o-mini',
			endpoint: null,
			initialTemplate: 'Generate an SVG of: {{prompt}}',
			refinementTemplate: 'Refine the SVG to improve it...'
		})
		.returning();

	const [step2_1] = await db
		.insert(schema.steps)
		.values({
			generationId: gen2.id,
			renderedPrompt: 'Generate an SVG of: A cute orange tabby cat with green eyes sitting happily',
			status: 'completed',
			rawOutput: "Here's a cute orange cat SVG:\n\n```svg\n" + SAMPLE_SVG_CAT + '\n```',
			inputTokens: 120,
			outputTokens: 1200,
			inputCost: 0.000018,
			outputCost: 0.00072,
			completedAt: new Date()
		})
		.returning();

	await db.insert(schema.artifacts).values({
		stepId: step2_1.id,
		body: SAMPLE_SVG_CAT
	});

	console.log(`  ✓ Created generation ${gen2.id} with 1 step\n`);

	// Generation 3: ASCII Cat
	console.log('Creating Generation 3: ASCII Cat...');
	const [gen3] = await db
		.insert(schema.generations)
		.values({
			userId: DEV_USER_ID,
			title: 'ASCII Art Cat',
			prompt: 'A simple cat in ASCII art style',
			format: 'ascii',
			width: 40,
			height: 20,
			provider: 'anthropic',
			model: 'claude-3-5-sonnet-20241022',
			endpoint: null,
			initialTemplate: 'Generate ASCII art of: {{prompt}}',
			refinementTemplate: 'Refine the ASCII art...'
		})
		.returning();

	const [step3_1] = await db
		.insert(schema.steps)
		.values({
			generationId: gen3.id,
			renderedPrompt: 'Generate ASCII art of: A simple cat in ASCII art style',
			status: 'completed',
			rawOutput: "Here's a cute ASCII cat:\n\n```\n" + SAMPLE_ASCII + '\n```',
			inputTokens: 80,
			outputTokens: 200,
			inputCost: 0.00024,
			outputCost: 0.003,
			completedAt: new Date()
		})
		.returning();

	await db.insert(schema.artifacts).values({
		stepId: step3_1.id,
		body: SAMPLE_ASCII.trim()
	});

	console.log(`  ✓ Created generation ${gen3.id} with 1 step\n`);

	console.log('✅ Seeding complete!');
	console.log(`   Created 3 generations for user ${DEV_USER_ID}`);

	await client.end();
}

seed().catch((err) => {
	console.error('❌ Seed failed!');
	console.error(err);
	process.exit(1);
});
