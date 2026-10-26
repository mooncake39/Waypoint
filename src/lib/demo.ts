// Demo mode: the app shows made-up grades from /api/demo/gradebook, with no
// login and no district portal. The flag lives in this browser only.

import { clearGradebookCatalogFromLocalStorage } from './grades/catalog';
import { resetGradebookState } from './grades/catalog.svelte';
import { LocalStorageKey, readJson, remove, writeJson } from './storage';

export const isDemo = () => readJson<boolean>(LocalStorageKey.demo) === true;

/** Starts the demo with an empty cache, so no real grades are mixed in. */
export function startDemo() {
	clearGradebookCatalogFromLocalStorage();
	resetGradebookState();
	writeJson(LocalStorageKey.demo, true);
}

/** Leaves the demo and drops its made-up grades. */
export function exitDemo() {
	remove(LocalStorageKey.demo);
	clearGradebookCatalogFromLocalStorage();
	resetGradebookState();
}
