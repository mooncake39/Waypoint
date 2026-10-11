import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter(),
			// Public URL of this instance, read at build time. Production form posts
			// are rejected as cross-site if it doesn't match the browser's origin.
			paths: { origin: process.env.ORIGIN || undefined }
		})
	],
	test: { include: ['src/**/*.test.ts'] }
});
