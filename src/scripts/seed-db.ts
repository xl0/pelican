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

// Fixed UUIDs for consistent seeding
const GEN_IDS = {
	pelican: '00000000-0000-0000-0000-000000000001',
	cat: '00000000-0000-0000-0000-000000000002',
	ascii: '00000000-0000-0000-0000-000000000003',
	failedParse: '00000000-0000-0000-0000-000000000004'
} as const;

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
.    /\\____/\\
    (  o o  )
    (  =^=  )
    (--m-m--)
   /|       |\\
  / |  CAT  | \\
 /  |_______|  \\
    |       |
    |_______|
`;

// Color themes for different artifacts
const THEMES = [
	{ bg: '#E8D4B8', cat: '#FF8C00', eyes: '#98FB98', label: 'Orange' },
	{ bg: '#1a1a2e', cat: '#6B5B95', eyes: '#88D8B0', label: 'Purple' },
	{ bg: '#ffe4e1', cat: '#FF6B6B', eyes: '#4ECDC4', label: 'Red' },
	{ bg: '#e0f7fa', cat: '#00BCD4', eyes: '#FFE082', label: 'Cyan' },
	{ bg: '#f3e5f5', cat: '#9C27B0', eyes: '#C5E1A5', label: 'Violet' }
];

// Generate a cat SVG with step/artifact label and color theme
function makeCatSvg(step: number, artifact: number, themeIndex = 0): string {
	const t = THEMES[themeIndex % THEMES.length];
	return `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="600" fill="${t.bg}"/>
  <ellipse cx="400" cy="350" rx="150" ry="100" fill="${t.cat}"/>
  <circle cx="400" cy="220" r="80" fill="${t.cat}"/>
  <polygon points="340,160 320,80 360,140" fill="${t.cat}"/>
  <polygon points="460,160 480,80 440,140" fill="${t.cat}"/>
  <ellipse cx="360" cy="210" rx="20" ry="25" fill="${t.eyes}"/>
  <ellipse cx="440" cy="210" rx="20" ry="25" fill="${t.eyes}"/>
  <ellipse cx="365" cy="215" rx="8" ry="12" fill="#000"/>
  <ellipse cx="445" cy="215" rx="8" ry="12" fill="#000"/>
  <ellipse cx="400" cy="260" rx="12" ry="8" fill="#FF69B4"/>
  <path d="M 380 280 Q 400 300 420 280" stroke="#000" stroke-width="2" fill="none"/>
  <path d="M 530 380 Q 620 350 650 420 Q 680 500 600 480" stroke="${t.cat}" stroke-width="25" fill="none" stroke-linecap="round"/>
  <rect x="20" y="20" width="180" height="50" rx="8" fill="rgba(0,0,0,0.7)"/>
  <text x="30" y="55" font-family="sans-serif" font-size="24" font-weight="bold" fill="white">Step ${step} / Art ${artifact}</text>
</svg>`;
}

// Generate a pelican SVG with step/artifact label
function makePelicanSvg(step: number, artifact: number): string {
	return `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
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
  <rect x="20" y="20" width="180" height="50" rx="8" fill="rgba(0,0,0,0.7)"/>
  <text x="30" y="55" font-family="sans-serif" font-size="24" font-weight="bold" fill="white">Step ${step} / Art ${artifact}</text>
</svg>`;
}

async function seed() {
	console.log('🌱 Seeding database with sample generations...\n');

	// Generation 1: Pelican (SVG, completed with 2 steps)
	console.log('Creating Generation 1: Pelican SVG...');
	const [gen1] = await db
		.insert(schema.generations)
		.values({
			id: GEN_IDS.pelican,
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
			userId: DEV_USER_ID,
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

	// Step 1: 2 artifacts (first attempts)
	await db.insert(schema.artifacts).values([
		{ userId: DEV_USER_ID, stepId: step1_1.id, body: makePelicanSvg(1, 1) },
		{ userId: DEV_USER_ID, stepId: step1_1.id, body: makePelicanSvg(1, 2) }
	]);

	const [step1_2] = await db
		.insert(schema.steps)
		.values({
			userId: DEV_USER_ID,
			generationId: gen1.id,
			renderedPrompt: 'Refine the previous SVG to add more detail',
			status: 'completed',
			rawOutput: '<thinking>Adding more detail to the pelican...</thinking>\n\n```svg\n' + makePelicanSvg(2, 1) + '\n```',
			inputTokens: 950,
			outputTokens: 850,
			inputCost: 0.00076,
			outputCost: 0.0034,
			completedAt: new Date()
		})
		.returning();

	// Step 2: 3 artifacts (refinement attempts)
	await db.insert(schema.artifacts).values([
		{ userId: DEV_USER_ID, stepId: step1_2.id, body: makePelicanSvg(2, 1) },
		{ userId: DEV_USER_ID, stepId: step1_2.id, body: makePelicanSvg(2, 2) },
		{ userId: DEV_USER_ID, stepId: step1_2.id, body: makePelicanSvg(2, 3) }
	]);

	console.log(`  ✓ Created generation ${gen1.id} with 2 steps (5 artifacts)\n`);

	// Generation 2: Cat (SVG, completed with 1 step)
	console.log('Creating Generation 2: Orange Cat SVG...');
	const [gen2] = await db
		.insert(schema.generations)
		.values({
			id: GEN_IDS.cat,
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
			userId: DEV_USER_ID,
			generationId: gen2.id,
			renderedPrompt: 'Generate an SVG of: A cute orange tabby cat with green eyes sitting happily',
			status: 'completed',
			rawOutput: "Here's a cute orange cat SVG:\n\n```svg\n" + makeCatSvg(1, 1, 0) + '\n```',
			inputTokens: 120,
			outputTokens: 1200,
			inputCost: 0.000018,
			outputCost: 0.00072,
			completedAt: new Date()
		})
		.returning();

	// Multiple artifacts with different color themes
	await db.insert(schema.artifacts).values([
		{ userId: DEV_USER_ID, stepId: step2_1.id, body: makeCatSvg(1, 1, 0) }, // Orange
		{ userId: DEV_USER_ID, stepId: step2_1.id, body: makeCatSvg(1, 2, 1) }, // Purple
		{ userId: DEV_USER_ID, stepId: step2_1.id, body: makeCatSvg(1, 3, 2) } // Red
	]);

	console.log(`  ✓ Created generation ${gen2.id} with 1 step (3 artifacts)\n`);

	// Generation 3: ASCII Cat
	console.log('Creating Generation 3: ASCII Cat...');
	const [gen3] = await db
		.insert(schema.generations)
		.values({
			id: GEN_IDS.ascii,
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
			userId: DEV_USER_ID,
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
		userId: DEV_USER_ID,
		stepId: step3_1.id,
		body: SAMPLE_ASCII
	});

	console.log(`  ✓ Created generation ${gen3.id} with 1 step\n`);

	// Generation 4: Raw output only, no artifacts (for testing edge case)
	console.log('Creating Generation 4: Raw output only (no artifacts)...');
	const [gen4] = await db
		.insert(schema.generations)
		.values({
			id: GEN_IDS.failedParse,
			userId: DEV_USER_ID,
			title: 'Failed Parse Test',
			prompt: 'A geometric pattern',
			format: 'svg',
			width: 800,
			height: 600,
			provider: 'anthropic',
			model: 'claude-3-5-haiku-latest',
			endpoint: null,
			initialTemplate: 'Generate an SVG of: {{prompt}}',
			refinementTemplate: 'Refine the SVG...'
		})
		.returning();

	await db.insert(schema.steps).values({
		userId: DEV_USER_ID,
		generationId: gen4.id,
		renderedPrompt: 'Generate an SVG of: A geometric pattern',
		status: 'completed',
		rawOutput: `Here's a geometric pattern with concentric circles:

\`\`\`svg
<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="600" fill="#1a1a2e"/>
  <circle cx="400" cy="300" r="250" fill="none" stroke="#4a4e69" stroke-width="2"/>
  <circle cx="400" cy="300" r="200" fill="none" stroke="#9a8c98" stroke-width="2"/>
  <circle cx="400" cy="300" r="150" fill="none" stroke="#c9ada7" stroke-width="2"/>
  <circle cx="400" cy="300" r="100" fill="none" stroke="#f2e9e4" stroke-width="2"/>
  <circle cx="400" cy="300" r="50" fill="#22223b"/>
</svg>
\`\`\`

Actually, let me give you a more visually interesting version with radial lines:

\`\`\`svg
<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="600" fill="#0d1b2a"/>
  <g stroke="#778da9" stroke-width="1">
    <line x1="400" y1="300" x2="400" y2="50"/>
    <line x1="400" y1="300" x2="616" y2="175"/>
    <line x1="400" y1="300" x2="616" y2="425"/>
    <line x1="400" y1="300" x2="400" y2="550"/>
    <line x1="400" y1="300" x2="184" y2="425"/>
    <line x1="400" y1="300" x2="184" y2="175"/>
  </g>
  <circle cx="400" cy="300" r="200" fill="none" stroke="#415a77" stroke-width="2"/>
  <circle cx="400" cy="300" r="130" fill="none" stroke="#778da9" stroke-width="2"/>
  <circle cx="400" cy="300" r="60" fill="#1b263b" stroke="#e0e1dd" stroke-width="2"/>
</svg>
\`\`\``,
		inputTokens: 150,
		outputTokens: 180,
		inputCost: 0.00012,
		outputCost: 0.00072,
		completedAt: new Date()
	});

	// No artifacts inserted for gen4

	console.log(`  ✓ Created generation ${gen4.id} with 1 step (no artifacts)\n`);

	console.log('✅ Seeding complete!');
	console.log(`   Created 4 generations for user ${DEV_USER_ID}`);

	await client.end();
}

seed().catch((err) => {
	console.error('❌ Seed failed!');
	console.error(err);
	process.exit(1);
});
