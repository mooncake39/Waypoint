import { describe, expect, test } from 'vitest';
import { checkCourseGrade } from '../../grades/check';
import { parseSynergyAssignment } from '../../grades/assignments';
import type { RawClass, RawGradebook } from './gradebook';
import {
	buildCourse,
	buildScoreScale,
	formatStudentName,
	serverPercentage,
	toGradebook,
	type ClassData,
	type LwoItem
} from './map';

// Synthetic class modelled on the handoff's verified example (§10.3):
// A w20 100/100, B w40 51/57, C w10 and D w30 empty → 92.98.

const scoreTypes = [
	{ id: 2, name: 'Raw Score', max: 0, details: [] },
	{ id: 10, name: 'Yes / No', max: 100, details: [{ score: 'Y', value: 100 }, { score: 'N', value: 60 }] }
];
const categoriesKinds = [
	{ id: 1, name: 'Normal' },
	{ id: 2, name: 'Extra Credit' },
	{ id: 3, name: 'Not for Grading' },
	{ id: 7, name: 'Content' }
];

function gcdAssignment(over: Partial<ClassData['assignments'][number]>): ClassData['assignments'][number] {
	return {
		gradeBookId: 0,
		measureTypeId: 1,
		category: 'Essays',
		gradeBookCategoryId: 1,
		gradeBookScoreTypeId: 2,
		score: null,
		maxValue: 10,
		pointsPossible: 10,
		dueDate: '9/1/2026',
		excused: false,
		isForGrading: true,
		hideInPortal: false,
		publicNote: '',
		...over
	};
}

function lwo(over: Partial<LwoItem>): LwoItem {
	return {
		itemID: 0,
		itemType: 'GradeBookItem',
		title: '',
		assignmentType: 'Essays',
		due_date: '2026-09-01T08:00:00',
		pointsPossible: '10.00',
		points: '',
		gradeMark: '',
		commentText: '',
		publicNote: '',
		...over
	};
}

const classData: ClassData = {
	GradingPeriodName: 'Quarter 1',
	isAssignmentWeightingOn: true,
	classGrades: [
		{ studentId: 77, points: 151, pointsPossible: 157, totalWeightedPercentage: 92.98, calculatedMark: 'A', manualMark: '', maxValue: 100 }
	],
	measureTypes: [
		{ id: 1, name: 'Essays', weight: 20 },
		{ id: 2, name: 'Projects', weight: 40 },
		{ id: 3, name: 'Labs', weight: 10 },
		{ id: 4, name: 'Exams', weight: 30 },
		{ id: 99, name: 'Some Other Section', weight: 0 }
	],
	measureTypeGrades: [
		{ measureTypeId: 1, measureTypeWeight: 20, points: 100, pointsPossible: 100, calculatedMark: 'A' },
		{ measureTypeId: 2, measureTypeWeight: 40, points: 51, pointsPossible: 57, calculatedMark: 'B' }
	],
	assignments: [
		gcdAssignment({ gradeBookId: 101, measureTypeId: 1, score: '100', maxValue: 100, pointsPossible: 100, dueDate: '9/2/2026' }),
		// Scaled: raw 13/16 entered, worth 26/32 points.
		gcdAssignment({ gradeBookId: 102, measureTypeId: 2, category: 'Projects', score: '13', maxValue: 16, pointsPossible: 32, dueDate: '9/5/2026' }),
		// Yes/No: LWO already converts "y" to points.
		gcdAssignment({ gradeBookId: 103, measureTypeId: 2, category: 'Projects', gradeBookScoreTypeId: 10, score: 'y', maxValue: 100, pointsPossible: 25, dueDate: '9/9/2026' }),
		gcdAssignment({ gradeBookId: 104, measureTypeId: 2, category: 'Projects', gradeBookCategoryId: 3, isForGrading: false, score: '1', pointsPossible: 10, dueDate: '9/6/2026' }),
		gcdAssignment({ gradeBookId: 105, measureTypeId: 2, category: 'Projects', gradeBookCategoryId: 2, score: '3', pointsPossible: 5, dueDate: '9/7/2026' }),
		gcdAssignment({ gradeBookId: 106, measureTypeId: 2, category: 'Projects', excused: true, score: '0', dueDate: '9/8/2026' }),
		gcdAssignment({ gradeBookId: 107, measureTypeId: 1, hideInPortal: true, score: '5', dueDate: '9/3/2026' }),
		// In GCD only (no LWO item).
		gcdAssignment({ gradeBookId: 108, measureTypeId: 3, category: 'Labs', score: null, dueDate: '9/20/2026' })
	],
	gradeBookCategories: categoriesKinds,
	gradeBookScoreTypes: scoreTypes
};

const contentItems = {
	responseData: {
		data: [
			{
				key: 'Week 1',
				items: [
					lwo({ itemID: 101, title: 'Essay 1', due_date: '2026-09-02T08:00:00', points: '100.0000000000', pointsPossible: '100.00', gradeMark: '100' }),
					lwo({ itemID: 102, title: 'Project 1', assignmentType: 'Projects', due_date: '2026-09-05T08:00:00', points: '26.0000000000', pointsPossible: '32.00', gradeMark: '13', commentText: 'Nice' }),
					lwo({ itemID: 104, title: 'Practice', assignmentType: 'Projects', due_date: '2026-09-06T08:00:00', points: '1.0000000000', pointsPossible: '10.00' }),
					lwo({ itemID: 105, title: 'Bonus', assignmentType: 'Projects', due_date: '2026-09-07T08:00:00', points: '3.0000000000', pointsPossible: '5.00' }),
					lwo({ itemID: 106, title: 'Excused one', assignmentType: 'Projects', due_date: '2026-09-08T08:00:00', points: '0.0000000000', pointsPossible: '10.00' }),
					lwo({ itemID: 107, title: 'Hidden', due_date: '2026-09-03T08:00:00', points: '5.0000000000' })
				]
			},
			{
				key: 'Week 2',
				items: [
					lwo({ itemID: 103, title: 'Signed form', assignmentType: 'Projects', due_date: '2026-09-09T08:00:00', points: '25.0000000000', pointsPossible: '25.00', gradeMark: 'y' }),
					lwo({ itemID: 109, title: 'Future exam', assignmentType: 'Exams', due_date: '2026-09-30T08:00:00', pointsPossible: '50.00' }),
					lwo({ itemID: 110, itemType: 'Announcement', title: 'Not an assignment' })
				]
			}
		]
	}
};

const rawClass: RawClass = {
	info: { Name: 'Course One ', TeacherName: 'Pat Teacher', ID: 5001, ClassDetailControl: 'Gradebook_RichContentClassDetails' },
	schedule: { courseTitle: 'Course One', period: '2', room: '108', teacher: 'Pat Teacher', teacherEmail: 'pat@example.org', additionalStaff: [] },
	classData,
	contentItems
};

const course = buildCourse(rawClass);
const mark = course.Marks!.Mark[0];
const byId = Object.fromEntries(mark.Assignments!.Assignment.map((a) => [a._GradebookID, a]));

describe('buildCourse', () => {
	test('course fields come from the class list and schedule', () => {
		expect(course).toMatchObject({
			_CourseID: '5001',
			_CourseName: 'Course One',
			_Title: 'Course One (5001)',
			_Staff: 'Pat Teacher',
			_StaffEMail: 'pat@example.org',
			_Period: '2',
			_Room: '108'
		});
		expect(mark).toMatchObject({ _MarkName: 'Quarter 1', _CalculatedScoreString: 'A', _CalculatedScoreRaw: '92.98' });
	});

	test('categories: graded rows with server totals, plus used or weighted empty ones; unrelated ones dropped', () => {
		expect(mark.GradeCalculationSummary!.AssignmentGradeCalc).toEqual([
			{ _Type: 'Essays', _Weight: '20%', _Points: '100', _PointsPossible: '100', _WeightedPct: '20.00%', _CalculatedMark: 'A' },
			{ _Type: 'Projects', _Weight: '40%', _Points: '51', _PointsPossible: '57', _WeightedPct: '35.79%', _CalculatedMark: 'B' },
			{ _Type: 'Labs', _Weight: '10%', _Points: '0', _PointsPossible: '0', _WeightedPct: '0.00%', _CalculatedMark: '' },
			{ _Type: 'Exams', _Weight: '30%', _Points: '0', _PointsPossible: '0', _WeightedPct: '0.00%', _CalculatedMark: '' }
		]);
	});

	test('merge: LWO items + GCD-only items, hidden and non-assignment items dropped, newest first', () => {
		expect(mark.Assignments!.Assignment.map((a) => a._GradebookID)).toEqual([
			'109', '108', '103', '106', '105', '104', '102', '101'
		]);
		expect(byId['108']._Measure).toBe('Labs'); // GCD-only: category as name
	});

	test('scaled raw score is kept as unscaled points', () => {
		const a = parseSynergyAssignment(byId['102']);
		expect(a).toMatchObject({ pointsEarned: 26, pointsPossible: 32, unscaledPoints: { pointsEarned: 13, pointsPossible: 16 }, comments: 'Nice' });
		expect(byId['102']._DisplayScore).toBe('13 out of 16');
	});

	test('Yes/No score is not treated as a scaled number', () => {
		expect(byId['103']).toMatchObject({ _ScoreType: 'Yes / No', _DisplayScore: 'Y', _Point: '25' });
		expect(parseSynergyAssignment(byId['103'])).toMatchObject({ pointsEarned: 25, pointsPossible: 25, unscaledPoints: undefined });
	});

	test('not-for-grading, excused and extra credit flags', () => {
		expect(parseSynergyAssignment(byId['104']).notForGrade).toBe(true);
		expect(parseSynergyAssignment(byId['106']).notForGrade).toBe(true);
		const bonus = parseSynergyAssignment(byId['105']);
		expect(bonus).toMatchObject({ extraCredit: true, pointsEarned: 3 });
		expect(byId['105']._PointPossible).toBe('');
	});

	test('ungraded items', () => {
		expect(byId['109']).toMatchObject({ _Point: undefined, _DisplayScore: 'Not Graded', _Points: '50 Points Possible' });
		expect(parseSynergyAssignment(byId['109'])).toMatchObject({ pointsEarned: undefined, pointsPossible: 50 });
	});
});

describe('grade self-check', () => {
	test('reproduces the server grade (92.98) with GradeCompass math', () => {
		// Only the two assignments that make up the server's category totals.
		const check = checkCourseGrade(
			buildCourse({
				...rawClass,
				classData: { ...classData, assignments: classData.assignments.filter((a) => [101, 102].includes(a.gradeBookId)) },
				contentItems: {
					responseData: {
						data: [
							{
								items: [
									lwo({ itemID: 101, due_date: '2026-09-02T08:00:00', points: '100', pointsPossible: '100.00' }),
									lwo({ itemID: 102, assignmentType: 'Projects', due_date: '2026-09-05T08:00:00', points: '51', pointsPossible: '57.00' })
								]
							}
						]
					}
				}
			})
		);
		expect(check).toMatchObject({ server: 92.98, matches: true, hiddenCount: 0 });
	});

	test('hidden work shows up as a point discrepancy, not as a listed assignment', () => {
		// Server Essays total is 100/100 but the only visible essay is 90/100.
		const check = checkCourseGrade(
			buildCourse({
				...rawClass,
				classData: {
					...classData,
					measureTypeGrades: [{ measureTypeId: 1, measureTypeWeight: 20, points: 100, pointsPossible: 110, calculatedMark: 'A' }],
					classGrades: [{ ...classData.classGrades[0], totalWeightedPercentage: (100 / 110) * 100 }],
					assignments: [gcdAssignment({ gradeBookId: 101, score: '90', maxValue: 100, pointsPossible: 100 })]
				},
				contentItems: { responseData: { data: [{ items: [lwo({ itemID: 101, points: '90', pointsPossible: '100.00' })] }] } }
			})
		);
		expect(check).toMatchObject({ matches: true, hiddenCount: 1 });
	});
});

describe('serverPercentage', () => {
	test('percent scale uses totalWeightedPercentage', () => {
		expect(serverPercentage(classData)).toBe(92.98);
	});

	test('0–4 rubric scale is rebuilt as a percentage from category totals', () => {
		const rubric: ClassData = {
			...classData,
			classGrades: [{ ...classData.classGrades[0], totalWeightedPercentage: 4, maxValue: 4 }],
			measureTypeGrades: [
				{ measureTypeId: 1, measureTypeWeight: 4.5, points: 20, pointsPossible: 20, calculatedMark: 'A' },
				{ measureTypeId: 2, measureTypeWeight: 18, points: 150, pointsPossible: 200, calculatedMark: 'B' }
			]
		};
		expect(serverPercentage(rubric)).toBeCloseTo(((4.5 * 1 + 18 * 0.75) / 22.5) * 100, 6);
	});

	test('total-points class without weighting uses points / possible', () => {
		const totals: ClassData = {
			...classData,
			isAssignmentWeightingOn: false,
			classGrades: [{ ...classData.classGrades[0], maxValue: 4, points: 45, pointsPossible: 50 }]
		};
		expect(serverPercentage(totals)).toBe(90);
		expect(buildCourse({ ...rawClass, classData: totals }).Marks!.Mark[0].GradeCalculationSummary).toBeNull();
	});
});

describe('toGradebook', () => {
	const raw: RawGradebook = {
		periods: [
			{ Name: 'Quarter 1', GU: 'a', MarkPeriods: [], OrgYearGU: 'o', schoolID: 1, defaultFocus: true },
			{ Name: 'Quarter 2', GU: 'b', MarkPeriods: [], OrgYearGU: 'o', schoolID: 1, defaultFocus: false }
		],
		periodIndex: 1,
		classes: [rawClass, { ...rawClass, classData: { ...classData, classGrades: [] } }],
		schedule: [],
		fetchedAt: 0
	};
	const gb = toGradebook(raw);

	test('ReportingPeriod is the period that was fetched, not the current one', () => {
		expect(gb.ReportingPeriod).toEqual({ _GradePeriod: 'Quarter 2', _Index: '1', _StartDate: '', _EndDate: '' });
		expect(gb.ReportingPeriods.ReportPeriod.map((p) => p._GradePeriod)).toEqual(['Quarter 1', 'Quarter 2']);
	});

	test('a class with no grade yet has Marks: null', () => {
		expect(gb.Courses.Course[1].Marks).toBeNull();
	});

	test('the student name is passed through formatted, or left out when unknown', () => {
		expect(gb._StudentName).toBeUndefined();
		expect(toGradebook({ ...raw, studentName: 'Student, Sam Q' })._StudentName).toBe('Sam Q Student');
	});
});

describe('formatStudentName', () => {
	test.each([
		['Student, Sam', 'Sam Student'],
		['  Student ,  Sam   Q ', 'Sam Q Student'],
		['Sam Student', 'Sam Student'],
		['Student,', 'Student']
	])('%j → %j', (input, expected) => {
		expect(formatStudentName(input)).toBe(expected);
	});
});

describe('buildScoreScale', () => {
	const rubric = [
		{ score: 'A', lowScore: 3.5 },
		{ score: 'B', lowScore: 2.75 },
		{ score: 'C', lowScore: 2 },
		{ score: 'D', lowScore: 1.5 },
		{ score: 'F', lowScore: 0 },
		{ score: 'I', lowScore: -1 },
		{ score: 'W', lowScore: -1 }
	];

	test('percent classes have no scale', () => {
		expect(buildScoreScale(classData)).toBeUndefined();
		expect(buildCourse(rawClass).Marks!.Mark[0]._ScoreScale).toBeUndefined();
	});

	test('a 0–4 rubric class gets its letter cutoffs, without non-grade letters', () => {
		const gcd: ClassData = {
			...classData,
			classGrades: [{ ...classData.classGrades[0], maxValue: 4, reportCardScoreTypeId: 59 }],
			reportCardScoreTypes: [
				{ id: 58, max: 100, details: [{ score: 'A', lowScore: 90 }] },
				{ id: 59, max: 4, details: [...rubric].reverse() }
			]
		};
		expect(buildScoreScale(gcd)).toEqual({
			max: 4,
			letters: [
				{ letter: 'A', low: 3.5 },
				{ letter: 'B', low: 2.75 },
				{ letter: 'C', low: 2 },
				{ letter: 'D', low: 1.5 },
				{ letter: 'F', low: 0 }
			]
		});
		expect(buildCourse({ ...rawClass, classData: gcd }).Marks!.Mark[0]._ScoreScale?.max).toBe(4);
	});
});
