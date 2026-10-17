import { PortalError } from '#lib/server/portal/http.ts';
import { toGradebook } from '#lib/server/portal/map.ts';
import { deleteSession, refresh } from '#lib/server/sessions.ts';
import { json } from '@sveltejs/kit';

/**
 * GET ?period=<index> → the GradeCompass `Gradebook` JSON for that grading
 * period (the current one when omitted), or 401 when there is no live session.
 * Any portal failure ends the session (handoff §15.3); the browser then logs in again.
 */
export const GET = async ({ locals, url, cookies }) => {
	if (!locals.session || !locals.sid) return json({ error: 'session_expired' }, { status: 401 });

	const param = url.searchParams.get('period');
	const period = param !== null && /^\d+$/.test(param) ? Number(param) : undefined;

	try {
		return json(toGradebook(await refresh(locals.session, period)));
	} catch (e) {
		console.log(e instanceof PortalError ? e.message : e);
		deleteSession(locals.sid);
		cookies.delete('sid', { path: '/' });
		return json({ error: 'session_expired' }, { status: 401 });
	}
};
