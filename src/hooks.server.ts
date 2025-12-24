import { DEV_AUTH_USER } from '$env/static/private';
import dbg from 'debug';

const debug = dbg('app:hooks');

export async function handle({ event, resolve }) {
	if (DEV_AUTH_USER) {
		debug('Setting dev user: %s', DEV_AUTH_USER);
		event.locals.user = DEV_AUTH_USER;
	}
	return await resolve(event);
}
