import { command, query } from '$app/server';
import { providerNames } from '$lib/models';
import * as db from '$lib/server/db';
import { type NewStep, type UpdateGeneration, type UpdateStep, formatValues, statusValues } from '$lib/server/db/schema';
import * as s3 from '$lib/server/s3';
import dbg from 'debug';
import * as v from 'valibot';

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
		provider: v.picklist(providerNames),
		model: v.string(),
		endpoint: v.nullable(v.string()),
		initialTemplate: v.string(),
		refinementTemplate: v.string(),
		maxSteps: v.number(),
		sendFullHistory: v.boolean()
	}),
	async (data) => {
		try {
			return await db.db_insertGeneration(data);
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
		provider: v.optional(v.picklist(providerNames)),
		model: v.optional(v.string()),
		endpoint: v.optional(v.nullable(v.string())),
		initialTemplate: v.optional(v.string()),
		refinementTemplate: v.optional(v.string()),
		maxSteps: v.optional(v.number()),
		sendFullHistory: v.optional(v.boolean())
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
// Images
// ============================================================================

export const getImage = query(v.object({ id: v.string() }), async ({ id }) => {
	try {
		return await db.db_getImage(id);
	} finally {
		debug('getImage id=%s', id);
	}
});

export const getImagesForGeneration = query(v.object({ generationId: v.string() }), async ({ generationId }) => {
	try {
		return await db.db_getImagesForGeneration(generationId);
	} finally {
		debug('getImagesForGeneration genId=%s', generationId);
	}
});

// ============================================================================
// S3 Uploads (with DB integration)
// ============================================================================

export const uploadInputImage = command(
	v.object({
		generationId: v.string(),
		data: v.instance(Uint8Array),
		extension: v.string()
	}),
	async ({ generationId, data, extension }) => {
		let key: string | undefined;
		// Create standalone image record
		const image = await db.db_insertImage(extension);
		try {
			// Upload to S3 (path: input/{imageId}.{ext})
			key = await s3.uploadInputImage(image.id, data, extension);
			// Link image to generation
			await db.db_linkImageToGeneration(generationId, image.id);
			return { id: image.id, key };
		} catch (e) {
			await db.db_deleteImage(image.id);
			throw e;
		} finally {
			debug('uploadInputImage genId=%s imgId=%s key=%s', generationId, image.id, key);
		}
	}
);

export const uploadArtifact = command(
	v.object({
		generationId: v.string(),
		stepId: v.number(),
		content: v.string(),
		format: v.picklist(['svg', 'ascii']),
		renderedData: v.optional(v.instance(Uint8Array)), // PNG bytes if rendering succeeded
		rendered: v.optional(v.boolean()) // true if rendering succeeded
	}),
	async ({ generationId, stepId, content, format, renderedData, rendered = false }) => {
		let key: string | undefined;
		let renderedKey: string | undefined;
		const artifact = await db.db_insertArtifact({ stepId, body: content, rendered });
		try {
			// Upload SVG/ASCII artifact
			key = await s3.uploadStepArtifact(generationId, stepId, artifact.id, content, format);
			// Upload rendered PNG if provided
			if (renderedData) {
				renderedKey = await s3.uploadRenderedArtifact(generationId, stepId, artifact.id, renderedData);
			}
			return { id: artifact.id, key, renderedKey };
		} catch (e) {
			await db.db_deleteArtifact(artifact.id);
			throw e;
		} finally {
			debug('uploadArtifact genId=%s stepId=%d key=%s rendered=%s', generationId, stepId, key, renderedKey);
		}
	}
);

export const linkImageToGeneration = command(
	v.object({
		generationId: v.string(),
		imageId: v.string()
	}),
	async ({ generationId, imageId }) => {
		await db.db_linkImageToGeneration(generationId, imageId);
		debug('linkImageToGeneration genId=%s imgId=%s', generationId, imageId);
	}
);
