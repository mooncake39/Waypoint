/** Health check for Docker and load balancers: 200 "ok" while the server is up. */
export const GET = () =>
	new Response('ok', { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });
