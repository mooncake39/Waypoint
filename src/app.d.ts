import type { Session } from '#lib/server/sessions.ts';

declare global {
	namespace App {
		interface Locals {
			sid?: string;
			session?: Session;
		}
	}
}

export {};
