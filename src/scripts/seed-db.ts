/**
 * Seed script to populate the database with sample generations for testing.
 * - Seeds providers and models from the hardcoded catalog
 * - Extracts artifacts from rawOutput using the same regex as the app
 * - Renders SVG to PNG using resvg (server-side)
 * - Uploads artifacts and rendered PNGs to S3
 * Run with: bun run src/scripts/seed-db.ts
 */
import 'dotenv/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Resvg } from '@resvg/resvg-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../lib/server/db/schema';
import { providers as providerCatalog, type providersKey } from './models';
import type { Format } from '../lib/types';

// Validate env
const required = ['DATABASE_URL', 'DEV_AUTH_USER', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET'] as const;
for (const key of required) if (!process.env[key]) throw new Error(`${key} is not defined`);

const DEV_USER_ID = process.env.DEV_AUTH_USER!;
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

// S3 client for script (can't use $env/static/private here)
const s3 = new S3Client({
	region: process.env.S3_REGION || 'us-east-1',
	credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! }
});
const S3_BUCKET = process.env.S3_BUCKET!;

// ============================================================================
// Seed providers and models
// ============================================================================

const PROVIDER_ORDER: providersKey[] = ['openai', 'anthropic', 'google', 'xai', 'openrouter', 'custom'];

async function seedProvidersAndModels() {
	console.log('🏢 Seeding providers and models...\n');

	for (let i = 0; i < PROVIDER_ORDER.length; i++) {
		const provId = PROVIDER_ORDER[i];
		const prov = providerCatalog[provId];

		// Insert provider
		await db.insert(schema.providers).values({ id: prov.value, label: prov.label, sortOrder: i }).onConflictDoNothing();
		console.log(`  ✓ Provider: ${prov.label}`);

		// Insert models for this provider (skip 'custom' - it has no predefined models)
		if (provId !== 'custom') {
			for (const model of prov.models) {
				await db
					.insert(schema.models)
					.values({
						providerId: prov.value,
						value: model.value,
						label: model.label,
						inputPrice: model.pricing.input,
						outputPrice: model.pricing.output,
						supportsImages: model.supportsImages
					})
					.onConflictDoNothing();
			}
			console.log(`    → ${prov.models.length} models`);
		}
	}
	console.log('');
}

// ============================================================================
// Artifact extraction (simplified - no DOMPurify, that's browser-only)
// ============================================================================

const SVG_BLOCK_RE = /```(?:svg|xml)\s*\n(<svg[\s\S]*?)(?:```|$)/gi;
const ASCII_BLOCK_RE = /```(?:ascii)?\s*\n([\s\S]*?)(?:\n```|$)/gi;

function extractArtifacts(raw: string, format: Format): string[] {
	const re = format === 'svg' ? SVG_BLOCK_RE : ASCII_BLOCK_RE;
	re.lastIndex = 0;
	const bodies: string[] = [];
	for (const match of raw.matchAll(re)) {
		let body = match[1];
		if (format === 'svg' && !body.includes('</svg>')) body += '</svg>';
		if (format === 'ascii' && (body.trim().startsWith('<svg') || body.trim().startsWith('<?xml'))) continue;
		if (body.trim()) bodies.push(body);
	}
	return bodies;
}

// ============================================================================
// Server-side SVG to PNG rendering
// ============================================================================

function svgToPng(svg: string, width: number, height: number): Uint8Array {
	const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
	return resvg.render().asPng();
}

// For ASCII, we wrap it in an SVG with a background and monospace text
function asciiToSvg(text: string, cols: number, rows: number): string {
	const fontSize = 14,
		lineHeight = 1.2,
		charWidth = fontSize * 0.6;
	const padding = 20;
	const width = Math.ceil(cols * charWidth + padding * 2);
	const height = Math.ceil(rows * fontSize * lineHeight + padding * 2);
	const lines = text
		.split('\n')
		.map(
			(l, i) =>
				`<text x="${padding}" y="${padding + fontSize + i * fontSize * lineHeight}" font-family="monospace" font-size="${fontSize}" fill="#22c55e">${escapeXml(l)}</text>`
		)
		.join('\n');
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#1a1a1a"/>
  ${lines}
</svg>`;
}

function escapeXml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================================
// S3 upload helpers
// ============================================================================

async function uploadArtifact(genId: string, stepId: number, artId: number, body: string, format: Format): Promise<void> {
	const ext = format === 'svg' ? 'svg' : 'txt';
	const contentType = format === 'svg' ? 'image/svg+xml' : 'text/plain; charset=utf-8';
	await s3.send(
		new PutObjectCommand({ Bucket: S3_BUCKET, Key: `${genId}/${stepId}_${artId}.${ext}`, Body: body, ContentType: contentType })
	);
}

async function uploadRendered(genId: string, stepId: number, artId: number, png: Uint8Array): Promise<void> {
	await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: `${genId}/${stepId}_${artId}.png`, Body: png, ContentType: 'image/png' }));
}

// ============================================================================
// Sample data
// ============================================================================

const GEN_IDS = {
	pelican: '00000000-0000-0000-0000-000000000001',
	cat: '00000000-0000-0000-0000-000000000002',
	ascii: '00000000-0000-0000-0000-000000000003',
	geometric: '00000000-0000-0000-0000-000000000004'
} as const;

const PELICAN_SVG = `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
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

const CAT_SVG = `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="600" fill="#E8D4B8"/>
  <ellipse cx="400" cy="350" rx="150" ry="100" fill="#FF8C00"/>
  <circle cx="400" cy="220" r="80" fill="#FF8C00"/>
  <polygon points="340,160 320,80 360,140" fill="#FF8C00"/>
  <polygon points="460,160 480,80 440,140" fill="#FF8C00"/>
  <ellipse cx="360" cy="210" rx="20" ry="25" fill="#98FB98"/>
  <ellipse cx="440" cy="210" rx="20" ry="25" fill="#98FB98"/>
  <ellipse cx="365" cy="215" rx="8" ry="12" fill="#000000"/>
  <ellipse cx="445" cy="215" rx="8" ry="12" fill="#000000"/>
  <ellipse cx="400" cy="260" rx="12" ry="8" fill="#FF69B4"/>
  <path d="M 380 280 Q 400 300 420 280" stroke="#000" stroke-width="2" fill="none"/>
  <path d="M 530 380 Q 620 350 650 420 Q 680 500 600 480" stroke="#FF8C00" stroke-width="25" fill="none" stroke-linecap="round"/>
</svg>`;

const ASCII_CAT = `
    /\\_____/\\
   /  o   o  \\
  ( ==  ^  == )
   )         (
  (           )
 ( (  )   (  ) )
(__(__)___(__)__)
`;

const GEOMETRIC_SVG = `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
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
</svg>`;

type GenConfig = {
	id: string;
	prompt: string;
	format: Format;
	width: number;
	height: number;
	provider: 'anthropic' | 'openai';
	model: string;
	steps: { rawOutput: string }[];
};

const GENERATIONS: GenConfig[] = [
	{
		id: GEN_IDS.pelican,
		prompt: 'A friendly pelican standing on a sandy beach with a blue sky',
		format: 'svg',
		width: 800,
		height: 600,
		provider: 'anthropic',
		model: 'claude-3-5-haiku-latest',
		steps: [{ rawOutput: `<thinking>I'll create a simple pelican...</thinking>\n\n\`\`\`svg\n${PELICAN_SVG}\n\`\`\`` }]
	},
	{
		id: GEN_IDS.cat,
		prompt: 'A cute orange tabby cat with green eyes sitting happily',
		format: 'svg',
		width: 800,
		height: 600,
		provider: 'openai',
		model: 'gpt-4o-mini',
		steps: [{ rawOutput: `Here's a cute orange cat SVG:\n\n\`\`\`svg\n${CAT_SVG}\n\`\`\`` }]
	},
	{
		id: GEN_IDS.ascii,
		prompt: 'A simple cat in ASCII art style',
		format: 'ascii',
		width: 40,
		height: 20,
		provider: 'anthropic',
		model: 'claude-3-5-sonnet-20241022',
		steps: [{ rawOutput: `Here's a cute ASCII cat:\n\n\`\`\`\n${ASCII_CAT}\n\`\`\`` }]
	},
	{
		id: GEN_IDS.geometric,
		prompt: 'A geometric pattern with radial lines',
		format: 'svg',
		width: 800,
		height: 600,
		provider: 'anthropic',
		model: 'claude-3-5-haiku-latest',
		steps: [{ rawOutput: `Here's a geometric pattern:\n\n\`\`\`svg\n${GEOMETRIC_SVG}\n\`\`\`` }]
	}
];

// ============================================================================
// Main seed function
// ============================================================================

async function seed() {
	console.log('🌱 Seeding database with sample generations...\n');

	// Create dev user
	console.log('Creating dev user...');
	await db.insert(schema.users).values({ id: DEV_USER_ID, isAnon: false, isAdmin: true }).onConflictDoNothing();
	console.log(`  ✓ User ${DEV_USER_ID} ready\n`);

	// Seed providers and models
	await seedProvidersAndModels();

	for (const gen of GENERATIONS) {
		console.log(`Creating: ${gen.prompt.slice(0, 50)}...`);

		// Insert generation
		const [dbGen] = await db
			.insert(schema.generations)
			.values({
				id: gen.id,
				userId: DEV_USER_ID,
				prompt: gen.prompt,
				format: gen.format,
				width: gen.width,
				height: gen.height,
				provider: gen.provider,
				model: gen.model,
				endpoint: null,
				initialTemplate: `Generate ${gen.format === 'svg' ? 'an SVG' : 'ASCII art'} of: {{prompt}}`,
				refinementTemplate: `Refine the ${gen.format === 'svg' ? 'SVG' : 'ASCII art'}...`
			})
			.onConflictDoNothing()
			.returning();

		if (!dbGen) {
			console.log(`  ⏭ Already exists, skipping\n`);
			continue;
		}

		let totalArtifacts = 0;
		for (let stepIdx = 0; stepIdx < gen.steps.length; stepIdx++) {
			const stepData = gen.steps[stepIdx];

			// Insert step
			const [dbStep] = await db
				.insert(schema.steps)
				.values({
					userId: DEV_USER_ID,
					generationId: dbGen.id,
					renderedPrompt: `${gen.format === 'svg' ? 'Generate an SVG' : 'Generate ASCII art'} of: ${gen.prompt}`,
					status: 'completed',
					rawOutput: stepData.rawOutput,
					inputTokens: 150,
					outputTokens: 800,
					inputCost: 0.0001,
					outputCost: 0.003,
					completedAt: new Date()
				})
				.returning();

			// Extract artifacts from rawOutput
			const bodies = extractArtifacts(stepData.rawOutput, gen.format);

			for (const body of bodies) {
				// Insert artifact in DB
				const [dbArt] = await db
					.insert(schema.artifacts)
					.values({
						userId: DEV_USER_ID,
						stepId: dbStep.id,
						body
					})
					.returning();

				// Upload raw artifact to S3
				await uploadArtifact(dbGen.id, dbStep.id, dbArt.id, body, gen.format);

				// Render and upload PNG
				try {
					let svg: string;
					if (gen.format === 'svg') {
						svg = body;
					} else {
						// ASCII: wrap in SVG for rendering
						const lines = body.split('\n');
						const cols = Math.max(1, ...lines.map((l) => l.length));
						svg = asciiToSvg(body, cols, lines.length);
					}
					const png = svgToPng(svg, gen.width, gen.height);
					await uploadRendered(dbGen.id, dbStep.id, dbArt.id, png);
				} catch (err) {
					console.log(`    ⚠ Failed to render artifact ${dbArt.id}: ${err}`);
				}

				totalArtifacts++;
			}
		}

		console.log(`  ✓ Created ${gen.id} with ${gen.steps.length} step(s), ${totalArtifacts} artifact(s)\n`);
	}

	console.log('✅ Seeding complete!');
	await client.end();
}

seed().catch((err) => {
	console.error('❌ Seed failed!');
	console.error(err);
	process.exit(1);
});
