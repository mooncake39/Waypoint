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

	const location = res.headers.get('location') ?? '';
	if (res.status === 302 && /PXP2_/i.test(location) && !/Login/i.test(location)) return client;
	if (res.status === 200) throw new LoginError('credentials');
	throw new LoginError('unexpected');
}
