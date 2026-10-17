// The gradebook for the period being viewed.
// Adapted from GradeCompass (MIT, see LICENSE-gradecompass.txt); records are
// already parsed JSON, so there is no XML parsing or memoization any more.

import { gradebookState } from './catalog.svelte';

export function getActiveGradebook() {
	const catalog = gradebookState.gradebookCatalog;
	if (!catalog) return;
	return catalog.recordCache[catalog.overrideIndex ?? catalog.defaultIndex]?.gradebook;
}
