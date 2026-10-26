import { describe, expect, test } from 'vitest';
import { checkCourseGrade } from '../grades/check';
import { getCourseGrade } from '../grades/course';
import { parseSynergyAssignment } from '../grades/assignments';
import { demoRawGradebook } from './demo';
import { toGradebook } from './portal/map';

const now = new Date('2026-10-26T12:00:00');
const quarter1 = toGradebook(demoRawGradebook(undefined, now));
const course = (name: string) => quarter1.Courses.Course.find((c) => c._CourseName === name)!;
const assignment = (courseName: string, title: string) =>
	course(courseName).Marks!.Mark[0].Assignments!.Assignment.find((a) => a._Measure === title)!;

describe('demo gradebook', () => {
	test('defaults to Quarter 1 with three periods and a made-up student', () => {
		expect(quarter1.ReportingPeriod._GradePeriod).toBe('Quarter 1');
		expect(quarter1.ReportingPeriods.ReportPeriod.map((p) => p._GradePeriod)).toEqual([
			'Quarter 1',
			'Quarter 2',
			'Semester 1 Final'
		]);
		expect(quarter1._StudentName).toBe('Alex Rivera');
		expect(quarter1.Courses.Course).toHaveLength(6);
	});

	test("every class's calculated grade matches its demo 'portal' grade", () => {
		for (const c of quarter1.Courses.Course) {
			const check = checkCourseGrade(c);
			expect(check, c._CourseName).toBeDefined();
			expect(check!.matches, `${c._CourseName}: ${check!.calculated} vs ${check!.server}`).toBe(true);
		}
	});

	test('covers the special cases', () => {
		// Upcoming ungraded test and scaled lab score
		expect(assignment('AP Biology', 'Unit 3 Test: Cellular Respiration')._DisplayScore).toBe('Not Graded');
		expect(parseSynergyAssignment(assignment('AP Biology', 'Enzyme Lab Report')).unscaledPoints).toEqual({
			pointsEarned: 13,
			pointsPossible: 16
		});
		// Extra credit, not-for-grading, Yes/No, excused
		expect(parseSynergyAssignment(assignment('AP Biology', 'Bonus: Science Fair Visit')).extraCredit).toBe(true);
		expect(parseSynergyAssignment(assignment('English 11', 'Practice Thesis Paragraph')).notForGrade).toBe(true);
		expect(assignment('English 11', 'Signed Syllabus')._ScoreType).toBe('Yes / No');
		expect(parseSynergyAssignment(assignment('Precalculus', 'Problem Set 4')).notForGrade).toBe(true);
		// Total-points class has no categories; empty weighted category is kept
		expect(course('English 11').Marks!.Mark[0].GradeCalculationSummary).toBeNull();
		expect(
			course('US History').Marks!.Mark[0].GradeCalculationSummary!.AssignmentGradeCalc.find((c) => c._Type === 'Projects')
		).toMatchObject({ _Points: '0', _PointsPossible: '0' });
		// 0–4 rubric class
		expect(getCourseGrade(course('Orchestra'))?.scaleValue).toBeGreaterThan(3.5);
		// Hidden work: not listed, shows up as a point discrepancy
		expect(course('Spanish 3').Marks!.Mark[0].Assignments!.Assignment.some((a) => a._Measure === 'Makeup Quiz')).toBe(false);
		expect(checkCourseGrade(course('Spanish 3'))!.hiddenCount).toBe(1);
	});

	test('dates are relative to today, newest first', () => {
		const dates = course('AP Biology').Marks!.Mark[0].Assignments!.Assignment.map((a) => a._DueDate);
		expect(dates[0]).toBe('2026-10-30T08:00:00'); // the upcoming test, 4 days ahead
		expect(dates).toEqual([...dates].sort().reverse());
	});

	test('Quarter 2 has no grades yet; the semester repeats Quarter 1', () => {
		const q2 = toGradebook(demoRawGradebook(1, now));
		expect(q2.ReportingPeriod._GradePeriod).toBe('Quarter 2');
		expect(q2.Courses.Course.every((c) => c.Marks === null)).toBe(true);

		const s1 = toGradebook(demoRawGradebook(2, now));
		expect(s1.Courses.Course.map(getCourseGrade)).toEqual(quarter1.Courses.Course.map(getCourseGrade));
	});

	test('an unknown period falls back to Quarter 1', () => {
		expect(toGradebook(demoRawGradebook(9, now)).ReportingPeriod._Index).toBe('0');
	});
});
