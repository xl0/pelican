import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase64url, encodeHexLowerCase } from '@oslojs/encoding';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const ANON_SESSION_DAYS = 365;
const REGISTERED_SESSION_DAYS = 30;

export const sessionCookieName = 'auth-session';

export function generateSessionToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	return encodeBase64url(bytes);
}

function hashToken(token: string): string {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export function isAnonymous(user: table.User): boolean {
	return user.passwordHash === null;
}

export async function createAnonymousUser(): Promise<table.User> {
	const [user] = await db.insert(table.users).values({}).returning();
	return user;
}

export async function createSession(token: string, userId: string, anonymous: boolean): Promise<table.Session> {
	const sessionId = hashToken(token);
	const expiryDays = anonymous ? ANON_SESSION_DAYS : REGISTERED_SESSION_DAYS;
	const session: table.Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + DAY_IN_MS * expiryDays)
	};
	await db.insert(table.sessions).values(session);
	return session;
}

export async function createAnonymousUserWithSession(): Promise<{ user: table.User; session: table.Session; token: string }> {
	const user = await createAnonymousUser();
	const token = generateSessionToken();
	const session = await createSession(token, user.id, true);
	return { user, session, token };
}

export async function validateSessionToken(token: string): Promise<{ session: table.Session | null; user: table.User | null }> {
	const sessionId = hashToken(token);
	const [result] = await db
		.select({ user: table.users, session: table.sessions })
		.from(table.sessions)
		.innerJoin(table.users, eq(table.sessions.userId, table.users.id))
		.where(eq(table.sessions.id, sessionId));

	if (!result) return { session: null, user: null };

	const { session, user } = result;
	const sessionExpired = Date.now() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await db.delete(table.sessions).where(eq(table.sessions.id, session.id));
		return { session: null, user: null };
	}

	// Refresh session if registered user and near expiry (within 15 days)
	if (!isAnonymous(user)) {
		const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
		if (renewSession) {
			session.expiresAt = new Date(Date.now() + DAY_IN_MS * REGISTERED_SESSION_DAYS);
			await db.update(table.sessions).set({ expiresAt: session.expiresAt }).where(eq(table.sessions.id, session.id));
		}
	}

	return { session, user };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.delete(table.sessions).where(eq(table.sessions.id, sessionId));
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date): void {
	event.cookies.set(sessionCookieName, token, {
		expires: expiresAt,
		path: '/'
	});
}

export function deleteSessionTokenCookie(event: RequestEvent): void {
	event.cookies.delete(sessionCookieName, { path: '/' });
}

export async function getUserById(userId: string): Promise<table.User | null> {
	const [user] = await db.select().from(table.users).where(eq(table.users.id, userId));
	return user ?? null;
}

export async function getUserByUsername(username: string): Promise<table.User | null> {
	const [user] = await db.select().from(table.users).where(eq(table.users.username, username));
	return user ?? null;
}

export async function upgradeToRegistered(userId: string, username: string, passwordHash: string): Promise<void> {
	await db.update(table.users).set({ username, passwordHash }).where(eq(table.users.id, userId));
}

export async function updateSessionExpiry(sessionId: string, expiresAt: Date): Promise<void> {
	await db.update(table.sessions).set({ expiresAt }).where(eq(table.sessions.id, sessionId));
}

export async function getOrCreateUser(userId: string): Promise<table.User> {
	const existing = await getUserById(userId);
	if (existing) return existing;
	const [user] = await db.insert(table.users).values({ id: userId }).returning();
	return user;
}
