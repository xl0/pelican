import { hash, verify } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const ARGON2_OPTS = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user && !auth.isAnonymous(locals.user)) {
		return redirect(302, '/');
	}
	return { isAnonymous: locals.user ? auth.isAnonymous(locals.user) : true };
};

export const actions: Actions = {
	login: async (event) => {
		const formData = await event.request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		if (!validateUsername(username)) {
			return fail(400, { message: 'Invalid username (3-31 chars, alphanumeric/underscore/dash)' });
		}
		if (!validatePassword(password)) {
			return fail(400, { message: 'Invalid password (6-255 chars)' });
		}

		const existingUser = await auth.getUserByUsername(username);
		if (!existingUser || !existingUser.passwordHash) {
			return fail(400, { message: 'Incorrect username or password' });
		}

		const validPassword = await verify(existingUser.passwordHash, password, ARGON2_OPTS);
		if (!validPassword) {
			return fail(400, { message: 'Incorrect username or password' });
		}

		// Create new session for the registered user
		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(sessionToken, existingUser.id, false);
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

		return redirect(302, '/');
	},

	register: async (event) => {
		const formData = await event.request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		if (!validateUsername(username)) {
			return fail(400, { message: 'Invalid username (3-31 chars, alphanumeric/underscore/dash)' });
		}
		if (!validatePassword(password)) {
			return fail(400, { message: 'Invalid password (6-255 chars)' });
		}

		// Check if username is taken
		const existingUser = await auth.getUserByUsername(username);
		if (existingUser) {
			return fail(400, { message: 'Username already taken' });
		}

		const passwordHash = await hash(password, ARGON2_OPTS);
		const currentUser = event.locals.user;

		if (currentUser && auth.isAnonymous(currentUser)) {
			// Upgrade anonymous user to registered
			await auth.upgradeToRegistered(currentUser.id, username, passwordHash);
			// Update session expiry to registered duration
			if (event.locals.session) {
				const newExpiry = new Date(Date.now() + DAY_IN_MS * 30);
				await auth.updateSessionExpiry(event.locals.session.id, newExpiry);
			}
		} else {
			// Create new registered user (shouldn't happen normally, but handle it)
			const [newUser] = await db.insert(table.users).values({ username, passwordHash }).returning();
			const sessionToken = auth.generateSessionToken();
			const session = await auth.createSession(sessionToken, newUser.id, false);
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
		}

		return redirect(302, '/');
	},

	logout: async (event) => {
		if (event.locals.session) {
			await auth.invalidateSession(event.locals.session.id);
		}
		auth.deleteSessionTokenCookie(event);
		return redirect(302, '/auth/login');
	}
};

function validateUsername(username: unknown): username is string {
	return typeof username === 'string' && username.length >= 3 && username.length <= 31 && /^[a-z0-9_-]+$/.test(username);
}

function validatePassword(password: unknown): password is string {
	return typeof password === 'string' && password.length >= 6 && password.length <= 255;
}
