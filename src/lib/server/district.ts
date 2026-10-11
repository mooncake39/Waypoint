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
	let url: URL;
	try {
		url = new URL(/^\w+:\/\//.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
	} catch {
		return undefined;
	}
	const host = url.hostname.toLowerCase();
	if (url.protocol !== 'https:' || isPrivateHost(host)) return undefined;
	if (allowed.length && !allowed.includes(host)) return undefined;
	return `https://${url.host}`;
}
