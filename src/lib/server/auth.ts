import type { RequestEvent } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
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

export interface UserMetadata {
	ip?: string;
	userAgent?: string;
	referrer?: string;
	acceptLanguage?: string;
	platform?: string;
	isMobile?: boolean;
	country?: string;
	utmSource?: string;
	utmMedium?: string;
	utmCampaign?: string;
	landingPage?: string;
}

export async function createAnonymousUser(metadata?: UserMetadata): Promise<table.User> {
	const [user] = await db
		.insert(table.users)
		.values({
			ip: metadata?.ip,
			userAgent: metadata?.userAgent,
			referrer: metadata?.referrer,
			acceptLanguage: metadata?.acceptLanguage,
			platform: metadata?.platform,
			isMobile: metadata?.isMobile,
			country: metadata?.country,
			utmSource: metadata?.utmSource,
			utmMedium: metadata?.utmMedium,
			utmCampaign: metadata?.utmCampaign,
			landingPage: metadata?.landingPage,
			lastSeenAt: new Date()
		})
		.returning();
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

export async function createAnonymousUserWithSession(
	metadata?: UserMetadata
): Promise<{ user: table.User; session: table.Session; token: string }> {
	const user = await createAnonymousUser(metadata);
	const token = generateSessionToken();
	const session = await createSession(token, user.id, true);
	return { user, session, token };
}

export async function updateUserActivity(userId: string): Promise<void> {
	await db
		.update(table.users)
		.set({
			lastSeenAt: new Date(),
			visitCount: sql`${table.users.visitCount} + 1`
		})
		.where(eq(table.users.id, userId));
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
	if (user.isRegistered) {
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

export async function updateSessionExpiry(sessionId: string, expiresAt: Date): Promise<void> {
	await db.update(table.sessions).set({ expiresAt }).where(eq(table.sessions.id, sessionId));
}

export async function getOrCreateUser(userId: string): Promise<table.User> {
	const existing = await getUserById(userId);
	if (existing) return existing;
	const [user] = await db.insert(table.users).values({ id: userId }).returning();
	return user;
}

/** Extract user metadata from a request event for tracking/analytics */
export function extractMetadata(event: RequestEvent): UserMetadata {
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

/**
 * Ensure a user exists for the current request. If no user session exists,
 * creates an anonymous user with session and sets the cookie.
 * Call this in commands that require a user identity.
 *
 * Synchronized: if multiple commands call this in parallel, only one user is created.
 */
export async function ensureUser(event: RequestEvent): Promise<{ user: table.User; session: table.Session | null }> {
	// Already have a user from hooks (valid session existed)

	// Note: Session is null for the dev user
	if (event.locals.user) {
		return { user: event.locals.user, session: event.locals.session };
	}

	// If creation is already in progress, wait for it
	if (event.locals.pendingUserCreation) {
		return event.locals.pendingUserCreation;
	}

	// Start user creation and store the promise
	const creationPromise = (async () => {
		const metadata = extractMetadata(event);
		const { user, session, token } = await createAnonymousUserWithSession(metadata);
		setSessionTokenCookie(event, token, session.expiresAt);

		// Update locals so subsequent calls in same request see the user
		event.locals.user = user;
		event.locals.session = session;

		return { user, session };
	})();

	event.locals.pendingUserCreation = creationPromise;
	return creationPromise;
}
