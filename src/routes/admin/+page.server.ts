import { error } from '@sveltejs/kit';

export async function load({ locals }) {
	if (!locals.user.isAdmin) {
		error(403, 'Admin access required');
	}
	return {};
}
