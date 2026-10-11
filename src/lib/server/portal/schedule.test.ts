import { afterEach, describe, expect, test, vi } from 'vitest';
import { PortalClient } from './http';
import { fetchSchedule, matchSchedule, parseScheduleRow, type ScheduleEntry } from './schedule';

const rawRow = {
	ID: '<SECTION_GU>',
	Period: '3',
	CourseTitle: JSON.stringify({ value: 'Biology 1', dataType: 'TextColumn' }),
	RoomName: '108',
	Teacher: JSON.stringify({
		teacherName: 'Pat Teacher',
		email: 'pteacher@example.org',
		sgu: '<STAFF_GU>',
		emailSubject: 'About <STUDENT NAME>',
		synergyMailToInfo: '<STUDENT NAME>',
		dataType: 'TeacherColumn'
	}),
	AdditionalStaffName: JSON.stringify({
		teacherNameAndTeacherEmailAndTeacherStaffGU: [
			{ AdditionalStaffName: 'Sam Aide', AdditionalStaffEmail: 'saide@example.org', AdditionalStaffGU: '<GU>' }
		]
	})
};

test('parseScheduleRow keeps display fields only', () => {
	const entry = parseScheduleRow(rawRow);
	expect(entry).toEqual({
		courseTitle: 'Biology 1',
		period: '3',
		room: '108',
		teacher: 'Pat Teacher',
		teacherEmail: 'pteacher@example.org',
		additionalStaff: [{ name: 'Sam Aide', email: 'saide@example.org' }]
	});
	expect(JSON.stringify(entry)).not.toContain('STUDENT');
});

test('parseScheduleRow tolerates missing or malformed JSON fields', () => {
	expect(parseScheduleRow({ Period: '1', CourseTitle: 'not json' })).toMatchObject({
		courseTitle: '',
		period: '1',
		teacher: '',
		additionalStaff: []
	});
});

describe('matchSchedule', () => {
	const entry = (courseTitle: string, teacher: string): ScheduleEntry => ({
		courseTitle,
		teacher,
		period: '1',
		room: '',
		teacherEmail: '',
		additionalStaff: []
	});

	test('matches trimmed, case-insensitive course + teacher', () => {
		const e = entry('Biology 1', 'Pat Teacher');
		expect(matchSchedule([e], 'Biology 1 ', 'pat  teacher')).toBe(e);
	});

	test('returns undefined for no match or an ambiguous match', () => {
		const e = entry('Math', 'A B');
		expect(matchSchedule([e], 'Math', 'C D')).toBeUndefined();
		expect(matchSchedule([e, { ...e }], 'Math', 'A B')).toBeUndefined();
	});
});

describe('fetchSchedule', () => {
	afterEach(() => vi.unstubAllGlobals());

	const page = `<script>new DevExpress.PXPRemoteDataStore('0F1E2D3C-4B5A-6978-8796-A5B4C3D2E1F0', '{"AGU":"0"}')</script>`;
	const dx = (data: unknown[], totalCount: number) =>
		new Response(JSON.stringify({ d: { Error: null, Data: { success: true, data, totalCount } } }));

	test('pages through rows using the page-issued data source id', async () => {
		const first = Array.from({ length: 15 }, (_, i) => ({ ...rawRow, Period: String(i) }));
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(page))
			.mockResolvedValueOnce(dx(first, 16))
			.mockResolvedValueOnce(dx([rawRow], 16));
		vi.stubGlobal('fetch', fetchMock);

		const rows = await fetchSchedule(new PortalClient('https://d.edupoint.com'));
		expect(rows).toHaveLength(16);

		const body = JSON.parse(String(fetchMock.mock.calls[2][1].body));
		expect(body.request.dataSourceTypeName).toBe('0F1E2D3C-4B5A-6978-8796-A5B4C3D2E1F0');
		expect(body.request.gridParameters).toBe('{"AGU":"0"}');
		expect(body.request.loadOptions.skip).toBe(15);
	});

	test('returns [] instead of throwing on failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('down', { status: 500 })));
		await expect(fetchSchedule(new PortalClient('https://d.edupoint.com'))).resolves.toEqual([]);
	});
});
