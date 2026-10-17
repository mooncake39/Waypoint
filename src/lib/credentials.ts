// Login details kept in this browser so an expired server session can be
// replaced without asking again. The password is stored in plain text, like
// the original GradeCompass; logging out removes it.

import { LocalStorageKey, readJson, remove, writeJson } from './storage';

export interface Credentials {
	district: string;
	username: string;
	/** Absent after the portal rejected it or the user logged out. */
	password?: string;
}

export const loadCredentials = () => readJson<Credentials>(LocalStorageKey.credentials);

export const saveCredentials = (credentials: Credentials) =>
	writeJson(LocalStorageKey.credentials, credentials);

/** Keeps district and username for prefilling the login form. */
export function forgetPassword() {
	const credentials = loadCredentials();
	if (credentials)
		saveCredentials({ district: credentials.district, username: credentials.username });
}

export const clearCredentials = () => remove(LocalStorageKey.credentials);
