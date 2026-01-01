import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import * as auth from '$lib/server/auth';
import dbg from 'debug';

const debug = dbg('app:hooks');

const handleAuth: Handle = async ({ event, resolve }) => {
	// Dev mode: use fixed user from env (no session needed)
	if (env.DEV_AUTH_USER) {
		debug('Dev mode: using DEV_AUTH_USER %s', env.DEV_AUTH_USER);
		const user = await auth.getOrCreateUser(env.DEV_AUTH_USER);
		event.locals.user = user;
		event.locals.session = null;
		return resolve(event);
	}

	// Production: session-based auth
	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (sessionToken) {
		const { session, user } = await auth.validateSessionToken(sessionToken);
		if (session && user) {
			debug('Valid session for user %s (registered=%s)', user.id, user.isRegistered);
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
			event.locals.user = user;
			event.locals.session = session;
			// Update activity tracking (fire and forget)
			auth.updateUserActivity(user.id).catch(() => {});
			return resolve(event);
		}
		debug('Invalid session, clearing cookie');
		auth.deleteSessionTokenCookie(event);
	}

	// No valid session - user will be created lazily when a command is executed
	debug('No valid session, deferring user creation');
	event.locals.user = null;
	event.locals.session = null;

	return resolve(event);
};

export const handle: Handle = handleAuth;
