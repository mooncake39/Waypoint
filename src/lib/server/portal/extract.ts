// Small parsers for portal HTML (handoff §5, §6, §7). No HTML library.

const ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	'#39': "'",
	'#34': '"'
};

export function htmlUnescape(s: string) {
	return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
		if (e[0] === '#') {
			const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1));
			return Number.isNaN(code) ? m : String.fromCodePoint(code);
		}
		return ENTITIES[e.toLowerCase()] ?? m;
	});
}

/** Attributes of a single start tag, e.g. `<input type="hidden" name="x" value="y">`. */
function parseAttributes(tag: string) {
	const attrs: Record<string, string> = {};
	const re = /([^\s=/<>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
	const body = tag.replace(/^<\w+/, '').replace(/\/?>$/, '');
	let m;
	while ((m = re.exec(body))) {
		attrs[m[1].toLowerCase()] = htmlUnescape(m[2] ?? m[3] ?? m[4] ?? '');
	}
	return attrs;
}

export interface LoginForm {
	fields: [string, string][];
	usernameField: string;
	passwordField: string;
}

/** Detects hidden fields, the username/password inputs and the first submit control. */
export function parseLoginForm(html: string): LoginForm {
	const fields: [string, string][] = [];
	let usernameField: string | undefined;
	let passwordField: string | undefined;
	let submitAdded = false;

	for (const [tag, kind] of html.matchAll(/<(input|button)\b[^>]*>/gi)) {
		const a = parseAttributes(tag);
		if (!a.name) continue;
		const type = (a.type ?? (kind.toLowerCase() === 'button' ? 'submit' : 'text')).toLowerCase();

		if (type === 'hidden') fields.push([a.name, a.value ?? '']);
		else if ((type === 'text' || type === 'email') && !usernameField) usernameField = a.name;
		else if (type === 'password' && !passwordField) passwordField = a.name;
		else if (type === 'submit' && !submitAdded) {
			fields.push([a.name, a.value ?? '']);
			submitAdded = true;
		}
	}

	if (!usernameField || !passwordField) throw new Error('Login form fields not found');
	return { fields, usernameField, passwordField };
}

/**
 * Finds `<name> = {...}` in page script and returns the parsed object, using
 * brace matching that respects string literals. Returns undefined if absent.
 */
export function extractJsObject<T = unknown>(html: string, name: string): T | undefined {
	const at = html.indexOf(`${name} =`);
	if (at < 0) return undefined;
	const start = html.indexOf('{', at);
	if (start < 0) return undefined;

	let depth = 0;
	let quote: string | null = null;
	for (let i = start; i < html.length; i++) {
		const c = html[i];
		if (quote) {
			if (c === '\\') i++;
			else if (c === quote) quote = null;
		} else if (c === '"' || c === "'") quote = c;
		else if (c === '{') depth++;
		else if (c === '}' && --depth === 0) return JSON.parse(html.slice(start, i + 1)) as T;
	}
	return undefined;
}
