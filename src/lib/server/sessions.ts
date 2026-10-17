// In-memory sessions keyed by a random `sid` cookie. The password is never stored.

import { randomBytes } from 'node:crypto';
import type { Gradebook } from '../types/Gradebook';
import { fetchGradebook, type RawGradebook } from './portal/gradebook';
import type { PortalClient } from './portal/http';
import { toGradebook } from './portal/map';

/** One fetched grading period; the converted form is built on first use and kept. */
export interface CacheEntry {
	raw: RawGradebook;
	gradebook?: Gradebook;
}

export interface Session {
	client: PortalClient;
	lastUsed: number;
	/** Running refresh, shared by concurrent callers (one focus per session). */
	inflight?: Promise<CacheEntry>;
	/** Recent results by grading-period index, so switching periods back and forth stays cheap. */
	cache: Map<number, CacheEntry>;
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
	sessions.set(sid, { client, lastUsed: Date.now(), cache: new Map() });
	return sid;
}

export function getSession(sid: string | undefined) {
	const session = sid ? sessions.get(sid) : undefined;
	if (session) session.lastUsed = Date.now();
	return session;
}

export const deleteSession = (sid: string) => sessions.delete(sid);

/** Whether a result answers a request; no period means the current (default-focus) one. */
const answers = (result: RawGradebook, periodIndex: number | undefined) =>
	periodIndex === undefined
		? result.periods[result.periodIndex]?.defaultFocus === true
		: result.periodIndex === periodIndex;

function freshEntry(session: Session, periodIndex: number | undefined) {
	for (const entry of session.cache.values())
		if (Date.now() - entry.raw.fetchedAt < CACHE_MS && answers(entry.raw, periodIndex)) return entry;
}

/** The raw refresh for a grading period: from the 30 s cache, a running refresh, or the portal. */
export async function refresh(session: Session, periodIndex?: number): Promise<CacheEntry> {
	const cached = freshEntry(session, periodIndex);
	if (cached) return cached;

	// Wait for any running refresh first so two never overlap on one session.
	while (session.inflight) {
		const running = await session.inflight.catch(() => undefined);
		if (running && answers(running.raw, periodIndex)) return running;
	}

	session.inflight = fetchGradebook(session.client, periodIndex).then((raw) => {
		const entry: CacheEntry = { raw };
		session.cache.set(raw.periodIndex, entry);
		return entry;
	});
	try {
		return await session.inflight;
	} finally {
		session.inflight = undefined;
	}
}

/** The GradeCompass-shaped gradebook for a period, plus when the portal data was fetched. */
export async function refreshGradebook(session: Session, periodIndex?: number) {
	const entry = await refresh(session, periodIndex);
	entry.gradebook ??= toGradebook(entry.raw);
	return { gradebook: entry.gradebook, fetchedAt: entry.raw.fetchedAt };
}
