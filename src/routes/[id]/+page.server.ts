import { db_getGeneration } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import dbg from 'debug';

const debug = dbg('app:[id]:server');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function load({ params, locals }) {
	// Validate UUID format before querying DB
	if (!UUID_REGEX.test(params.id)) {
		error(404, 'Not found');
	}

	const gen = await db_getGeneration(params.id, locals.user?.id ?? null);
	if (!gen) {
		error(404, 'Generation not found');
	}
	debug('Loaded generation %s for SSR', params.id);
	return { generation: gen };
}
