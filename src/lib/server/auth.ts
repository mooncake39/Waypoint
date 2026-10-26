// Starts a portal session and sets the `sid` cookie. Shared by the login
// endpoint for both first logins and the browser's automatic re-logins.

import type { Cookies } from '@sveltejs/kit';
import { normalizeDistrictUrl } from './district';
import { login, LoginError } from './portal/login';
import { createSession } from './sessions';
import { accountKey, loginThrottle } from './throttle';

/**
 * Whether the session cookie gets the Secure flag. Defaults to whether the request
 * looked like HTTPS (the Node adapter assumes HTTPS unless told otherwise, which
 * suits a reverse proxy). SECURE_COOKIE=false is for plain HTTP on a trusted network,
 * where browsers would otherwise drop the cookie and logins would never stick.
 */
export const cookieSecure = (url: URL) =>
	process.env.SECURE_COOKIE ? process.env.SECURE_COOKIE !== 'false' : url.protocol === 'https:';

/** Used when the district field is left blank. */
export const DEFAULT_DISTRICT = process.env.DEFAULT_DISTRICT || 'xx-district-psv';

export type LoginFailure = {
	/** `credentials`: the portal rejected them; anything else may be temporary. */
	kind: 'invalid_district' | 'missing_fields' | 'rate_limited' | LoginError['kind'];
	error: string;
	/** For `rate_limited`: seconds until the account may try again. */
	retryAfterSeconds?: number;
};

export async function startSession(
	input: { district?: string; username?: string; password?: string },
	cookies: Cookies,
	secure: boolean
): Promise<LoginFailure | undefined> {
	const district = (input.district ?? '').trim();
	const base = normalizeDistrictUrl(district || DEFAULT_DISTRICT);
	if (!base)
		return {
			kind: 'invalid_district',
			error: `Enter a district like xx-district-psv or an https portal URL (received ${JSON.stringify(district)})`
		};
	if (!input.username || !input.password)
		return { kind: 'missing_fields', error: 'Enter your username and password' };

	// At most one attempt per account every 3 seconds; early ones never reach the portal.
	const waitMs = loginThrottle.take(accountKey(base, input.username));
	if (waitMs > 0)
		return {
			kind: 'rate_limited',
			error: 'Please wait a few seconds before trying again.',
			retryAfterSeconds: Math.ceil(waitMs / 1000)
		};

	let client;
	try {
		client = await login(base, input.username, input.password);
	} catch (e) {
		if (e instanceof LoginError) return { kind: e.kind, error: e.message };
		return { kind: 'unexpected', error: 'Login failed' };
	}

	cookies.set('sid', createSession(client), { path: '/', httpOnly: true, sameSite: 'lax', secure });
}
