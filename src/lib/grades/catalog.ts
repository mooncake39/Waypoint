// Gradebook cache per grading period, persisted in localStorage as JSON.
// Adapted from GradeCompass (MIT, see LICENSE-gradecompass.txt): records hold
// the converted `Gradebook` from /api/gradebook instead of raw SOAP XML.

import { fetchGradebook } from '../api';
import { LocalStorageKey, readJson, remove, writeJson } from '../storage';
import type { Gradebook, ReportPeriod } from '../types/Gradebook';

export interface GradebookRecord {
	gradebook: Gradebook;
	lastRefresh: number;
}

interface GradebookCatalogLocalStorageCache {
	recordCache: (null | GradebookRecord)[];
	defaultIndex: number;
	overrideIndex: number | null;
}

export interface GradebookCatalog {
	recordCache: (undefined | GradebookRecord)[];
	/** The current grading period, as reported by the portal. */
	defaultIndex: number;
	/** A period the user switched to, if not the current one. */
	overrideIndex?: number;
	loadingIndex?: number;
	receivingData?: boolean;
	canonicalReportPeriodEntries?: ReportPeriod[];
}

export function getGradebookCatalogFromLocalStorage(): GradebookCatalog | undefined {
	const cache = readJson<GradebookCatalogLocalStorageCache>(LocalStorageKey.gradebook);
	if (!cache || !Array.isArray(cache.recordCache)) return undefined;

	const defaultRecord = cache.recordCache[cache.defaultIndex];

	return {
		recordCache: cache.recordCache.map((record) => record ?? undefined),
		defaultIndex: cache.defaultIndex,
		overrideIndex: cache.overrideIndex ?? undefined,
		canonicalReportPeriodEntries: defaultRecord?.gradebook.ReportingPeriods.ReportPeriod
	};
}

export function saveGradebookCatalogToLocalStorage(gradebookCatalog: GradebookCatalog) {
	const cache: GradebookCatalogLocalStorageCache = {
		recordCache: gradebookCatalog.recordCache.map((record) => record ?? null),
		defaultIndex: gradebookCatalog.defaultIndex,
		overrideIndex: gradebookCatalog.overrideIndex ?? null
	};
	writeJson(LocalStorageKey.gradebook, cache);
}

export const clearGradebookCatalogFromLocalStorage = () => remove(LocalStorageKey.gradebook);

export async function getGradebookRecord(
	onReceivingData?: () => void,
	reportPeriod?: number
): Promise<GradebookRecord> {
	const { gradebook, fetchedAt } = await fetchGradebook(reportPeriod, onReceivingData);
	return { gradebook, lastRefresh: fetchedAt };
}

export async function getInitialGradebookCatalog(): Promise<GradebookCatalog> {
	const defaultGradebookRecord = await getGradebookRecord();
	const { gradebook } = defaultGradebookRecord;

	const canonicalReportPeriodEntries = gradebook.ReportingPeriods.ReportPeriod;
	const recordCache: (undefined | GradebookRecord)[] = Array(canonicalReportPeriodEntries.length).fill(
		undefined
	);

	const defaultIndex = parseInt(gradebook.ReportingPeriod._Index);
	recordCache[defaultIndex] = defaultGradebookRecord;

	return { recordCache, defaultIndex, canonicalReportPeriodEntries };
}

/** Matches the 60 s polling interval; older cached periods are refetched when shown. */
const cacheExpirationTime = 1000 * 60;

export const gradebookRefreshNeeded = (record: GradebookRecord) =>
	Date.now() - record.lastRefresh > cacheExpirationTime;
