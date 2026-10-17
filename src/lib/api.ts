// Browser-side calls to this app's server. When the server session has expired
// (restart, idle timeout, portal session ended), it logs in again with the
// stored credentials and retries once, so the user only sees the login page if
// the portal rejects the stored password.

import { forgetPassword, loadCredentials, type Credentials } from './credentials';
import type { Gradebook } from './types/Gradebook';

/** The user has to log in again: no stored password, or the portal rejected it. */
export class SessionExpiredError extends Error {
	constructor(message = 'Session expired') {
		super(message);
	}
}

/** A login attempt failed; `kind` is 'credentials' when the portal rejected them. */
export class LoginFailedError extends Error {
	constructor(
		public kind: string,
		message: string
	) {
		super(message);
	}
}

export async function login(credentials: Credentials) {
	let res: Response;
	try {
		res = await fetch('/api/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(credentials)
		});
	} catch {
		throw new LoginFailedError('network', "Couldn't reach the server");
	}
	if (res.ok) return;
	const body = (await res.json().catch(() => ({}))) as { kind?: string; error?: string };
	throw new LoginFailedError(body.kind ?? 'unexpected', body.error ?? 'Login failed');
}

let relogin: Promise<void> | undefined;

/** One re-login at a time, shared by every request that hit a 401. */
function reloginWithStoredCredentials() {
	relogin ??= (async () => {
		const credentials = loadCredentials();
		if (!credentials?.password) throw new SessionExpiredError();
		try {
			await login(credentials);
		} catch (e) {
			if (e instanceof LoginFailedError && e.kind === 'credentials') {
				forgetPassword();
				throw new SessionExpiredError('Your saved password was rejected; log in again');
			}
			throw e; // network trouble etc.: keep the password and let the caller retry later
		}
	})().finally(() => (relogin = undefined));
	return relogin;
}

/** GET with one automatic re-login on 401. */
async function getWithRelogin(url: string) {
	let res = await fetch(url);
	if (res.status === 401) {
		await reloginWithStoredCredentials();
		res = await fetch(url);
		if (res.status === 401) throw new SessionExpiredError();
	}
	if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
	return res;
}

/**
 * The gradebook for a grading period index, or the current period when omitted.
 * `fetchedAt` is when the server got it from the portal (it may serve a cached copy).
 */
export async function fetchGradebook(period?: number, onReceivingData?: () => void) {
	const res = await getWithRelogin(
		period === undefined ? '/api/gradebook' : `/api/gradebook?period=${period}`
	);
	onReceivingData?.();
	const gradebook = (await res.json()) as Gradebook;
	const fetchedAt = Number(res.headers.get('X-Fetched-At')) || Date.now();
	return { gradebook, fetchedAt };
}

export async function logout() {
	await fetch('/logout', { method: 'POST' }).catch(() => undefined);
}
