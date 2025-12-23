import { command } from "$app/server";
import * as v from "valibot";
import * as db from "$lib/server/db";
import * as s3 from "$lib/server/s3";
import type {
  NewGeneration,
  NewStep,
  NewArtifact,
} from "$lib/server/db/schema";

// Generation commands
export const upsertGeneration = command(
  v.object({
    id: v.optional(v.string()),
    userId: v.string(),
    title: v.string(),
    prompt: v.string(),
    format: v.picklist(["svg", "asii"]),
    width: v.number(),
    height: v.number(),
  }),
  async (data) => {
    return db.upsertGeneration(data as NewGeneration & { id?: string });
  },
);

export const getGeneration = command(
  v.object({ id: v.string() }),
  async ({ id }) => db.getGeneration(id),
);

export const getGenerations = command(
  v.object({ userId: v.string() }),
  async ({ userId }) => db.getGenerations(userId),
);

// Step commands
export const upsertStep = command(
  v.object({
    id: v.optional(v.string()),
    generationId: v.string(),
    provider: v.string(),
    model: v.string(),
    endpoint: v.nullable(v.string()),
    promptTemplate: v.string(),
    renderedPrompt: v.string(),
    status: v.picklist(["pending", "generating", "completed", "failed"]),
    errorMessage: v.optional(v.nullable(v.string())),
    rawOutput: v.optional(v.nullable(v.string())),
    inputTokens: v.optional(v.nullable(v.number())),
    outputTokens: v.optional(v.nullable(v.number())),
    inputCost: v.optional(v.nullable(v.number())),
    outputCost: v.optional(v.nullable(v.number())),
  }),
  async (data) => {
    return db.upsertStep(data as NewStep & { id?: string });
  },
);

export const getStep = command(v.object({ id: v.number() }), async ({ id }) =>
  db.getStep(id),
);

export const getSteps = command(
  v.object({ generationId: v.string() }),
  async ({ generationId }) => db.getSteps(generationId),
);

export const getArtifact = command(
  v.object({ id: v.number() }),
  async ({ id }) => db.getArtifact(id),
);

export const getArtifacts = command(
  v.object({ stepId: v.number() }),
  async ({ stepId }) => db.getArtifacts(stepId),
);

export const getInputImage = command(
  v.object({ id: v.string() }),
  async ({ id }) => db.getInputImage(id),
);

export const getInputImages = command(
  v.object({ generationId: v.string() }),
  async ({ generationId }) => db.getInputImages(generationId),
);

// S3 upload commands with DB integration
export const uploadInputImage = command(
  v.object({
    generationId: v.string(),
    data: v.file(),
    extension: v.string(),
  }),
  async ({ generationId, data, extension }) => {
    // 1. Create image record in DB
    const image = await db.upsertInputImage({ generationId });
    try {
      // 2. Upload to S3
      const key = await s3.uploadInputImage(
        generationId,
        image.id,
        new Uint8Array(await data.arrayBuffer()),
        extension,
      );
      return { id: image.id, key };
    } catch (err) {
      // 3. Rollback: delete DB record on upload failure
      await db.deleteInputImage(image.id);
      throw err;
    }
  },
);

export const uploadArtifact = command(
  v.object({
    generationId: v.string(),
    stepId: v.number(),
    content: v.string(),
    format: v.picklist(["svg", "ascii"]),
  }),
  async ({ generationId, stepId, content, format }) => {
    // 1. Create artifact record in DB
    const artifact = await db.upsertArtifact({ stepId, body: content });
    try {
      // 2. Upload to S3
      const key = await s3.uploadStepArtifact(
        generationId,
        stepId,
        artifact.id,
        content,
        format,
      );
      return { id: artifact.id, key };
    } catch (err) {
      // 3. Rollback: delete DB record on upload failure
      await db.deleteArtifact(artifact.id);
      throw err;
    }
  },
);
