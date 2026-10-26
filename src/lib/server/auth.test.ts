import type { Cookies } from '@sveltejs/kit';
import { beforeEach, expect, test, vi } from 'vitest';

const login = vi.fn(async () => ({}));
vi.mock('./portal/login', () => ({
	login,
	LoginError: class LoginError extends Error {}
}));
vi.mock('./sessions', () => ({ createSession: () => 'sid' }));

const { startSession } = await import('./auth');

const cookies = { set: vi.fn() } as unknown as Cookies;
const attempt = (username: string) =>
	startSession({ district: 'xx-district-psv', username, password: 'pw' }, cookies, true);

beforeEach(() => {
	login.mockClear();
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date('2026-10-26T12:00:00'));
});

test('a second attempt on the same account within 3 s never reaches the portal', async () => {
	await expect(attempt('throttle-a')).resolves.toBeUndefined();
	vi.setSystemTime(Date.now() + 1200);

	await expect(attempt('Throttle-A')).resolves.toMatchObject({ kind: 'rate_limited', retryAfterSeconds: 2 });
	expect(login).toHaveBeenCalledTimes(1);

	vi.setSystemTime(Date.now() + 1800);
	await expect(attempt('throttle-a')).resolves.toBeUndefined();
	expect(login).toHaveBeenCalledTimes(2);
});

test('a blank district is rejected when no DEFAULT_DISTRICT is set', async () => {
	await expect(
		startSession({ district: ' ', username: 'blank-district', password: 'pw' }, cookies, true)
	).resolves.toMatchObject({ kind: 'invalid_district', error: 'Enter your district' });
	expect(login).not.toHaveBeenCalled();
});

test('other accounts are not affected', async () => {
	await attempt('throttle-b');
	await expect(attempt('throttle-c')).resolves.toBeUndefined();
	expect(login).toHaveBeenCalledTimes(2);
});
