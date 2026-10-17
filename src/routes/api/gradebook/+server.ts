import { PortalError } from '#lib/server/portal/http.ts';
import { deleteSession, refreshGradebook } from '#lib/server/sessions.ts';
import { json } from '@sveltejs/kit';

/** Grades must not be stored by the browser's HTTP cache or any proxy. */
const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * GET ?period=<index> → the GradeCompass `Gradebook` JSON for that grading
 * period (the current one when omitted), or 401 when there is no live session.
 * `X-Fetched-At` is when the portal data was fetched (ms since epoch); it can be
 * up to 30 s old when served from the session cache.
 * Any portal failure ends the session (handoff §15.3); the browser then logs in again.
 */
export const GET = async ({ locals, url, cookies }) => {
	if (!locals.session || !locals.sid)
		return json({ error: 'session_expired' }, { status: 401, headers: NO_STORE });

	const param = url.searchParams.get('period');
	const period = param !== null && /^\d+$/.test(param) ? Number(param) : undefined;

	try {
		const { gradebook, fetchedAt } = await refreshGradebook(locals.session, period);
		return json(gradebook, { headers: { ...NO_STORE, 'X-Fetched-At': String(fetchedAt) } });
	} catch (e) {
		console.log(e instanceof PortalError ? e.message : e);
		deleteSession(locals.sid);
		cookies.delete('sid', { path: '/' });
		return json({ error: 'session_expired' }, { status: 401, headers: NO_STORE });
	}
};
