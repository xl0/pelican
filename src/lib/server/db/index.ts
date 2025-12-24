import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { DATABASE_URL } from '$env/static/private';
import {
	generations,
	steps,
	artifacts,
	inputImages,
	type NewGeneration,
	type UpdateGeneration,
	type NewStep,
	type UpdateStep,
	type NewArtifact
} from './schema';
import { eq, desc } from 'drizzle-orm';
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

export async function db_getGeneration(id: string) {
	try {
		return await db.query.generations.findFirst({
			where: eq(generations.id, id),
			with: { steps: { with: { artifacts: true } }, inputImages: true }
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
// Input Images
// ============================================================================

export async function db_getInputImages(generationId: string) {
	try {
		return await db.select().from(inputImages).where(eq(inputImages.generationId, generationId));
	} finally {
		debug('getInputImages genId=%s', generationId);
	}
}

export async function db_getInputImage(id: string) {
	try {
		const res = await db.select().from(inputImages).where(eq(inputImages.id, id));
		return res[0];
	} finally {
		debug('getInputImage id=%s', id);
	}
}

export async function db_insertInputImage(generationId: string) {
	let result: { id: string } | undefined;
	try {
		const res = await db.insert(inputImages).values({ generationId }).returning();
		result = res[0];
		return result;
	} finally {
		debug('insertInputImage genId=%s id=%s', generationId, result?.id);
	}
}

export async function db_deleteInputImage(id: string) {
	try {
		await db.delete(inputImages).where(eq(inputImages.id, id));
	} finally {
		debug('deleteInputImage id=%s', id);
	}
}
