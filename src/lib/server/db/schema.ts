import { relations } from 'drizzle-orm';
import { boolean, integer, jsonb, pgSchema, primaryKey, real, serial, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { accessValues, approvalValues, formatValues, statusValues } from '$lib/types';

// Re-export for convenience
export { accessValues, approvalValues, formatValues, statusValues } from '$lib/types';
export type { Access, Approval, Format, Status } from '$lib/types';

export const pelican = pgSchema('pelican');

export const formatEnum = pelican.enum('formats', [...formatValues]);
export const statusEnum = pelican.enum('status', [...statusValues]);
export const approvalEnum = pelican.enum('approval', [...approvalValues]);
export const accessEnum = pelican.enum('access', [...accessValues]);

// Auth tables
export const users = pelican.table('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	isRegistered: boolean('is_registered').notNull().default(false), // becomes true on OAuth
	isAdmin: boolean('is_admin').notNull().default(false), // can access admin panel
	createdAt: timestamp('created_at').notNull().defaultNow(),
	registeredAt: timestamp('registered_at'), // when OAuth completed (null for anon)
	// Request metadata (captured on first visit)
	ip: text('ip'),
	userAgent: text('user_agent'),
	referrer: text('referrer'),
	acceptLanguage: text('accept_language'), // browser language preference
	platform: text('platform'), // OS from Sec-CH-UA-Platform
	isMobile: boolean('is_mobile'), // from Sec-CH-UA-Mobile
	// Geo (derived from IP)
	country: text('country'),
	// Marketing attribution
	utmSource: text('utm_source'),
	utmMedium: text('utm_medium'),
	utmCampaign: text('utm_campaign'),
	landingPage: text('landing_page'), // first URL visited
	// Activity tracking
	lastSeenAt: timestamp('last_seen_at'),
	visitCount: integer('visit_count').notNull().default(1)
});

export const sessions = pelican.table('sessions', {
	id: text('id').primaryKey(), // sha256 hash of token
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

// Provider and model catalog tables
export const providers = pelican.table('llm_providers', {
	id: text('id').primaryKey(), // 'openai', 'anthropic', 'google', 'xai', 'openrouter', 'custom'
	label: text('label').notNull(), // Display name: 'OpenAI', 'Anthropic', etc.
	sortOrder: integer('sort_order').notNull().default(0),
	apiKeyUrl: text('api_key_url') // URL to get API key (e.g. 'https://platform.openai.com/api-keys')
});

export const models = pelican.table(
	'models',
	{
		id: serial('id').primaryKey(),
		providerId: text('provider_id')
			.notNull()
			.references(() => providers.id, { onDelete: 'cascade' }),
		value: text('value').notNull(), // Model identifier: 'gpt-4o', 'claude-3-5-sonnet-20241022'
		label: text('label').notNull(), // Display name: 'GPT-4o', 'Claude 3.5 Sonnet'
		inputPrice: real('input_price').notNull().default(0), // Cost per 1M input tokens
		outputPrice: real('output_price').notNull().default(0), // Cost per 1M output tokens
		supportsImages: boolean('supports_images').notNull().default(true)
	},
	(t) => [unique().on(t.providerId, t.value)]
);

export const generations = pelican.table('generations', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	prompt: text('prompt').notNull(),
	format: formatEnum('format').notNull(),
	width: integer('width').notNull(),
	height: integer('height').notNull(),
	// Model settings (text only - used for history display)
	provider: text('provider').notNull(), // 'openai', 'anthropic', etc.
	model: text('model').notNull(), // 'gpt-4o', 'claude-3-5-sonnet-20241022', or 'custom'
	customModel: text('custom_model'), // actual model ID when model='custom'
	endpoint: text('endpoint'),
	// Prompt templates
	initialTemplate: text('initial_template').notNull(),
	refinementTemplate: text('refinement_template').notNull(),
	// Generation options
	maxSteps: integer('max_steps').notNull().default(5),
	sendFullHistory: boolean('send_full_history').notNull().default(true),
	// Visibility: private (owner only), shared (link access), gallery (public gallery)
	access: accessEnum('access').notNull().default('gallery'),
	approval: approvalEnum('approval').notNull().default('pending'), // pending/approved/rejected
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at')
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});

export const steps = pelican.table('steps', {
	// Note: id increments globally to make sure the steps are in the right order
	id: serial('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	generationId: uuid('gen_id')
		.notNull()
		.references(() => generations.id, { onDelete: 'cascade' }),
	renderedPrompt: text('rendered_prompt').notNull(),

	status: statusEnum('status').notNull(),
	errorMessage: text('error_message'),
	errorData: jsonb('error_data'), // Full error object for debugging
	createdAt: timestamp('created_at').notNull().defaultNow(),
	completedAt: timestamp('completed_at'),

	rawOutput: text('raw_output'),

	inputTokens: integer('input_tokens'),
	outputTokens: integer('output_tokens'),
	inputCost: real('input_cost'),
	outputCost: real('output_cost')
});

// A generation may produce more than one artifact.
// Sometimes the model will generate an svg, then
// decide it's not good enough and generate anouither one
export const artifacts = pelican.table('artifacts', {
	id: serial('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	stepId: integer('step_id')
		.notNull()
		.references(() => steps.id, { onDelete: 'cascade' }),
	body: text('body').default(''),
	renderError: text('render_error') // null if rendered successfully, error message if failed
});

// Images are standalone entities (S3 path: input/{imageId}.{ext})
export const images = pelican.table('images', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	extension: text('extension').notNull().default('png')
});

// Junction table: many-to-many between generations and images
export const generationImages = pelican.table(
	'generation_images',
	{
		generationId: uuid('gen_id')
			.notNull()
			.references(() => generations.id, { onDelete: 'cascade' }),
		imageId: uuid('image_id')
			.notNull()
			.references(() => images.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.generationId, t.imageId] })]
);

export const userRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	generations: many(generations)
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	})
}));

export const providerRelations = relations(providers, ({ many }) => ({
	models: many(models)
}));

export const modelRelations = relations(models, ({ one }) => ({
	provider: one(providers, {
		fields: [models.providerId],
		references: [providers.id]
	})
}));

export const genRelations = relations(generations, ({ one, many }) => ({
	user: one(users, {
		fields: [generations.userId],
		references: [users.id]
	}),
	generationImages: many(generationImages),
	steps: many(steps)
}));

export const stepRelations = relations(steps, ({ one, many }) => ({
	generation: one(generations, {
		fields: [steps.generationId],
		references: [generations.id]
	}),
	artifacts: many(artifacts)
}));

export const artifactRelations = relations(artifacts, ({ one }) => ({
	step: one(steps, {
		fields: [artifacts.stepId],
		references: [steps.id]
	})
}));

export const imageRelations = relations(images, ({ many }) => ({
	generationImages: many(generationImages)
}));

export const generationImageRelations = relations(generationImages, ({ one }) => ({
	generation: one(generations, {
		fields: [generationImages.generationId],
		references: [generations.id]
	}),
	image: one(images, {
		fields: [generationImages.imageId],
		references: [images.id]
	})
}));

// User types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Session types
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// Generation types
export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
export type UpdateGeneration = { id: string; userId: string } & Partial<Omit<NewGeneration, 'id' | 'userId'>>;

// Step types
export type Step = typeof steps.$inferSelect;
export type NewStep = typeof steps.$inferInsert;
export type UpdateStep = { id: number } & Partial<Omit<NewStep, 'id'>>;

// Artifact types
export type Artifact = typeof artifacts.$inferSelect;
export type NewArtifact = typeof artifacts.$inferInsert;

// Image types
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;

// Provider types
export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;

// Model types
export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
