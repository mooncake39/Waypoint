// Made-up gradebook for demo mode. Built in the portal's raw format (GetClassData +
// LoadWithOptions per class) and run through the real converter, so the demo uses
// the same code path as live data. Dates are relative to today. No real person,
// school or account is involved.

import type { GradingPeriod, RawClass, RawGradebook } from './portal/gradebook';
import type { ClassData, LwoItem } from './portal/map';

interface DemoAssignment {
	title: string;
	category: string;
	/** Points earned; omit for ungraded. */
	earned?: number;
	possible: number;
	/** Negative for upcoming work. */
	daysAgo: number;
	/** Raw score entered on a different scale, e.g. 13 of 16 (scaled to `earned`/`possible`). */
	raw?: [number, number];
	yesNo?: boolean;
	extraCredit?: boolean;
	notForGrading?: boolean;
	excused?: boolean;
	/** Hidden from the portal by the teacher; its points still count in the totals. */
	hidden?: boolean;
	comment?: string;
}

interface DemoClass {
	id: number;
	name: string;
	teacher: string;
	email: string;
	period: string;
	room: string;
	/** Weighted categories; omit for a total-points class. */
	weights?: Record<string, number>;
	/** Graded on the 0–4 rubric scale instead of a percentage. */
	rubric?: boolean;
	assignments: DemoAssignment[];
}

const classes: DemoClass[] = [
	{
		id: 9001,
		name: 'AP Biology',
		teacher: 'Dana Whitfield',
		email: 'dwhitfield@example.org',
		period: '1',
		room: '214',
		weights: { Tests: 50, Labs: 30, Homework: 20 },
		assignments: [
			{ title: 'Unit 3 Test: Cellular Respiration', category: 'Tests', possible: 50, daysAgo: -4 },
			{
				title: 'Enzyme Lab Report',
				category: 'Labs',
				earned: 26,
				possible: 32,
				raw: [13, 16],
				daysAgo: 3,
				comment: 'Good analysis; graph needs labels.'
			},
			{ title: 'Chapter 7 Reading Questions', category: 'Homework', earned: 10, possible: 10, daysAgo: 5 },
			{ title: 'Unit 2 Test: Cell Structure', category: 'Tests', earned: 44, possible: 50, daysAgo: 9 },
			{ title: 'Microscopy Lab', category: 'Labs', earned: 18, possible: 20, daysAgo: 13 },
			{
				title: 'Bonus: Science Fair Visit',
				category: 'Homework',
				earned: 3,
				possible: 5,
				daysAgo: 15,
				extraCredit: true
			},
			{ title: 'Chapter 5 Reading Questions', category: 'Homework', earned: 8, possible: 10, daysAgo: 18 },
			{ title: 'Unit 1 Test: Chemistry of Life', category: 'Tests', earned: 41, possible: 50, daysAgo: 24 }
		]
	},
	{
		id: 9002,
		name: 'English 11',
		teacher: 'Marcus Oyelaran',
		email: 'moyelaran@example.org',
		period: '2',
		room: '108',
		assignments: [
			{
				title: 'Practice Thesis Paragraph',
				category: 'Writing',
				earned: 6,
				possible: 10,
				daysAgo: 2,
				notForGrading: true,
				comment: 'Practice only. Revise before the essay.'
			},
			{ title: 'Gatsby Chapters 4–6 Quiz', category: 'Quizzes', earned: 19, possible: 20, daysAgo: 6 },
			{ title: 'Personal Narrative Essay', category: 'Writing', earned: 94, possible: 100, daysAgo: 12 },
			{ title: 'Gatsby Chapters 1–3 Quiz', category: 'Quizzes', earned: 19, possible: 20, daysAgo: 16 },
			{
				title: 'Signed Syllabus',
				category: 'Participation',
				earned: 5,
				possible: 5,
				daysAgo: 30,
				yesNo: true
			}
		]
	},
	{
		id: 9003,
		name: 'Precalculus',
		teacher: 'Priya Natarajan',
		email: 'pnatarajan@example.org',
		period: '3',
		room: '305',
		weights: { Assessments: 70, Practice: 30 },
		assignments: [
			{
				title: 'Problem Set 6',
				category: 'Practice',
				earned: 0,
				possible: 15,
				daysAgo: 2,
				comment: 'Not turned in.'
			},
			{ title: 'Quiz 3: Inverse Functions', category: 'Assessments', earned: 23, possible: 25, daysAgo: 7 },
			{ title: 'Problem Set 5', category: 'Practice', earned: 14, possible: 15, daysAgo: 9 },
			{ title: 'Problem Set 4', category: 'Practice', earned: 0, possible: 15, daysAgo: 14, excused: true },
			{ title: 'Quiz 2: Transformations', category: 'Assessments', earned: 21, possible: 25, daysAgo: 17 },
			{ title: 'Problem Set 3', category: 'Practice', earned: 15, possible: 15, daysAgo: 21 }
		]
	},
	{
		id: 9004,
		name: 'US History',
		teacher: 'Elena Varga',
		email: 'evarga@example.org',
		period: '4',
		room: '122',
		weights: { Projects: 40, Quizzes: 30, Classwork: 30 },
		assignments: [
			{ title: 'Reconstruction Research Project', category: 'Projects', possible: 100, daysAgo: -10 },
			{ title: 'Quiz: The Gilded Age', category: 'Quizzes', earned: 18, possible: 20, daysAgo: 4 },
			{ title: 'Primary Source Analysis', category: 'Classwork', earned: 9, possible: 10, daysAgo: 8 },
			{ title: 'Quiz: Civil War', category: 'Quizzes', earned: 17, possible: 20, daysAgo: 15 },
			{ title: 'Timeline Activity', category: 'Classwork', earned: 10, possible: 10, daysAgo: 19 }
		]
	},
	{
		id: 9005,
		name: 'Orchestra',
		teacher: 'Jonah Brightwater',
		email: 'jbrightwater@example.org',
		period: '5',
		room: 'Music 2',
		rubric: true,
		weights: { Performances: 60, Rehearsals: 40 },
		assignments: [
			{ title: 'Week 6 Rehearsals', category: 'Rehearsals', possible: 20, daysAgo: -3 },
			{ title: 'Week 5 Rehearsals', category: 'Rehearsals', earned: 18, possible: 20, daysAgo: 4 },
			{ title: 'Fall Concert', category: 'Performances', earned: 95, possible: 100, daysAgo: 10 },
			{ title: 'Week 4 Rehearsals', category: 'Rehearsals', earned: 20, possible: 20, daysAgo: 11 },
			{ title: 'Playing Test: Scales', category: 'Performances', earned: 45, possible: 50, daysAgo: 20 }
		]
	},
	{
		id: 9006,
		name: 'Spanish 3',
		teacher: 'Lucía Romero',
		email: 'lromero@example.org',
		period: '6',
		room: '201',
		weights: { Speaking: 50, Written: 50 },
		assignments: [
			{ title: 'Vocabulary Quiz 4', category: 'Written', earned: 18, possible: 20, daysAgo: 3 },
			{
				title: 'Oral Presentation: Mi Familia',
				category: 'Speaking',
				earned: 46,
				possible: 50,
				daysAgo: 8
			},
			{ title: 'Makeup Quiz', category: 'Written', earned: 12, possible: 20, daysAgo: 10, hidden: true },
			{ title: 'Vocabulary Quiz 3', category: 'Written', earned: 19, possible: 20, daysAgo: 14 },
			{ title: 'Conversation Check-in', category: 'Speaking', earned: 9, possible: 10, daysAgo: 22 }
		]
	}
];

const PERCENT_LETTERS = [
	{ score: 'A', lowScore: 90 },
	{ score: 'B', lowScore: 80 },
	{ score: 'C', lowScore: 70 },
	{ score: 'D', lowScore: 60 },
	{ score: 'F', lowScore: 0 }
];
const RUBRIC_LETTERS = [
	{ score: 'A', lowScore: 3.5 },
	{ score: 'B', lowScore: 2.75 },
	{ score: 'C', lowScore: 2 },
	{ score: 'D', lowScore: 1.5 },
	{ score: 'F', lowScore: 0 }
];
const letterFor = (value: number, letters: typeof PERCENT_LETTERS) =>
	letters.find((l) => value >= l.lowScore)?.score ?? 'F';

/** Local date-time without a zone, like the portal's `due_date`. */
function portalDate(daysAgo: number, now: Date) {
	const d = new Date(now);
	d.setDate(d.getDate() - daysAgo);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T08:00:00`;
}

const counts = (a: DemoAssignment) => a.earned !== undefined && !a.notForGrading && !a.excused;

/** Points per category as the server totals them (hidden work included). */
function categoryTotals(c: DemoClass) {
	const totals = new Map<string, { points: number; possible: number }>();
	for (const a of c.assignments.filter(counts)) {
		const t = totals.get(a.category) ?? { points: 0, possible: 0 };
		t.points += a.earned!;
		if (!a.extraCredit) t.possible += a.possible;
		totals.set(a.category, t);
	}
	return totals;
}

function classPercentage(c: DemoClass) {
	const totals = categoryTotals(c);
	if (!c.weights) {
		let points = 0;
		let possible = 0;
		for (const t of totals.values()) {
			points += t.points;
			possible += t.possible;
		}
		return possible ? (points / possible) * 100 : 0;
	}
	let sum = 0;
	let weight = 0;
	for (const [name, t] of totals) {
		if (!t.possible) continue;
		sum += c.weights[name] * (t.points / t.possible);
		weight += c.weights[name];
	}
	return weight ? (sum / weight) * 100 : 0;
}

function buildClass(c: DemoClass, graded: boolean, gradingPeriodName: string, now: Date): RawClass {
	const categoryNames = c.weights
		? Object.keys(c.weights)
		: [...new Set(c.assignments.map((a) => a.category))];
	const categoryId = (name: string) => c.id * 10 + categoryNames.indexOf(name) + 1;
	const assignments = graded ? c.assignments : c.assignments.map((a) => ({ ...a, earned: undefined }));
	const demo: DemoClass = { ...c, assignments };

	const letters = c.rubric ? RUBRIC_LETTERS : PERCENT_LETTERS;
	const percentage = classPercentage(demo);
	const value = Math.round((c.rubric ? (percentage / 100) * 4 : percentage) * 100) / 100;
	const totals = categoryTotals(demo);

	const classData: ClassData = {
		GradingPeriodName: gradingPeriodName,
		isAssignmentWeightingOn: c.weights !== undefined,
		// No grade at all until something is graded (e.g. a quarter that hasn't started).
		classGrades: totals.size
			? [
					{
						studentId: 1,
						points: [...totals.values()].reduce((s, t) => s + t.points, 0),
						pointsPossible: [...totals.values()].reduce((s, t) => s + t.possible, 0),
						totalWeightedPercentage: value,
						calculatedMark: letterFor(value, letters),
						manualMark: '',
						maxValue: c.rubric ? 4 : 100,
						reportCardScoreTypeId: c.rubric ? 59 : 58
					}
				]
			: [],
		measureTypes: categoryNames.map((name) => ({
			id: categoryId(name),
			name,
			weight: c.weights?.[name] ?? 0
		})),
		measureTypeGrades: [...totals].map(([name, t]) => ({
			measureTypeId: categoryId(name),
			measureTypeWeight: c.weights?.[name] ?? 0,
			points: t.points,
			pointsPossible: t.possible,
			calculatedMark: t.possible
				? letterFor((t.points / t.possible) * (c.rubric ? 4 : 100), letters)
				: ''
		})),
		// Graded results only, like the portal; upcoming work is only in the item list.
		assignments: assignments
			.map((a, i) => ({ a, id: c.id * 100 + i }))
			.filter(({ a }) => a.earned !== undefined)
			.map(({ a, id }) => ({
				gradeBookId: id,
				measureTypeId: categoryId(a.category),
				category: a.category,
				gradeBookCategoryId: a.extraCredit ? 2 : a.notForGrading ? 3 : 1,
				gradeBookScoreTypeId: a.yesNo ? 10 : 2,
				score: a.yesNo ? 'y' : String(a.raw?.[0] ?? a.earned),
				maxValue: a.yesNo ? 100 : (a.raw?.[1] ?? a.possible),
				pointsPossible: a.possible,
				dueDate: portalDate(a.daysAgo, now),
				excused: a.excused === true,
				isForGrading: !a.notForGrading,
				hideInPortal: a.hidden === true,
				publicNote: a.comment ?? ''
			})),
		gradeBookCategories: [
			{ id: 1, name: 'Normal' },
			{ id: 2, name: 'Extra Credit' },
			{ id: 3, name: 'Not for Grading' },
			{ id: 7, name: 'Content' }
		],
		gradeBookScoreTypes: [
			{ id: 2, name: 'Raw Score', max: 0, details: [] },
			{
				id: 10,
				name: 'Yes / No',
				max: 100,
				details: [
					{ score: 'Y', value: 100 },
					{ score: 'N', value: 60 }
				]
			}
		],
		reportCardScoreTypes: [
			{ id: 58, max: 100, details: PERCENT_LETTERS },
			{ id: 59, max: 4, details: RUBRIC_LETTERS }
		]
	};

	// The portal's item list; hidden work isn't in it.
	const items: LwoItem[] = assignments
		.map((a, i) => ({ a, i }))
		.filter(({ a }) => !a.hidden)
		.map(({ a, i }) => ({
			itemID: c.id * 100 + i,
			itemType: 'GradeBookItem',
			title: a.title,
			assignmentType: a.category,
			due_date: portalDate(a.daysAgo, now),
			pointsPossible: a.possible.toFixed(2),
			points: a.earned !== undefined ? a.earned.toFixed(10) : '',
			gradeMark: a.earned !== undefined ? (a.yesNo ? 'y' : String(a.raw?.[0] ?? a.earned)) : '',
			commentText: a.comment ?? '',
			publicNote: ''
		}));

	return {
		info: {
			Name: c.name,
			TeacherName: c.teacher,
			ID: c.id,
			ClassDetailControl: 'Gradebook_RichContentClassDetails'
		},
		schedule: {
			courseTitle: c.name,
			period: c.period,
			room: c.room,
			teacher: c.teacher,
			teacherEmail: c.email,
			additionalStaff: []
		},
		classData,
		contentItems: { responseData: { data: [{ key: 'Demo', items }], totalCount: items.length } }
	};
}

const PERIODS = ['Quarter 1', 'Quarter 2', 'Semester 1 Final'];

/** The demo gradebook for a grading period (Quarter 1 when omitted or unknown). */
export function demoRawGradebook(periodIndex?: number, now = new Date()): RawGradebook {
	const index =
		periodIndex !== undefined && periodIndex >= 0 && periodIndex < PERIODS.length ? periodIndex : 0;
	const periods: GradingPeriod[] = PERIODS.map((Name, i) => ({
		Name,
		GU: `demo-period-${i}`,
		MarkPeriods: [{ Name, GU: `demo-mark-${i}` }],
		OrgYearGU: 'demo-year',
		schoolID: 1,
		defaultFocus: i === 0
	}));
	// Quarter 2 hasn't started; the semester repeats Quarter 1's work.
	const graded = index !== 1;
	const periodName = PERIODS[index] === 'Semester 1 Final' ? 'S1 Final' : PERIODS[index];

	return {
		periods,
		periodIndex: index,
		classes: classes.map((c) => buildClass(c, graded, periodName, now)),
		studentName: 'Rivera, Alex',
		schedule: [],
		fetchedAt: now.getTime()
	};
}
