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
	type GradebookCatalog
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
			const { gradebook } = gradebookRecord;

			const receivedIndex = parseInt(gradebook.ReportingPeriod._Index);
			catalog.recordCache[receivedIndex] = gradebookRecord;

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
