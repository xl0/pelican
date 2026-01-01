// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { User, Session } from '$lib/server/db/schema';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			session: Session | null;
			/** Pending user creation promise - prevents race conditions when multiple commands fire in parallel */
			pendingUserCreation?: Promise<{ user: User; session: Session }>;
		}
	}
}

export {};
