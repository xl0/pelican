import { providerNames } from '$lib/models';
import { relations } from 'drizzle-orm';
import { boolean, integer, pgSchema, primaryKey, real, serial, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { formatValues, statusValues } from '$lib/types';

// Re-export for convenience
export { formatValues, statusValues } from '$lib/types';
export type { Format, Status } from '$lib/types';

export const pelican = pgSchema('pelican');

export const formatEnum = pelican.enum('formats', [...formatValues]);
export const providerEnum = pelican.enum('providers', providerNames);
export const statusEnum = pelican.enum('status', [...statusValues]);

// Auth tables
export const users = pelican.table('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	username: text('username').unique(), // null = anonymous
	passwordHash: text('password_hash'), // null = anonymous
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const sessions = pelican.table('sessions', {
	id: text('id').primaryKey(), // sha256 hash of token
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

export const generations = pelican.table('generations', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	title: text('title').notNull(),
	prompt: text('prompt').notNull(),
	format: formatEnum('format').notNull(),
	width: integer('width').notNull(),
	height: integer('height').notNull(),
	// Model settings
	provider: providerEnum('provider').notNull(),
	model: text('model').notNull(),
	endpoint: text('endpoint'),
	// Prompt templates
	initialTemplate: text('initial_template').notNull(),
	refinementTemplate: text('refinement_template').notNull(),
	// Generation options
	maxSteps: integer('max_steps').notNull().default(5),
	sendFullHistory: boolean('send_full_history').notNull().default(true),
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
