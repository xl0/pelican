import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import * as auth from '$lib/server/auth';
import dbg from 'debug';

const debug = dbg('app:hooks');

function extractMetadata(event: Parameters<Handle>[0]['event']): auth.UserMetadata {
	const url = new URL(event.request.url);
	return {
		ip: event.getClientAddress(),
		userAgent: event.request.headers.get('user-agent') ?? undefined,
		referrer: event.request.headers.get('referer') ?? undefined,
		acceptLanguage: event.request.headers.get('accept-language') ?? undefined,
		platform: event.request.headers.get('sec-ch-ua-platform')?.replace(/"/g, '') ?? undefined,
		isMobile: event.request.headers.get('sec-ch-ua-mobile') === '?1',
		utmSource: url.searchParams.get('utm_source') ?? undefined,
		utmMedium: url.searchParams.get('utm_medium') ?? undefined,
		utmCampaign: url.searchParams.get('utm_campaign') ?? undefined,
		landingPage: url.pathname
	};
}

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
			debug('Valid session for user %s (anon=%s)', user.id, user.isAnon);
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

	// No valid session - create anonymous user with request metadata
	debug('Creating anonymous user');
	const metadata = extractMetadata(event);
	const { user, session, token } = await auth.createAnonymousUserWithSession(metadata);
	auth.setSessionTokenCookie(event, token, session.expiresAt);
	event.locals.user = user;
	event.locals.session = session;

	return resolve(event);
};

export const handle: Handle = handleAuth;
