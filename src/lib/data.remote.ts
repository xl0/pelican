import { command, getRequestEvent, query } from '$app/server';
import * as db from '$lib/server/db';
import { accessValues, approvalValues, formatValues, statusValues } from '$lib/server/db/schema';
import * as s3 from '$lib/server/s3';
import * as auth from '$lib/server/auth';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

import dbg from 'debug';
const debug = dbg('app:remote');

/** Get current user ID or null if no user session exists. For queries that can work anonymously. */
function getCurrentUserIdOrNull(): string | null {
	const { locals } = getRequestEvent();
	return locals.user?.id ?? null;
}

/** Ensure a user exists (creating one if needed). For commands that require a user. */
async function ensureCurrentUser() {
	const event = getRequestEvent();
	return auth.ensureUser(event);
}

function assertAdmin(): void {
	const { locals } = getRequestEvent();
	if (!locals.user?.isAdmin) error(403, 'Admin access required');
}

// ============================================================================
// Providers & Models Catalog
// ============================================================================

export const getProvidersWithModels = query(async () => {
	try {
		return await db.db_getProvidersWithModels();
	} finally {
		debug('getProvidersWithModels');
	}
});

// ============================================================================
// Generations
// ============================================================================

export const insertGeneration = command(
	v.object({
		prompt: v.string(),
		format: v.picklist(formatValues),
		width: v.number(),
		height: v.number(),
		provider: v.string(),
		model: v.string(),
		endpoint: v.nullable(v.string()),
		initialTemplate: v.string(),
		refinementTemplate: v.string(),
		maxSteps: v.number(),
		sendFullHistory: v.boolean(),
		access: v.optional(v.picklist(accessValues))
	}),
	async (data) => {
		const { user } = await ensureCurrentUser();

		// Anon users: all generations go to gallery for review
		// Registered users: use provided or default to private
		const access = user.isRegistered ? data.access : 'gallery';

		try {
			return await db.db_insertGeneration({ ...data, userId: user.id, access, approval: 'pending' });
		} finally {
			debug('insertGeneration userId=%s isRegistered=%s', user.id, user.isRegistered);
		}
	}
);

export const updateGeneration = command(
	v.object({
		id: v.string(),
		prompt: v.optional(v.string()),
		format: v.optional(v.picklist(formatValues)),
		width: v.optional(v.number()),
		height: v.optional(v.number()),
		provider: v.optional(v.string()),
		model: v.optional(v.string()),
		endpoint: v.optional(v.nullable(v.string())),
		initialTemplate: v.optional(v.string()),
		refinementTemplate: v.optional(v.string()),
		maxSteps: v.optional(v.number()),
		sendFullHistory: v.optional(v.boolean()),
		approval: v.optional(v.picklist(approvalValues)),
		access: v.optional(v.picklist(accessValues))
	}),
	async (data) => {
		const { user } = await ensureCurrentUser();

		// Only admin can change approval
		if (data.approval !== undefined && !user.isAdmin) {
			error(403, 'Only admins can change approval status');
		}

		// Anon users can't change access
		if (!user.isRegistered && data.access !== undefined) {
			error(403, 'Anonymous users cannot change access');
		}

		try {
			return await db.db_updateGeneration({ ...data, userId: user.id }, user.isAdmin);
		} finally {
			debug('updateGeneration id=%s userId=%s isAdmin=%s', data.id, user.id, user.isAdmin);
		}
	}
);

export const getGeneration = query(v.object({ id: v.string() }), async ({ id }) => {
	const userId = getCurrentUserIdOrNull();
	try {
		return await db.db_getGeneration(id, userId);
	} finally {
		debug('getGeneration id=%s userId=%s', id, userId);
	}
});

export const getGenerations = query(
	v.object({ limit: v.optional(v.number()), offset: v.optional(v.number()) }),
	async ({ limit, offset }) => {
		const userId = getCurrentUserIdOrNull();
		if (!userId) return { items: [], count: 0 }; // No user = no history
		try {
			return await db.db_getGenerations(userId, limit, offset);
		} finally {
			debug('getGenerations userId=%s limit=%d offset=%d', userId, limit, offset);
		}
	}
);

export const getPublicGenerations = query(
	v.object({
		limit: v.optional(v.number()),
		offset: v.optional(v.number()),
		approval: v.optional(v.picklist(approvalValues))
	}),
	async ({ limit, offset, approval }) => {
		try {
			return await db.db_getPublicGenerations(limit, offset, approval);
		} finally {
			debug('getPublicGenerations limit=%d offset=%d approval=%s', limit, offset, approval);
		}
	}
);

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
		const { user } = await ensureCurrentUser();
		try {
			return await db.db_insertStep({ ...data, userId: user.id });
		} finally {
			debug('insertStep genId=%s userId=%s', data.generationId, user.id);
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
		const { user } = await ensureCurrentUser();
		try {
			return await db.db_updateStep(data, user.id, user.isAdmin);
		} finally {
			debug('updateStep id=%d userId=%s isAdmin=%s', data.id, user.id, user.isAdmin);
		}
	}
);

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
		const { user } = await ensureCurrentUser();
		let key: string | undefined;
		// Create standalone image record
		const image = await db.db_insertImage(user.id, extension);
		try {
			// Upload to S3 (path: input/{imageId}.{ext})
			key = await s3.uploadInputImage(image.id, data, extension);
			// Link image to generation
			await db.db_linkImageToGeneration(user.id, generationId, image.id);
			return { id: image.id, key };
		} catch (e) {
			await db.db_deleteImage(image.id);
			throw e;
		} finally {
			debug('uploadInputImage genId=%s imgId=%s key=%s userId=%s', generationId, image.id, key, user.id);
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
		renderError: v.optional(v.nullable(v.string())) // error message if rendering failed
	}),
	async ({ generationId, stepId, content, format, renderedData, renderError }) => {
		const { user } = await ensureCurrentUser();
		let key: string | undefined;
		let renderedKey: string | undefined;
		const artifact = await db.db_insertArtifact({ userId: user.id, stepId, body: content, renderError });
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
			debug('uploadArtifact genId=%s stepId=%d key=%s userId=%s', generationId, stepId, key, user.id);
		}
	}
);

export const linkImageToGeneration = command(
	v.object({
		generationId: v.string(),
		imageId: v.string()
	}),
	async ({ generationId, imageId }) => {
		const { user } = await ensureCurrentUser();
		await db.db_linkImageToGeneration(user.id, generationId, imageId);
		debug('linkImageToGeneration genId=%s imgId=%s userId=%s', generationId, imageId, user.id);
	}
);

// ============================================================================
// Admin Functions
// ============================================================================

export const getAdminStats = query(async () => {
	assertAdmin();
	let res;
	try {
		res = await db.db_getAdminStats();
	} finally {
		debug('getAdminStats', { res });
		return res;
	}
});

// Provider CRUD (admin only)
export const insertProvider = command(
	v.object({
		id: v.string(),
		label: v.string(),
		sortOrder: v.optional(v.number()),
		apiKeyUrl: v.optional(v.nullable(v.string()))
	}),
	async (data) => {
		assertAdmin();
		try {
			return await db.db_insertProvider(data);
		} finally {
			debug('insertProvider id=%s', data.id);
		}
	}
);

export const updateProvider = command(
	v.object({
		id: v.string(),
		label: v.optional(v.string()),
		sortOrder: v.optional(v.number()),
		apiKeyUrl: v.optional(v.nullable(v.string()))
	}),
	async ({ id, ...data }) => {
		assertAdmin();
		try {
			return await db.db_updateProvider(id, data);
		} finally {
			debug('updateProvider id=%s', id);
		}
	}
);

export const deleteProvider = command(v.object({ id: v.string() }), async ({ id }) => {
	assertAdmin();
	try {
		await db.db_deleteProvider(id);
	} finally {
		debug('deleteProvider id=%s', id);
	}
});

// Model CRUD (admin only)
export const insertModel = command(
	v.object({
		providerId: v.string(),
		value: v.string(),
		label: v.string(),
		inputPrice: v.optional(v.number()),
		outputPrice: v.optional(v.number()),
		supportsImages: v.optional(v.boolean())
	}),
	async (data) => {
		assertAdmin();
		try {
			return await db.db_insertModel(data);
		} finally {
			debug('insertModel providerId=%s value=%s', data.providerId, data.value);
		}
	}
);

export const updateModel = command(
	v.object({
		id: v.number(),
		value: v.optional(v.string()),
		label: v.optional(v.string()),
		inputPrice: v.optional(v.number()),
		outputPrice: v.optional(v.number()),
		supportsImages: v.optional(v.boolean())
	}),
	async ({ id, ...data }) => {
		assertAdmin();
		try {
			return await db.db_updateModel(id, data);
		} finally {
			debug('updateModel id=%d', id);
		}
	}
);

export const deleteModel = command(v.object({ id: v.number() }), async ({ id }) => {
	assertAdmin();
	try {
		await db.db_deleteModel(id);
	} finally {
		debug('deleteModel id=%d', id);
	}
});
