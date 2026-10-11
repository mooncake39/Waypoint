// Minimal per-session HTTP client for one district portal: a cookie jar,
// common headers, a timeout, and failure classification (handoff §4).

export type PortalErrorReason =
	| 'http'
	| 'redirect'
	| 'non_json'
	| 'asmx_error'
	| 'no_focus_key'
	| 'empty'
	| 'timeout';

export class PortalError extends Error {
	constructor(
		public step: string,
		public reason: PortalErrorReason,
		public status?: number
	) {
		super(`${step} failed: ${reason}${status ? ` (HTTP ${status})` : ''}`);
	}
}

const USER_AGENT =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';

const TIMEOUT_MS = Number(process.env.PORTAL_TIMEOUT_MS ?? 20000);

export class PortalClient {
	/** Cookie name → value. One portal host per client, so path/domain scoping is ignored. */
	private cookies = new Map<string, string>();

	constructor(public base: string) {}

	private storeCookies(res: Response) {
		for (const header of res.headers.getSetCookie()) {
			const [pair] = header.split(';');
			const eq = pair.indexOf('=');
			if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
		}
	}

	private cookieHeader() {
		return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
	}

	/** Never follows redirects, so callers can see a 302. */
	async request(step: string, path: string, init: RequestInit = {}): Promise<Response> {
		const headers = new Headers(init.headers);
		headers.set('User-Agent', USER_AGENT);
		headers.set('Accept-Language', 'en-US,en;q=0.9');
		if (this.cookies.size) headers.set('Cookie', this.cookieHeader());

		const started = Date.now();
		let res: Response;
		try {
			res = await fetch(this.base + path, {
				...init,
				headers,
				redirect: 'manual',
				signal: AbortSignal.timeout(TIMEOUT_MS)
			});
		} catch {
			console.log(`${step} timeout/network ${Date.now() - started}ms`);
			throw new PortalError(step, 'timeout');
		}
		console.log(`${step} ${res.status} ${Date.now() - started}ms`);
		this.storeCookies(res);
		return res;
	}

	/** GET an HTML page; any non-200 is a failure. */
	async getHtml(step: string, path: string) {
		const res = await this.request(step, path);
		if (res.status >= 300 && res.status < 400) throw new PortalError(step, 'redirect', res.status);
		if (res.status !== 200) throw new PortalError(step, 'http', res.status);
		return res.text();
	}

	/** POST JSON and parse a JSON response. */
	async postJson<T>(step: string, path: string, body: unknown, headers: Record<string, string>) {
		const res = await this.request(step, path, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json; charset=UTF-8',
				Accept: 'application/json, text/javascript, */*; q=0.01',
				'X-Requested-With': 'XMLHttpRequest',
				Origin: this.base,
				...headers
			},
			body: JSON.stringify(body)
		});
		if (res.status >= 300 && res.status < 400) throw new PortalError(step, 'redirect', res.status);
		if (res.status !== 200) throw new PortalError(step, 'http', res.status);
		const text = await res.text();
		try {
			return JSON.parse(text) as T;
		} catch {
			throw new PortalError(step, 'non_json', res.status);
		}
	}
}
