import { demoRawGradebook } from '#lib/server/demo.ts';
import { toGradebook } from '#lib/server/portal/map.ts';
import { json } from '@sveltejs/kit';

/** GET ?period=<index> → the made-up demo gradebook. No login or portal involved. */
export const GET = ({ url }) => {
	const param = url.searchParams.get('period');
	const period = param !== null && /^\d+$/.test(param) ? Number(param) : undefined;
	const raw = demoRawGradebook(period);
	return json(toGradebook(raw), {
		headers: { 'Cache-Control': 'no-store', 'X-Fetched-At': String(raw.fetchedAt) }
	});
};
