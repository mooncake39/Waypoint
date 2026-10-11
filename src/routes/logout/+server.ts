import { deleteSession } from '#lib/server/sessions.ts';
import { redirect } from '@sveltejs/kit';

export const POST = ({ locals, cookies }) => {
	if (locals.sid) deleteSession(locals.sid);
	cookies.delete('sid', { path: '/' });
	redirect(303, '/login');
};
