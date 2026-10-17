import { startSession } from '#lib/server/auth.ts';
import { json } from '@sveltejs/kit';

/** POST {district, username, password} → 200 {ok: true} | 400/401 {kind, error}. */
export const POST = async ({ request, cookies, url }) => {
	let body: { district?: string; username?: string; password?: string };
	try {
		body = await request.json();
	} catch {
		return json({ kind: 'missing_fields', error: 'Expected a JSON body' }, { status: 400 });
	}

	const failure = await startSession(body, cookies, url.protocol === 'https:');
	if (failure) return json(failure, { status: failure.kind === 'credentials' ? 401 : 400 });
	return json({ ok: true });
};
