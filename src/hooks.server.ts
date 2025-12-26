import type { Handle } from '@sveltejs/kit';
import { DEV_AUTH_USER } from '$env/static/private';
import * as auth from '$lib/server/auth';
import dbg from 'debug';

const debug = dbg('app:hooks');

const handleAuth: Handle = async ({ event, resolve }) => {
	// Dev mode: use fixed user from env (no session needed)
	if (DEV_AUTH_USER) {
		debug('Dev mode: using DEV_AUTH_USER %s', DEV_AUTH_USER);
		const user = await auth.getOrCreateUser(DEV_AUTH_USER);
		event.locals.user = user;
		event.locals.session = null;
		return resolve(event);
	}

	// Production: session-based auth
	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (sessionToken) {
		const { session, user } = await auth.validateSessionToken(sessionToken);
		if (session && user) {
			debug('Valid session for user %s (anon=%s)', user.id, auth.isAnonymous(user));
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
			event.locals.user = user;
			event.locals.session = session;
			return resolve(event);
		}
		debug('Invalid session, clearing cookie');
		auth.deleteSessionTokenCookie(event);
	}

	// No valid session - create anonymous user
	debug('Creating anonymous user');
	const { user, session, token } = await auth.createAnonymousUserWithSession();
	auth.setSessionTokenCookie(event, token, session.expiresAt);
	event.locals.user = user;
	event.locals.session = session;

	return resolve(event);
};

export const handle: Handle = handleAuth;
