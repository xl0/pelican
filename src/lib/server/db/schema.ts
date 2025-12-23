import { providerNames } from "$lib/models";
import { relations } from "drizzle-orm";
import {
  integer,
  pgSchema,
  real,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const pelican = pgSchema("pelican");
export const formatEnum = pelican.enum("formats", ["svg", "asii"]);
export const providerEnum = pelican.enum("providrs", providerNames);
export const generationStaut = pelican.enum("status", [
  "pending",
  "generating",
  "completed",
  "failed",
]);

export const generations = pelican.table("generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  // We dont really keep track of the users, a random id is saved in the browser
  // to let the users retrieve their previous generations.
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  format: formatEnum("format").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const steps = pelican.table("steps", {
  // Note: id increments globall to make sure the steps are in the right order
  id: serial("id").primaryKey(),
  generationId: uuid("gen_id")
    .notNull()
    .references(() => generations.id, { onDelete: "cascade" }),
  provider: providerEnum("provider").notNull(),
  model: text("model").notNull(),
  endpoint: text("endpoint"),
  promptTemplate: text("prompt_template").notNull(),
  renderedPrompt: text("rendered_prompt").notNull(),

  status: generationStaut("status").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),

  rawOutput: text("raw_output"),

  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  inputCost: real("input_cost"),
  outputCost: real("output_cost"),
});

// A generation may produce more than one artifact.
// Sometimes the model will generate an svg, then
// decide it's not good enough and generate anouither one
export const artifacts = pelican.table("artifacts", {
  id: serial("id").primaryKey(),
  stepId: integer("step_id")
    .notNull()
    .references(() => steps.id, { onDelete: "cascade" }),
  body: text("body").default(""),
});

export const inputImages = pelican.table("images", {
  id: uuid("id").primaryKey().defaultRandom(),
  generationId: uuid("gen_id")
    .notNull()
    .references(() => generations.id, { onDelete: "cascade" }),
});

export const genRelations = relations(generations, ({ many }) => ({
  inputImages: many(inputImages),
  steps: many(steps),
}));

export const stepRelations = relations(steps, ({ one, many }) => ({
  generation: one(generations, {
    fields: [steps.generationId],
    references: [generations.id],
  }),
  artifacts: many(artifacts),
}));

export const artifactRelations = relations(artifacts, ({ one }) => ({
  step: one(steps, {
    fields: [artifacts.stepId],
    references: [steps.id],
  }),
}));

export const inputImageRelations = relations(inputImages, ({ one }) => ({
  generation: one(generations, {
    fields: [inputImages.generationId],
    references: [generations.id],
  }),
}));

export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
export type Step = typeof steps.$inferSelect;
export type NewStep = typeof steps.$inferInsert;
export type Artifact = typeof artifacts.$inferSelect;
export type NewArtifact = typeof artifacts.$inferInsert;
