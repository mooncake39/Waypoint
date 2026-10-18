// Reactive gradebook state and grading-period switching.
// Adapted from GradeCompass (MIT, see LICENSE-gradecompass.txt). Changes: JSON
// records instead of XML, no seen-assignments tracking, and messages go to
// `gradebookState.notice` instead of toasts (no UI library yet).

import { SessionExpiredError } from '../api';
import {
	getGradebookCatalogFromLocalStorage,
	getGradebookRecord,
	getInitialGradebookCatalog,
	gradebookRefreshNeeded,
	saveGradebookCatalogToLocalStorage,
	type GradebookCatalog,
	type GradebookRecord
} from './catalog';

export const gradebookState = $state({}) as {
	gradebookCatalog?: GradebookCatalog;
	loadingError?: unknown;
	/** Set when the user must log in again; the page should send them to /login. */
	sessionExpired?: boolean;
	/** Informational message, e.g. the current grading period changed. */
	notice?: string;
};

export const getReportPeriodName = (index: number) =>
	gradebookState.gradebookCatalog?.canonicalReportPeriodEntries?.[index]?._GradePeriod ??
	`Report Period ${index}`;

const onReceivingData = () => {
	if (!gradebookState.gradebookCatalog) return;
	gradebookState.gradebookCatalog.receivingData = true;
};

function setReportPeriodIndex(index: number) {
	const catalog = gradebookState.gradebookCatalog;
	if (!catalog) throw new Error(`Cannot set report period index: gradebook catalog not initialized`);
	catalog.overrideIndex = index !== catalog.defaultIndex ? index : undefined;
}

/**
 * Files a fetched record under the period it is for. If the grades are unchanged, the
 * existing gradebook object is kept and only `lastRefresh` moves, so pages that rebuild
 * on data changes (e.g. hypothetical mode) aren't reset by a refresh.
 */
function storeRecord(
	catalog: GradebookCatalog,
	record: GradebookRecord,
	overrideIndex: number | undefined,
	requestedIndex: number
) {
	const { gradebook } = record;
	const receivedIndex = parseInt(gradebook.ReportingPeriod._Index);

	const existing = catalog.recordCache[receivedIndex];
	if (existing && JSON.stringify(existing.gradebook) === JSON.stringify(gradebook))
		existing.lastRefresh = record.lastRefresh;
	else catalog.recordCache[receivedIndex] = record;

	if (overrideIndex === undefined) {
		catalog.defaultIndex = receivedIndex;
		catalog.canonicalReportPeriodEntries = gradebook.ReportingPeriods.ReportPeriod;
	}

	if (receivedIndex !== requestedIndex) {
		gradebookState.notice =
			overrideIndex === undefined
				? `${gradebook.ReportingPeriod._GradePeriod} is now the current grading period`
				: `${getReportPeriodName(requestedIndex)} is not available`;
	} else {
		setReportPeriodIndex(requestedIndex);
	}
}

/** Shows `overrideIndex` (or the current period), fetching it if missing or stale. Throws. */
async function loadReportPeriod({
	overrideIndex,
	forceRefresh
}: {
	overrideIndex?: number;
	forceRefresh?: boolean;
}) {
	const catalog = gradebookState.gradebookCatalog;
	if (!catalog) throw new Error(`Cannot switch report periods: gradebook catalog not initialized`);

	const requestedIndex = overrideIndex ?? catalog.defaultIndex;
	catalog.loadingIndex = requestedIndex;

	try {
		const record = catalog.recordCache[requestedIndex];
		if (record) setReportPeriodIndex(requestedIndex);

		if (forceRefresh || !record || gradebookRefreshNeeded(record)) {
			catalog.receivingData = false;
			const gradebookRecord = await getGradebookRecord(onReceivingData, overrideIndex);
			storeRecord(catalog, gradebookRecord, overrideIndex, requestedIndex);
		} else {
			setReportPeriodIndex(requestedIndex);
		}
	} finally {
		catalog.loadingIndex = undefined;
		saveGradebookCatalogToLocalStorage(catalog);
	}
}

function recordError(error: unknown) {
	if (error instanceof SessionExpiredError) gradebookState.sessionExpired = true;
	else gradebookState.loadingError = error;
	console.error('Error loading grades:', error);
}

/** For the UI: switch period or refresh; errors land in `gradebookState`. */
export async function switchReportPeriod(options: { overrideIndex?: number; forceRefresh?: boolean } = {}) {
	gradebookState.loadingError = undefined;
	try {
		await loadReportPeriod(options);
	} catch (error) {
		recordError(error);
	}
}

let backgroundRefreshRunning = false;

/**
 * Refreshes the period being viewed without the loading banner (used by the 60 s
 * auto-refresh). Skips if a visible load is already running. A failed refresh
 * keeps the last data; only an expired login is surfaced.
 */
export async function refreshInBackground() {
	const catalog = gradebookState.gradebookCatalog;
	if (!catalog || catalog.loadingIndex !== undefined || backgroundRefreshRunning) return;

	backgroundRefreshRunning = true;
	const { overrideIndex } = catalog;
	try {
		const record = await getGradebookRecord(undefined, overrideIndex);
		// The user may have switched periods meanwhile; only apply to what's still shown.
		if (gradebookState.gradebookCatalog !== catalog || catalog.overrideIndex !== overrideIndex) return;
		storeRecord(catalog, record, overrideIndex, overrideIndex ?? catalog.defaultIndex);
		gradebookState.loadingError = undefined;
		saveGradebookCatalogToLocalStorage(catalog);
	} catch (error) {
		if (error instanceof SessionExpiredError) recordError(error);
		else console.warn('Background refresh failed; keeping the last data', error);
	} finally {
		backgroundRefreshRunning = false;
	}
}

/** When the viewed period was last refreshed (ms), if it has been loaded. */
export function activeLastRefresh() {
	const catalog = gradebookState.gradebookCatalog;
	return catalog?.recordCache[catalog.overrideIndex ?? catalog.defaultIndex]?.lastRefresh;
}

let initialized = false;

/** Shows cached data immediately (if any), then refreshes the period being viewed. */
export async function initializeGradebookCatalog() {
	if (initialized) return;
	initialized = true;

	try {
		gradebookState.gradebookCatalog =
			getGradebookCatalogFromLocalStorage() ?? (await getInitialGradebookCatalog());

		const { overrideIndex } = gradebookState.gradebookCatalog;
		if (overrideIndex === undefined) return await loadReportPeriod({});

		try {
			await loadReportPeriod({ overrideIndex });
		} catch (error) {
			if (error instanceof SessionExpiredError) throw error;
			console.error(`Error loading report period ${overrideIndex}; reverting to the current one`, error);
			gradebookState.notice = `Couldn't load ${getReportPeriodName(overrideIndex)}; showing the current grading period`;
			await loadReportPeriod({});
		}
	} catch (error) {
		recordError(error);
	}
}

/** Forgets in-memory state, e.g. on logout or when a different account logs in. */
export function resetGradebookState() {
	initialized = false;
	gradebookState.gradebookCatalog = undefined;
	gradebookState.loadingError = undefined;
	gradebookState.sessionExpired = undefined;
	gradebookState.notice = undefined;
}
