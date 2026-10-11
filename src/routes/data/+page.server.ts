import { PortalError } from '#lib/server/portal/http.ts';
import { deleteSession, refresh } from '#lib/server/sessions.ts';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, url, cookies }) => {
	if (!locals.session || !locals.sid) redirect(303, '/login');

	const period = url.searchParams.get('period');
	try {
		return { gradebook: await refresh(locals.session, period === null ? undefined : Number(period)) };
	} catch (e) {
		// Any portal failure means "Session expired" (handoff §4).
		console.log(e instanceof PortalError ? e.message : e);
		deleteSession(locals.sid);
		cookies.delete('sid', { path: '/' });
		redirect(303, '/login?expired=1');
	}
};
