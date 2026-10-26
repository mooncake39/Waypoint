// Spaces out login attempts per account: at most one every `intervalMs`. There is
// no failure count or lockout; a too-early attempt is simply told to wait.

export class AttemptThrottle {
	private last = new Map<string, number>();

	constructor(
		private intervalMs: number,
		private now: () => number = () => Date.now()
	) {}

	/** Records an attempt and returns 0, or returns how many ms to wait (nothing recorded). */
	take(key: string) {
		const now = this.now();
		const previous = this.last.get(key);
		if (previous !== undefined && now - previous < this.intervalMs)
			return this.intervalMs - (now - previous);
		this.last.set(key, now);
		return 0;
	}

	/** Drops entries old enough not to matter. */
	sweep() {
		const now = this.now();
		for (const [key, at] of this.last) if (now - at >= this.intervalMs) this.last.delete(key);
	}

	get size() {
		return this.last.size;
	}
}

/** One login attempt per account every 3 seconds. */
export const loginThrottle = new AttemptThrottle(3000);

setInterval(() => loginThrottle.sweep(), 60_000).unref();

/** Same account regardless of capitals or surrounding spaces in the username. */
export const accountKey = (portalBase: string, username: string) =>
	`${portalBase}|${username.trim().toLowerCase()}`;
