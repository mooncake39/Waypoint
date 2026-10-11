// Handoff §5: GET the login form, detect fields, POST it, expect a 302.

import { parseLoginForm } from './extract';
import { PortalClient, PortalError } from './http';

const LOGIN_PATH = '/PXP2_Login_Student.aspx?regenerateSessionId=True';

export class LoginError extends Error {
	constructor(public kind: 'credentials' | 'network' | 'unexpected') {
		super(
			kind === 'credentials'
				? 'Incorrect username or password'
				: kind === 'network'
					? "Couldn't reach the district portal"
					: 'Login failed'
		);
	}
}

export async function login(base: string, username: string, password: string) {
	const client = new PortalClient(base);

	let html: string;
	try {
		html = await client.getHtml('LoginPage', LOGIN_PATH);
	} catch (e) {
		throw new LoginError(e instanceof PortalError && e.reason === 'timeout' ? 'network' : 'unexpected');
	}

	let form;
	try {
		form = parseLoginForm(html);
	} catch {
		throw new LoginError('unexpected');
	}

	const body = new URLSearchParams(form.fields);
	body.set(form.usernameField, username);
	body.set(form.passwordField, password);

	let res: Response;
	try {
		res = await client.request('Login', LOGIN_PATH, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Origin: base,
				Referer: base + LOGIN_PATH
			},
			body
		});
	} catch {
		throw new LoginError('network');
	}

	// Success is a redirect away from the login page (e.g. to Home_PXP2.aspx).
	// If the session turns out to be bad, the first gradebook fetch catches it.
	const location = res.headers.get('location') ?? '';
	const locationPath = location.split('?')[0];
	if (res.status >= 300 && res.status < 400 && locationPath && !/Login/i.test(locationPath))
		return client;
	if (res.status === 200) throw new LoginError('credentials');
	console.log(`Login unexpected response: ${res.status} location=${locationPath || '(none)'}`);
	throw new LoginError('unexpected');
}
