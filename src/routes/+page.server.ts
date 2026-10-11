import { redirect } from '@sveltejs/kit';

export const load = ({ locals }) => redirect(303, locals.session ? '/data' : '/login');
