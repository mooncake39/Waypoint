// Handoff §7: class schedule → period, room, teacher email, additional staff.
// Display-only, so it never throws: on any failure it returns no rows.

import { extractRemoteDataStore } from './extract';
import type { PortalClient } from './http';

const SCHEDULE_PATH = '/PXP2_ClassSchedule.aspx?AGU=0&VDT=1';
const PAGE_SIZE = 15;

export interface Staff {
	name: string;
	email: string;
}

/** One schedule row, reduced to display fields. Student-name fields are never kept (§13). */
export interface ScheduleEntry {
	courseTitle: string;
	period: string;
	room: string;
	teacher: string;
	teacherEmail: string;
	additionalStaff: Staff[];
}

interface RawScheduleRow {
	Period?: string;
	CourseTitle?: string;
	RoomName?: string;
	Teacher?: string;
	AdditionalStaffName?: string;
}

interface DXResponse {
	d: {
		Error: unknown;
		Data: { success?: boolean; data?: RawScheduleRow[]; totalCount?: number } | null;
	};
}

function parseJsonField<T>(value: string | undefined): T | undefined {
	if (!value) return undefined;
	try {
		return JSON.parse(value) as T;
	} catch {
		return undefined;
	}
}

interface StaffJson {
	AdditionalStaffName?: string;
	AdditionalStaffEmail?: string;
}

export function parseScheduleRow(row: RawScheduleRow): ScheduleEntry {
	const course = parseJsonField<{ value?: string }>(row.CourseTitle);
	const teacher = parseJsonField<{ teacherName?: string; email?: string }>(row.Teacher);
	const additional = parseJsonField<{
		teacherNameAndTeacherEmailAndTeacherStaffGU?: StaffJson[];
	}>(row.AdditionalStaffName);

	return {
		courseTitle: (course?.value ?? '').trim(),
		period: String(row.Period ?? '').trim(),
		room: String(row.RoomName ?? '').trim(),
		teacher: (teacher?.teacherName ?? '').trim(),
		teacherEmail: (teacher?.email ?? '').trim(),
		additionalStaff: (additional?.teacherNameAndTeacherEmailAndTeacherStaffGU ?? [])
			.map((s) => ({
				name: (s.AdditionalStaffName ?? '').trim(),
				email: (s.AdditionalStaffEmail ?? '').trim()
			}))
			.filter((s) => s.name || s.email)
	};
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Matches on course name + teacher name; anything but exactly one match gives undefined (§7). */
export function matchSchedule(entries: ScheduleEntry[], courseName: string, teacherName: string) {
	const matches = entries.filter(
		(e) => norm(e.courseTitle) === norm(courseName) && norm(e.teacher) === norm(teacherName)
	);
	return matches.length === 1 ? matches[0] : undefined;
}

export async function fetchSchedule(client: PortalClient): Promise<ScheduleEntry[]> {
	try {
		const html = await client.getHtml('SchedulePage', SCHEDULE_PATH);
		const store = extractRemoteDataStore(html);
		if (!store) {
			console.log('SchedulePage: PXPRemoteDataStore not found');
			return [];
		}

		const rows: RawScheduleRow[] = [];
		for (let skip = 0; ; skip += PAGE_SIZE) {
			const res = await client.postJson<DXResponse>(
				'DXDataGridRequest',
				'/service/PXP2Communication.asmx/DXDataGridRequest',
				{
					request: {
						agu: 0,
						dataRequestType: 'Load',
						gridParameters: store.gridParameters,
						dataSourceTypeName: store.dataSourceId,
						loadOptions: {
							requireTotalCount: true,
							searchOperation: 'contains',
							searchValue: null,
							skip,
							take: PAGE_SIZE,
							sort: null,
							group: null
						}
					}
				},
				{ AGU: '0', Referer: client.base + SCHEDULE_PATH }
			);
			if (res?.d?.Error !== null || !res.d.Data) return [];

			const page = res.d.Data.data ?? [];
			rows.push(...page);
			const total = res.d.Data.totalCount ?? rows.length;
			if (page.length === 0 || rows.length >= total) break;
		}

		return rows.map(parseScheduleRow);
	} catch (e) {
		console.log(`Schedule skipped: ${e instanceof Error ? e.message : e}`);
		return [];
	}
}
