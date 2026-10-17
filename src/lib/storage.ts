// localStorage access that never throws (private windows, blocked storage).

export const LocalStorageKey = {
	credentials: 'credentials',
	/** Versioned: the old GradeCompass cache held XML. */
	gradebook: 'gradebook-json-1'
} as const;

export function readJson<T>(key: string): T | undefined {
	try {
		const value = localStorage.getItem(key);
		return value === null ? undefined : (JSON.parse(value) as T);
	} catch {
		try {
			localStorage.removeItem(key);
		} catch {
			// storage unavailable
		}
		return undefined;
	}
}

export function writeJson(key: string, value: unknown) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (e) {
		console.error(`Couldn't save ${key}`, e);
	}
}

export function remove(key: string) {
	try {
		localStorage.removeItem(key);
	} catch {
		// storage unavailable
	}
}
