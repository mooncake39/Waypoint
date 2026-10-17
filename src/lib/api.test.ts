import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchGradebook, SessionExpiredError } from './api';
import { loadCredentials, saveCredentials } from './credentials';

function memoryStorage() {
	const map = new Map<string, string>();
	return {
		getItem: (k: string) => map.get(k) ?? null,
		setItem: (k: string, v: string) => void map.set(k, v),
		removeItem: (k: string) => void map.delete(k)
	};
}

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const gradebook = { ReportingPeriod: { _Index: '0' } };

/** Fake server: /api/gradebook answers 401 until /api/login succeeds. */
function fakeServer({ acceptLogin = true }: { acceptLogin?: boolean } = {}) {
	let loggedIn = false;
	const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
		if (url === '/api/login') {
			if (!acceptLogin) return json({ kind: 'credentials', error: 'Incorrect username or password' }, 401);
			loggedIn = true;
			return json({ ok: true });
		}
		if (url.startsWith('/api/gradebook')) return loggedIn ? json(gradebook) : json({ error: 'session_expired' }, 401);
		throw new Error(`unexpected ${init?.method ?? 'GET'} ${url}`);
	});
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

const logins = (fetchMock: ReturnType<typeof fakeServer>) =>
	fetchMock.mock.calls.filter(([url]) => url === '/api/login');

beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));
afterEach(() => vi.unstubAllGlobals());

describe('fetchGradebook', () => {
	test('logs in again with the stored credentials when the session expired, then retries', async () => {
		saveCredentials({ district: 'xx-district-psv', username: 'u', password: 'p' });
		const fetchMock = fakeServer();

		await expect(fetchGradebook(2)).resolves.toEqual(gradebook);
		expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
			'/api/gradebook?period=2',
			'/api/login',
			'/api/gradebook?period=2'
		]);
		expect(JSON.parse(String(logins(fetchMock)[0][1]?.body))).toEqual({
			district: 'xx-district-psv',
			username: 'u',
			password: 'p'
		});
	});

	test('concurrent requests share one re-login', async () => {
		saveCredentials({ district: '', username: 'u', password: 'p' });
		const fetchMock = fakeServer();

		await Promise.all([fetchGradebook(), fetchGradebook(1), fetchGradebook(2)]);
		expect(logins(fetchMock)).toHaveLength(1);
	});

	test('without a stored password the user has to log in', async () => {
		saveCredentials({ district: '', username: 'u' });
		const fetchMock = fakeServer();

		await expect(fetchGradebook()).rejects.toBeInstanceOf(SessionExpiredError);
		expect(logins(fetchMock)).toHaveLength(0);
	});

	test('a rejected stored password is forgotten, keeping district and username', async () => {
		saveCredentials({ district: 'd', username: 'u', password: 'old' });
		fakeServer({ acceptLogin: false });

		await expect(fetchGradebook()).rejects.toBeInstanceOf(SessionExpiredError);
		expect(loadCredentials()).toEqual({ district: 'd', username: 'u' });
	});

	test('a network failure during re-login keeps the stored password', async () => {
		saveCredentials({ district: 'd', username: 'u', password: 'p' });
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				if (url === '/api/login') throw new TypeError('network down');
				return json({ error: 'session_expired' }, 401);
			})
		);

		await expect(fetchGradebook()).rejects.not.toBeInstanceOf(SessionExpiredError);
		expect(loadCredentials()?.password).toBe('p');
	});
});
