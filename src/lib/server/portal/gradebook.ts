// Handoff §3 steps 2, 4, 5: gradebook page → class list → per-class data.
// Returns raw portal payloads (minus a few private fields) for display.

import { extractJsObject } from './extract';
import { PortalClient, PortalError } from './http';
import { fetchSchedule, matchSchedule, type ScheduleEntry } from './schedule';

export interface GradingPeriod {
	Name: string;
	GU: string;
	MarkPeriods: { Name: string; GU: string }[];
	OrgYearGU: string;
	schoolID: number;
	defaultFocus: boolean;
	[key: string]: unknown;
}

interface GBFocusData {
	Schools: { SchoolID: number; SchoolName: string; GradingPeriods: GradingPeriod[] }[];
	[key: string]: unknown;
}

interface GBCurrentFocus {
	FocusArgs: { studentGU: string; [key: string]: unknown };
}

interface ClassInfo {
	Name: string;
	TeacherName: string;
	ID: number;
	ClassDetailControl: string;
	[key: string]: unknown;
}

interface AsmxEnvelope<T> {
	d: { Error: { Message: string } | null; Data: T | null; DataType: string; FOCUS_KEY: string | null };
}

export interface RawClass {
	info: ClassInfo;
	/** Period, room, emails from the class schedule; undefined if no unique match. */
	schedule?: ScheduleEntry;
	classData: unknown;
	contentItems: unknown;
}

export interface RawGradebook {
	periods: GradingPeriod[];
	periodIndex: number;
	classes: RawClass[];
	/** All schedule rows, for display and debugging of the class match. */
	schedule: ScheduleEntry[];
	fetchedAt: number;
}

async function asmx<T>(client: PortalClient, method: string, body: unknown, studentGU: string) {
	const res = await client.postJson<AsmxEnvelope<T>>(
		method,
		`/service/PXP2Communication.asmx/${method}`,
		body,
		{ AGU: '0', Referer: `${client.base}/PXP2_Gradebook.aspx?AGU=0&studentGU=${studentGU}` }
	);
	if (!res?.d || res.d.Error !== null) throw new PortalError(method, 'asmx_error');
	return res.d;
}

async function transfer<T>(
	client: PortalClient,
	focusKey: string,
	studentGU: string,
	friendlyName: string,
	method: string,
	params: unknown
) {
	return client.postJson<T>(
		method,
		`/api/GB/ClientSideData/Transfer?action=${friendlyName}-${method}`,
		{ FriendlyName: friendlyName, Method: method, Parameters: JSON.stringify(params) },
		{
			CURRENT_WEB_PORTAL: 'StudentVUE',
			FOCUS_KEY: focusKey,
			Referer: `${client.base}/PXP2_Gradebook.aspx?AGU=0&studentGU=${studentGU}`
		}
	);
}

/** Removes student names and teacher-private notes before data leaves the server (§13). */
function stripPrivate(gcd: Record<string, unknown>) {
	const { className: _className, ...rest } = gcd;
	if (Array.isArray(rest.students))
		rest.students = rest.students.map(({ name: _name, ...s }: Record<string, unknown>) => s);
	if (Array.isArray(rest.assignments))
		rest.assignments = rest.assignments.map(
			({ privateNote: _note, ...a }: Record<string, unknown>) => a
		);
	return rest;
}

export async function fetchGradebook(client: PortalClient, periodIndex?: number): Promise<RawGradebook> {
	const html = await client.getHtml('GradebookPage', '/PXP2_Gradebook.aspx?AGU=0');
	const focusData = extractJsObject<GBFocusData>(html, 'PXP.GBFocusData');
	const currentFocus = extractJsObject<GBCurrentFocus>(html, 'PXP.GBCurrentFocus');
	if (!focusData || !currentFocus) throw new PortalError('GradebookPage', 'empty');

	const studentGU = currentFocus.FocusArgs.studentGU;
	const periods = focusData.Schools[0]?.GradingPeriods ?? [];
	const index =
		periodIndex !== undefined && periods[periodIndex]
			? periodIndex
			: Math.max(0, periods.findIndex((p) => p.defaultFocus));
	const period = periods[index];
	if (!period) throw new PortalError('GradebookPage', 'empty');
	const markPeriodGU = period.MarkPeriods[0]?.GU;

	const schedule = await fetchSchedule(client);

	const classList = await asmx<{ Classes: ClassInfo[] }>(
		client,
		'GradebookFocusClassInfo',
		{
			request: {
				gradingPeriodGU: period.GU,
				AGU: '0',
				orgYearGU: period.OrgYearGU,
				schoolID: period.schoolID,
				markPeriodGU
			}
		},
		studentGU
	);

	const classes: RawClass[] = [];
	// Sequential on purpose: LoadControl moves the session's single focus (§3 rule 1).
	for (const info of classList.Data?.Classes ?? []) {
		const lc = await asmx(
			client,
			'LoadControl',
			{
				request: {
					control: info.ClassDetailControl,
					parameters: {
						schoolID: period.schoolID,
						classID: info.ID,
						gradePeriodGU: period.GU,
						subjectID: -1,
						teacherID: -1,
						markPeriodGU,
						assignmentID: -1,
						standardIdentifier: null,
						viewName: null,
						studentGU,
						AGU: '0',
						OrgYearGU: period.OrgYearGU
					}
				}
			},
			studentGU
		);
		if (!lc.FOCUS_KEY) throw new PortalError('LoadControl', 'no_focus_key');

		const gcd = await transfer<Record<string, unknown>>(
			client,
			lc.FOCUS_KEY,
			studentGU,
			'genericdata.classdata',
			'GetClassData',
			{}
		);
		if (!gcd || gcd.classId === undefined) throw new PortalError('GetClassData', 'empty');

		const lwo = await transfer(client, lc.FOCUS_KEY, studentGU, 'pxp.course.content.items', 'LoadWithOptions', {
			loadOptions: {
				sort: [{ selector: 'due_date', desc: false }],
				filter: [],
				group: [{ Selector: 'Week', desc: false }],
				requireTotalCount: true,
				userData: {}
			},
			clientState: {}
		});

		classes.push({
			info,
			schedule: matchSchedule(schedule, info.Name, info.TeacherName),
			classData: stripPrivate(gcd),
			contentItems: lwo
		});
	}

	return { periods, periodIndex: index, classes, schedule, fetchedAt: Date.now() };
}
