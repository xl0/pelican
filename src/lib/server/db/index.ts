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
	type NewGeneration,
	type UpdateGeneration,
	type NewStep,
	type UpdateStep,
	type NewArtifact
} from './schema';
import { eq, desc, asc } from 'drizzle-orm';
import dbg from 'debug';

const debug = dbg('app:db');

const client = postgres(DATABASE_URL);
export const db = drizzle(client, { schema });

// ============================================================================
// Generations
// ============================================================================

export async function db_getGenerations(userId: string) {
	try {
		return await db.query.generations.findMany({
			columns: {
				id: true,
				title: true,
				format: true,
				width: true,
				height: true,
				updatedAt: true
			},
			where: eq(generations.userId, userId),
			orderBy: desc(generations.updatedAt),
			with: {
				steps: { columns: {}, with: { artifacts: { columns: { id: true } } } }
			}
		});
	} finally {
		debug('getGenerations userId=%s', userId);
	}
}

export async function db_getPublicGenerations(limit = 50) {
	try {
		return await db.query.generations.findMany({
			columns: {
				id: true,
				title: true,
				prompt: true,
				format: true,
				width: true,
				height: true,
				createdAt: true
			},
			orderBy: desc(generations.createdAt),
			limit,
			with: {
				steps: {
					columns: { id: true },
					orderBy: desc(steps.id),
					limit: 1,
					with: { artifacts: { columns: { id: true, body: true }, orderBy: desc(artifacts.id), limit: 1 } }
				}
			}
		});
	} finally {
		debug('getPublicGenerations limit=%d', limit);
	}
}

export async function db_getGeneration(id: string) {
	try {
		return await db.query.generations.findFirst({
			where: eq(generations.id, id),
			with: {
				steps: {
					orderBy: asc(steps.id),
					with: { artifacts: { orderBy: asc(artifacts.id) } }
				},
				generationImages: { with: { image: true } }
			}
		});
	} finally {
		debug('getGeneration id=%s', id);
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

export async function db_updateGeneration(data: UpdateGeneration) {
	try {
		const { id, ...rest } = data;
		const res = await db.update(generations).set(rest).where(eq(generations.id, id)).returning();
		return res[0];
	} finally {
		debug('updateGeneration id=%s', data.id);
	}
}

// ============================================================================
// Steps
// ============================================================================

export async function db_getSteps(generationId: string) {
	try {
		return await db.select().from(steps).where(eq(steps.generationId, generationId)).orderBy(steps.id);
	} finally {
		debug('getSteps generationId=%s', generationId);
	}
}

export async function db_getStep(id: number) {
	try {
		return await db.query.steps.findFirst({
			where: eq(steps.id, id),
			with: { artifacts: true }
		});
	} finally {
		debug('getStep id=%d', id);
	}
}

export async function db_insertStep(data: NewStep) {
	let result: { id: number } | undefined;
	try {
		const res = await db.insert(steps).values(data).returning();
		result = res[0];
		return result;
	} finally {
		debug('insertStep genId=%s id=%d', data.generationId, result?.id);
	}
}

export async function db_updateStep(data: UpdateStep) {
	try {
		const { id, ...rest } = data;
		const res = await db.update(steps).set(rest).where(eq(steps.id, id)).returning();
		return res[0];
	} finally {
		debug('updateStep id=%d', data.id);
	}
}

// ============================================================================
// Artifacts
// ============================================================================

export async function db_getArtifacts(stepId: number) {
	try {
		return await db.select().from(artifacts).where(eq(artifacts.stepId, stepId)).orderBy(artifacts.id);
	} finally {
		debug('getArtifacts stepId=%d', stepId);
	}
}

export async function db_getArtifact(id: number) {
	try {
		const res = await db.select().from(artifacts).where(eq(artifacts.id, id));
		return res[0];
	} finally {
		debug('getArtifact id=%d', id);
	}
}

export async function db_insertArtifact(data: NewArtifact) {
	let result: { id: number } | undefined;
	try {
		const res = await db.insert(artifacts).values(data).returning();
		result = res[0];
		return result;
	} finally {
		debug('insertArtifact stepId=%d id=%d', data.stepId, result?.id);
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

export async function db_getImagesForGeneration(generationId: string) {
	try {
		const links = await db.query.generationImages.findMany({
			where: eq(generationImages.generationId, generationId),
			with: { image: true }
		});
		return links.map((l) => l.image);
	} finally {
		debug('getImagesForGeneration genId=%s', generationId);
	}
}

export async function db_getImage(id: string) {
	try {
		return await db.query.images.findFirst({ where: eq(images.id, id) });
	} finally {
		debug('getImage id=%s', id);
	}
}

export async function db_insertImage(extension: string) {
	let result: { id: string } | undefined;
	try {
		const res = await db.insert(images).values({ extension }).returning();
		result = res[0];
		return result;
	} finally {
		debug('insertImage id=%s ext=%s', result?.id, extension);
	}
}

export async function db_linkImageToGeneration(generationId: string, imageId: string) {
	try {
		await db.insert(generationImages).values({ generationId, imageId }).onConflictDoNothing();
	} finally {
		debug('linkImageToGeneration genId=%s imgId=%s', generationId, imageId);
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
