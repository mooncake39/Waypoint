import { normalizeDistrictUrl } from '#lib/server/district.ts';
import { login, LoginError } from '#lib/server/portal/login.ts';
import { createSession } from '#lib/server/sessions.ts';
import { fail, redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const district = String(form.get('district') ?? '');
		const username = String(form.get('username') ?? '');
		const password = String(form.get('password') ?? '');

		const base = normalizeDistrictUrl(district);
		if (!base)
			return fail(400, {
				district,
				username,
				error: `Enter a valid https district portal URL (received ${JSON.stringify(district)})`
			});
		if (!username || !password)
			return fail(400, { district, username, error: 'Enter your username and password' });

		let client;
		try {
			client = await login(base, username, password);
		} catch (e) {
			const message = e instanceof LoginError ? e.message : 'Login failed';
			return fail(400, { district, username, error: message });
		}

		cookies.set('sid', createSession(client), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:'
		});
		redirect(303, '/data');
	}
};
