// Normalizes the user-supplied district portal URL to `https://host` and
// rejects hosts that would let the server be pointed at internal addresses.

import { isIP } from 'node:net';

const allowed = (process.env.ALLOWED_DISTRICT_HOSTS ?? '')
	.split(',')
	.map((h) => h.trim().toLowerCase())
	.filter(Boolean);

function isPrivateHost(host: string) {
	if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
	const bare = host.replace(/^\[|\]$/g, '');
	if (isIP(bare) === 4)
		return /^(0|10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168)\./.test(bare + '.');
	if (isIP(bare) === 6) return true; // no legitimate district uses a bare IPv6 address
	return false;
}

export function normalizeDistrictUrl(input: string) {
	// Pasted links can carry spaces or invisible characters (zero-width, BOM, NBSP).
	let cleaned = input.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '').trim();
	// A bare district code like "xx-district-psv" means `<code>.edupoint.com`.
	if (/^[a-z0-9-]+$/i.test(cleaned)) cleaned += '.edupoint.com';
	let url: URL;
	try {
		url = new URL(/^\w+:\/\//.test(cleaned) ? cleaned : `https://${cleaned}`);
	} catch {
		return undefined;
	}
	const host = url.hostname.toLowerCase();
	if (url.protocol !== 'https:' || !host.includes('.') || isPrivateHost(host)) return undefined;
	if (allowed.length && !allowed.includes(host)) return undefined;
	return `https://${url.host}`;
}
