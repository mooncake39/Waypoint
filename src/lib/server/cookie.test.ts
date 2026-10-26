import { afterEach, expect, test, vi } from 'vitest';
import { cookieSecure } from './auth';

afterEach(() => vi.unstubAllEnvs());

test('defaults to whether the request was HTTPS', () => {
	vi.stubEnv('SECURE_COOKIE', '');
	expect(cookieSecure(new URL('https://grades.example.com/api/login'))).toBe(true);
	expect(cookieSecure(new URL('http://localhost:5173/api/login'))).toBe(false);
});

test('SECURE_COOKIE overrides it', () => {
	vi.stubEnv('SECURE_COOKIE', 'false');
	expect(cookieSecure(new URL('https://grades.example.com/api/login'))).toBe(false);
	vi.stubEnv('SECURE_COOKIE', 'true');
	expect(cookieSecure(new URL('http://192.168.1.20:3000/api/login'))).toBe(true);
});
