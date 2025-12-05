import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  serial,
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  outputFormat: text("output_format").$type<"svg" | "ascii">().notNull(),
  isColor: boolean("is_color").notNull().default(true),
  width: integer("width").notNull().default(800),
  height: integer("height").notNull().default(600),
  referenceImagePath: text("reference_image_path"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const generations = pgTable("generations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  provider: text("provider")
    .$type<
      "openai" | "anthropic" | "google" | "xai" | "openrouter" | "custom"
    >()
    .notNull(),
  model: text("model").notNull(),
  endpoint: text("endpoint"),
  promptTemplate: text("prompt_template").notNull(),
  renderedPrompt: text("rendered_prompt").notNull(),
  artifactPath: text("artifact_path").notNull(),
  status: text("status")
    .$type<"pending" | "generating" | "completed" | "failed">()
    .notNull()
    .default("pending"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  rawOutput: text("raw_output"),
  renderedImagePath: text("rendered_image_path"),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
