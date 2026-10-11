import { getSession } from '#lib/server/sessions.ts';
import type { Handle } from '@sveltejs/kit/hooks';

export const handle: Handle = async ({ event, resolve }) => {
	const sid = event.cookies.get('sid');
	const session = getSession(sid);
	if (session) {
		event.locals.sid = sid;
		event.locals.session = session;
	}
	return resolve(event);
};
