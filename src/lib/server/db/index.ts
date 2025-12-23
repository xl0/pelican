import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { DATABASE_URL } from "$env/static/private";
import {
  generations,
  steps,
  artifacts,
  inputImages,
  type NewGeneration,
  type NewStep,
  type NewArtifact,
} from "./schema";
import { eq, desc } from "drizzle-orm";

const client = postgres(DATABASE_URL);
export const db = drizzle(client, { schema });

// ============================================================================
// Generations
// ============================================================================

export async function getGenerations(userId: string) {
  return db.query.generations.findMany({
    columns: {
      id: true,
      title: true,
      format: true,
      width: true,
      height: true,
      updatedAt: true,
    },
    where: eq(generations.userId, userId),
    orderBy: desc(generations.updatedAt),
    with: {
      steps: { columns: {}, with: { artifacts: { columns: { id: true } } } },
    },
  });
}

export async function getGeneration(id: string) {
  const result = await db.query.generations.findFirst({
    where: eq(generations.id, id),
    with: { steps: { with: { artifacts: true } }, inputImages: true },
  });
  return result;
}

export async function upsertGeneration(data: NewGeneration & { id?: string }) {
  if (data.id) {
    const { id, ...rest } = data;
    const result = await db
      .update(generations)
      .set(rest)
      .where(eq(generations.id, id))
      .returning();
    return result[0];
  }
  const result = await db.insert(generations).values(data).returning();
  return result[0];
}

// ============================================================================
// Steps
// ============================================================================

export async function getSteps(generationId: string) {
  return db
    .select()
    .from(steps)
    .where(eq(steps.generationId, generationId))
    .orderBy(steps.id);
}

export async function getStep(id: number) {
  const result = await db.query.steps.findFirst({
    where: eq(steps.id, id),
    with: { artifacts: true },
  });
  return result;
}

export async function upsertStep(data: NewStep & { id?: string }) {
  if (data.id) {
    const { id, ...rest } = data;
    const result = await db
      .update(steps)
      .set(rest)
      .where(eq(steps.id, id))
      .returning();
    return result[0];
  }
  const result = await db.insert(steps).values(data).returning();
  return result[0];
}

// ============================================================================
// Artifacts
// ============================================================================

export async function getArtifacts(stepId: number) {
  return db
    .select()
    .from(artifacts)
    .where(eq(artifacts.stepId, stepId))
    .orderBy(artifacts.id);
}

export async function getArtifact(id: number) {
  const result = await db.select().from(artifacts).where(eq(artifacts.id, id));
  return result[0];
}

export async function upsertArtifact(data: NewArtifact & { id?: number }) {
  if (data.id) {
    const { id, ...rest } = data;
    const result = await db
      .update(artifacts)
      .set(rest)
      .where(eq(artifacts.id, id))
      .returning();
    return result[0];
  }
  const result = await db.insert(artifacts).values(data).returning();
  return result[0];
}

export async function deleteArtifact(id: number) {
  await db.delete(artifacts).where(eq(artifacts.id, id));
}

// ============================================================================
// Input Images
// ============================================================================

export async function getInputImages(generationId: string) {
  return db
    .select()
    .from(inputImages)
    .where(eq(inputImages.generationId, generationId));
}

export async function getInputImage(id: string) {
  const result = await db
    .select()
    .from(inputImages)
    .where(eq(inputImages.id, id));
  return result[0];
}

export async function upsertInputImage(data: {
  id?: string;
  generationId: string;
}) {
  if (data.id) {
    const { id, ...rest } = data;
    const result = await db
      .update(inputImages)
      .set(rest)
      .where(eq(inputImages.id, id))
      .returning();
    return result[0];
  }
  const result = await db.insert(inputImages).values(data).returning();
  return result[0];
}

export async function deleteInputImage(id: string) {
  await db.delete(inputImages).where(eq(inputImages.id, id));
}
