import dbg from 'debug';

const debug = dbg('app:layout:server');

export async function load({ locals }) {
	debug('Loading layout data for user: %s', locals.user);
	return { user: locals.user };
}
