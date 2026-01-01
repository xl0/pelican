import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { DATABASE_URL } from '$env/static/private';
import {
	generations,
	steps,
	artifacts,
	images,
	generationImages,
	providers,
	models,
	type NewGeneration,
	type UpdateGeneration,
	type NewStep,
	type UpdateStep,
	type NewArtifact
} from './schema';
import { eq, desc, asc, and, count, sql, or, ne } from 'drizzle-orm';
import dbg from 'debug';
import { users } from './schema';

const debug = dbg('app:db');

const client = postgres(DATABASE_URL);
export const db = drizzle(client, { schema });

// ============================================================================
// Providers & Models Catalog
// ============================================================================

export async function db_getProvidersWithModels() {
	try {
		return await db.query.providers.findMany({
			orderBy: asc(providers.sortOrder),
			with: { models: { orderBy: asc(models.id) } }
		});
	} finally {
		debug('getProvidersWithModels');
	}
}

// Provider CRUD
export async function db_insertProvider(data: { id: string; label: string; sortOrder?: number; apiKeyUrl?: string | null }) {
	try {
		const res = await db.insert(providers).values(data).returning();
		return res[0];
	} finally {
		debug('insertProvider id=%s', data.id);
	}
}

export async function db_updateProvider(id: string, data: { label?: string; sortOrder?: number; apiKeyUrl?: string | null }) {
	try {
		const res = await db.update(providers).set(data).where(eq(providers.id, id)).returning();
		return res[0];
	} finally {
		debug('updateProvider id=%s', id);
	}
}

export async function db_deleteProvider(id: string) {
	try {
		await db.delete(providers).where(eq(providers.id, id));
	} finally {
		debug('deleteProvider id=%s', id);
	}
}

// Model CRUD
export async function db_insertModel(data: {
	providerId: string;
	value: string;
	label: string;
	inputPrice?: number;
	outputPrice?: number;
	supportsImages?: boolean;
}) {
	try {
		const res = await db.insert(models).values(data).returning();
		return res[0];
	} finally {
		debug('insertModel providerId=%s value=%s', data.providerId, data.value);
	}
}

export async function db_updateModel(
	id: number,
	data: { value?: string; label?: string; inputPrice?: number; outputPrice?: number; supportsImages?: boolean }
) {
	try {
		const res = await db.update(models).set(data).where(eq(models.id, id)).returning();
		return res[0];
	} finally {
		debug('updateModel id=%d', id);
	}
}

export async function db_deleteModel(id: number) {
	try {
		await db.delete(models).where(eq(models.id, id));
	} finally {
		debug('deleteModel id=%d', id);
	}
}

// ============================================================================
// Generations
// ============================================================================

export async function db_getGenerations(userId: string, limit = 20, offset = 0) {
	try {
		const [items, countResult] = await Promise.all([
			db.query.generations.findMany({
				columns: {
					initialTemplate: false,
					refinementTemplate: false
				},
				where: eq(generations.userId, userId),
				orderBy: desc(generations.updatedAt),
				limit,
				offset,
				with: {
					steps: {
						columns: { id: true },
						orderBy: desc(steps.id),
						limit: 1,
						with: { artifacts: { columns: { id: true }, orderBy: desc(artifacts.id), limit: 1 } }
					}
				}
			}),
			db.select({ count: count() }).from(generations).where(eq(generations.userId, userId))
		]);
		return { items, count: countResult[0]?.count ?? 0 };
	} finally {
		debug('getGenerations userId=%s limit=%d offset=%d', userId, limit, offset);
	}
}

export async function db_getPublicGenerations(limit = 20, offset = 0, approvalStatus?: 'approved' | 'pending' | 'rejected') {
	try {
		const conditions = [eq(generations.access, 'gallery')];
		if (approvalStatus) {
			conditions.push(eq(generations.approval, approvalStatus));
		}
		const whereClause = and(...conditions);
		const orderBy = approvalStatus === 'pending' ? asc(generations.createdAt) : desc(generations.createdAt);

		const [items, countResult] = await Promise.all([
			db.query.generations.findMany({
				columns: {
					initialTemplate: false,
					refinementTemplate: false
				},
				where: whereClause,
				orderBy,
				limit,
				offset,
				with: {
					steps: {
						columns: { id: true },
						orderBy: desc(steps.id),
						limit: 1,
						with: { artifacts: { columns: { id: true }, orderBy: desc(artifacts.id), limit: 1 } }
					}
				}
			}),
			db.select({ count: count() }).from(generations).where(whereClause)
		]);
		return { items, count: countResult[0]?.count ?? 0 };
	} finally {
		debug('getPublicGenerations limit=%d offset=%d status=%s', limit, offset, approvalStatus);
	}
}

// Get generation - checks ownership or access is not private
export async function db_getGeneration(id: string, userId: string) {
	try {
		// Access: owner (userId matches) OR access is not 'private'
		const whereClause = and(eq(generations.id, id), or(eq(generations.userId, userId), ne(generations.access, 'private')));
		return await db.query.generations.findFirst({
			where: whereClause,
			with: {
				steps: {
					orderBy: asc(steps.id),
					with: { artifacts: { orderBy: asc(artifacts.id) } }
				},
				generationImages: { with: { image: true } }
			}
		});
	} finally {
		debug('getGeneration id=%s userId=%s', id, userId);
	}
}

export async function db_insertGeneration(data: NewGeneration) {
	let result: { id: string } | undefined;
	try {
		const res = await db.insert(generations).values(data).returning();
		result = res[0];
		return result;
	} finally {
		debug('insertGeneration id=%s', result?.id);
	}
}

export async function db_updateGeneration(data: UpdateGeneration, isAdmin = false) {
	try {
		const { id, userId, ...rest } = data;
		const whereClause = isAdmin ? eq(generations.id, id) : and(eq(generations.id, id), eq(generations.userId, userId));
		const res = await db.update(generations).set(rest).where(whereClause).returning();
		return res[0];
	} finally {
		debug('updateGeneration id=%s userId=%s isAdmin=%s', data.id, data.userId, isAdmin);
	}
}

// ============================================================================
// Steps
// ============================================================================

export async function db_insertStep(data: NewStep) {
	let result: { id: number } | undefined;
	try {
		const gen = await db.query.generations.findFirst({
			where: and(eq(generations.id, data.generationId), eq(generations.userId, data.userId)),
			columns: { id: true, userId: true }
		});
		if (!gen) throw new Error('Generation not found or not owned by user');

		// Ensure step inherits user ID from generation
		data.userId = gen.userId;

		const res = await db.insert(steps).values(data).returning();
		result = res[0];
		return result;
	} finally {
		debug('insertStep genId=%s userId=%s id=%d', data.generationId, data.userId, result?.id);
	}
}

export async function db_updateStep(data: UpdateStep, userId: string, isAdmin = false) {
	try {
		const { id, ...rest } = data;
		const whereClause = isAdmin ? eq(steps.id, id) : and(eq(steps.id, id), eq(steps.userId, userId));
		const res = await db.update(steps).set(rest).where(whereClause).returning();
		return res[0];
	} finally {
		debug('updateStep id=%d userId=%s isAdmin=%s', data.id, userId, isAdmin);
	}
}

// ============================================================================
// Artifacts
// ============================================================================

export async function db_insertArtifact(data: NewArtifact) {
	let result: { id: number } | undefined;
	try {
		// Verify step exists and belongs to user (unless admin)
		const step = await db.query.steps.findFirst({
			where: and(eq(steps.id, data.stepId), eq(steps.userId, data.userId)),
			columns: { id: true, userId: true }
		});
		if (!step) throw new Error('Step not found or not owned by user');

		data.userId = step.userId;

		const res = await db.insert(artifacts).values(data).returning();
		result = res[0];
		return result;
	} finally {
		debug('insertArtifact stepId=%d userId=%s id=%d', data.stepId, data.userId, result?.id);
	}
}

export async function db_deleteArtifact(id: number) {
	try {
		await db.delete(artifacts).where(eq(artifacts.id, id));
	} finally {
		debug('deleteArtifact id=%d', id);
	}
}

// ============================================================================
// Images
// ============================================================================

export async function db_insertImage(userId: string, extension: string) {
	let result: { id: string } | undefined;
	try {
		const res = await db.insert(images).values({ userId, extension }).returning();
		result = res[0];
		return result;
	} finally {
		debug('insertImage id=%s userId=%s ext=%s', result?.id, userId, extension);
	}
}

export async function db_linkImageToGeneration(userId: string, generationId: string, imageId: string) {
	try {
		// Verify generation and image both belong to user
		// XXX can we combine into 1 query?
		const gen = await db.query.generations.findFirst({
			where: and(eq(generations.id, generationId), eq(generations.userId, userId)),
			columns: { id: true }
		});
		if (!gen) throw new Error('Generation not found or not owned by user');
		const img = await db.query.images.findFirst({
			where: and(eq(images.id, imageId), eq(images.userId, userId)),
			columns: { id: true }
		});
		if (!img) throw new Error('Image not found or not owned by user');
		await db.insert(generationImages).values({ generationId, imageId }).onConflictDoNothing();
	} finally {
		debug('linkImageToGeneration userId=%s genId=%s imgId=%s', userId, generationId, imageId);
	}
}

export async function db_unlinkImageFromGeneration(generationId: string, imageId: string) {
	try {
		await db.delete(generationImages).where(eq(generationImages.generationId, generationId));
	} finally {
		debug('unlinkImageFromGeneration genId=%s imgId=%s', generationId, imageId);
	}
}

export async function db_deleteImage(id: string) {
	try {
		await db.delete(images).where(eq(images.id, id));
	} finally {
		debug('deleteImage id=%s', id);
	}
}

// ============================================================================
// Users / Admin
// ============================================================================

export async function db_getAdminStats() {
	try {
		const [userStats, genStats, pendingCount] = await Promise.all([
			db
				.select({
					total: sql<number>`count(*)::int`,
					anon: sql<number>`count(*) filter (where ${users.isAnon} = true)::int`,
					registered: sql<number>`count(*) filter (where ${users.isAnon} = false)::int`
				})
				.from(users),
			db
				.select({
					total: sql<number>`count(*)::int`,
					approved: sql<number>`count(*) filter (where ${generations.approval} = 'approved')::int`,
					pending: sql<number>`count(*) filter (where ${generations.approval} = 'pending')::int`,
					rejected: sql<number>`count(*) filter (where ${generations.approval} = 'rejected')::int`,
					gallery: sql<number>`count(*) filter (where ${generations.access} = 'gallery')::int`,
					shared: sql<number>`count(*) filter (where ${generations.access} in ('shared', 'gallery'))::int`
				})
				.from(generations),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(generations)
				.where(and(eq(generations.access, 'gallery'), eq(generations.approval, 'pending')))
		]);
		return {
			users: userStats[0] ?? { total: 0, anon: 0, registered: 0 },
			generations: genStats[0] ?? { total: 0, approved: 0, pending: 0, rejected: 0, gallery: 0, shared: 0 },
			pendingModeration: pendingCount[0]?.count ?? 0
		};
	} finally {
		debug('getAdminStats');
	}
}
