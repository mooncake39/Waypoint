// In-memory sessions keyed by a random `sid` cookie. The password is never stored.

import { randomBytes } from 'node:crypto';
import { fetchGradebook, type RawGradebook } from './portal/gradebook';
import type { PortalClient } from './portal/http';

export interface Session {
	client: PortalClient;
	lastUsed: number;
	/** Running refresh, shared by concurrent callers (one focus per session). */
	inflight?: Promise<RawGradebook>;
	cache?: RawGradebook;
}

const TTL_MS = Number(process.env.SESSION_TTL_MINUTES ?? 30) * 60_000;
const CACHE_MS = 30_000;

const sessions = new Map<string, Session>();

setInterval(() => {
	const now = Date.now();
	for (const [sid, s] of sessions) if (now - s.lastUsed > TTL_MS) sessions.delete(sid);
}, 60_000).unref();

export function createSession(client: PortalClient) {
	const sid = randomBytes(32).toString('base64url');
	sessions.set(sid, { client, lastUsed: Date.now() });
	return sid;
}

export function getSession(sid: string | undefined) {
	const session = sid ? sessions.get(sid) : undefined;
	if (session) session.lastUsed = Date.now();
	return session;
}

export const deleteSession = (sid: string) => sessions.delete(sid);

export async function refresh(session: Session, periodIndex?: number) {
	const { cache } = session;
	if (
		cache &&
		Date.now() - cache.fetchedAt < CACHE_MS &&
		(periodIndex === undefined || periodIndex === cache.periodIndex)
	)
		return cache;

	// Wait for any running refresh first so two never overlap on one session.
	while (session.inflight) {
		const running = await session.inflight.catch(() => undefined);
		if (running && (periodIndex === undefined || periodIndex === running.periodIndex)) return running;
	}

	session.inflight = fetchGradebook(session.client, periodIndex);
	try {
		return (session.cache = await session.inflight);
	} finally {
		session.inflight = undefined;
	}
}
