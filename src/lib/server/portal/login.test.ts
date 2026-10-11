import { afterEach, describe, expect, test, vi } from 'vitest';
import { login, LoginError } from './login';

const FORM = `<form>
<input type="hidden" name="__VIEWSTATE" value="vs" />
<input name="ctl00$MainContent$username" type="text" />
<input name="ctl00$MainContent$password" type="password" />
<input name="ctl00$MainContent$Submit1" type="submit" value="Login" />
</form>`;

/** Fake portal: the GET returns the login form, the POST returns `post`. */
function mockPortal(post: Response) {
	const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
		init?.method === 'POST' ? post : new Response(FORM, { status: 200 })
	);
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

const redirect = (location: string) => new Response(null, { status: 302, headers: { location } });

afterEach(() => vi.unstubAllGlobals());

describe('login', () => {
	test('succeeds on a redirect to Home_PXP2.aspx', async () => {
		const fetchMock = mockPortal(redirect('Home_PXP2.aspx'));
		await expect(login('https://d.edupoint.com', 'user', 'pass')).resolves.toBeDefined();

		const body = new URLSearchParams(String(fetchMock.mock.calls[1][1]?.body));
		expect(body.get('__VIEWSTATE')).toBe('vs');
		expect(body.get('ctl00$MainContent$username')).toBe('user');
		expect(body.get('ctl00$MainContent$password')).toBe('pass');
	});

	test('succeeds on a redirect to a PXP2_ page', async () => {
		mockPortal(redirect('/PXP2_Gradebook.aspx?AGU=0'));
		await expect(login('https://d.edupoint.com', 'u', 'p')).resolves.toBeDefined();
	});

	test('reports wrong credentials when the login page comes back', async () => {
		mockPortal(new Response(FORM, { status: 200 }));
		await expect(login('https://d.edupoint.com', 'u', 'p')).rejects.toMatchObject({ kind: 'credentials' });
	});

	test('treats a redirect back to the login page as unexpected', async () => {
		mockPortal(redirect('PXP2_Login_Student.aspx?error=1'));
		await expect(login('https://d.edupoint.com', 'u', 'p')).rejects.toBeInstanceOf(LoginError);
	});
});
