import { command, query } from '$app/server';
import * as v from 'valibot';
import * as db from '$lib/server/db';
import * as s3 from '$lib/server/s3';
import {
	type NewGeneration,
	type UpdateGeneration,
	type NewStep,
	type UpdateStep,
	formatValues,
	statusValues
} from '$lib/server/db/schema';
import dbg from 'debug';

const debug = dbg('app:remote');

// ============================================================================
// Generations
// ============================================================================

export const insertGeneration = command(
	v.object({
		userId: v.string(),
		title: v.string(),
		prompt: v.string(),
		format: v.picklist(formatValues),
		width: v.number(),
		height: v.number(),
		provider: v.string(),
		model: v.string(),
		endpoint: v.nullable(v.string()),
		initialTemplate: v.string(),
		refinementTemplate: v.string()
	}),
	async (data) => {
		try {
			return await db.db_insertGeneration(data as NewGeneration);
		} finally {
			debug('insertGeneration');
		}
	}
);

export const updateGeneration = command(
	v.object({
		id: v.string(),
		title: v.optional(v.string()),
		prompt: v.optional(v.string()),
		format: v.optional(v.picklist(formatValues)),
		width: v.optional(v.number()),
		height: v.optional(v.number()),
		provider: v.optional(v.string()),
		model: v.optional(v.string()),
		endpoint: v.optional(v.nullable(v.string())),
		initialTemplate: v.optional(v.string()),
		refinementTemplate: v.optional(v.string())
	}),
	async (data) => {
		try {
			return await db.db_updateGeneration(data as UpdateGeneration);
		} finally {
			debug('updateGeneration id=%s', data.id);
		}
	}
);

export const getGeneration = query(v.object({ id: v.string() }), async ({ id }) => {
	try {
		return await db.db_getGeneration(id);
	} finally {
		debug('getGeneration id=%s', id);
	}
});

export const getGenerations = query(v.object({ userId: v.string() }), async ({ userId }) => {
	try {
		return await db.db_getGenerations(userId);
	} finally {
		debug('getGenerations userId=%s', userId);
	}
});

export const getPublicGenerations = query(v.object({ limit: v.optional(v.number()) }), async ({ limit }) => {
	try {
		return await db.db_getPublicGenerations(limit);
	} finally {
		debug('getPublicGenerations limit=%d', limit);
	}
});

// ============================================================================
// Steps
// ============================================================================

export const insertStep = command(
	v.object({
		generationId: v.string(),
		renderedPrompt: v.string(),
		status: v.picklist(statusValues)
	}),
	async (data) => {
		try {
			return await db.db_insertStep(data as NewStep);
		} finally {
			debug('insertStep genId=%s', data.generationId);
		}
	}
);

export const updateStep = command(
	v.object({
		id: v.number(),
		renderedPrompt: v.optional(v.string()),
		status: v.optional(v.picklist(statusValues)),
		errorMessage: v.optional(v.nullable(v.string())),
		rawOutput: v.optional(v.nullable(v.string())),
		inputTokens: v.optional(v.nullable(v.number())),
		outputTokens: v.optional(v.nullable(v.number())),
		inputCost: v.optional(v.nullable(v.number())),
		outputCost: v.optional(v.nullable(v.number())),
		completedAt: v.optional(v.nullable(v.date()))
	}),
	async (data) => {
		try {
			return await db.db_updateStep(data as UpdateStep);
		} finally {
			debug('updateStep id=%d', data.id);
		}
	}
);

export const getStep = query(v.object({ id: v.number() }), async ({ id }) => {
	try {
		return await db.db_getStep(id);
	} finally {
		debug('getStep id=%d', id);
	}
});

export const getSteps = query(v.object({ generationId: v.string() }), async ({ generationId }) => {
	try {
		return await db.db_getSteps(generationId);
	} finally {
		debug('getSteps genId=%s', generationId);
	}
});

// ============================================================================
// Artifacts
// ============================================================================

export const getArtifact = query(v.object({ id: v.number() }), async ({ id }) => {
	try {
		return await db.db_getArtifact(id);
	} finally {
		debug('getArtifact id=%d', id);
	}
});

export const getArtifacts = query(v.object({ stepId: v.number() }), async ({ stepId }) => {
	try {
		return await db.db_getArtifacts(stepId);
	} finally {
		debug('getArtifacts stepId=%d', stepId);
	}
});

// ============================================================================
// Input Images
// ============================================================================

export const getInputImage = query(v.object({ id: v.string() }), async ({ id }) => {
	try {
		return await db.db_getInputImage(id);
	} finally {
		debug('getInputImage id=%s', id);
	}
});

export const getInputImages = query(v.object({ generationId: v.string() }), async ({ generationId }) => {
	try {
		return await db.db_getInputImages(generationId);
	} finally {
		debug('getInputImages genId=%s', generationId);
	}
});

// ============================================================================
// S3 Uploads (with DB integration)
// ============================================================================

export const uploadInputImage = command(
	v.object({
		generationId: v.string(),
		data: v.file(),
		extension: v.string()
	}),
	async ({ generationId, data, extension }) => {
		let key: string | undefined;
		const image = await db.db_insertInputImage(generationId);
		try {
			key = await s3.uploadInputImage(generationId, image.id, new Uint8Array(await data.arrayBuffer()), extension);
			return { id: image.id, key };
		} catch (e) {
			await db.db_deleteInputImage(image.id);
			throw e;
		} finally {
			debug('uploadInputImage genId=%s key=%s', generationId, key);
		}
	}
);

export const uploadArtifact = command(
	v.object({
		generationId: v.string(),
		stepId: v.number(),
		content: v.string(),
		format: v.picklist(['svg', 'ascii'])
	}),
	async ({ generationId, stepId, content, format }) => {
		let key: string | undefined;
		const artifact = await db.db_insertArtifact({ stepId, body: content });
		try {
			key = await s3.uploadStepArtifact(generationId, stepId, artifact.id, content, format);
			return { id: artifact.id, key };
		} catch (e) {
			await db.db_deleteArtifact(artifact.id);
			throw e;
		} finally {
			debug('uploadArtifact genId=%s stepId=%d key=%s', generationId, stepId, key);
		}
	}
);
