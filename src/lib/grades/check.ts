// Handoff §10.5 self-check: recompute a course's grade the way GradeCompass's
// course page does and compare it with the server's grade. A mismatch means
// the conversion is wrong or the class uses a rule GradeCompass doesn't model
// (dropped scores, penalties, score caps, rigor points, rounding).

import type { Course } from '../types/Gradebook';
import {
	calculateAssignmentGPCs,
	calculateCourseGradePercentageFromCategories,
	calculateCourseGradePercentageFromTotals,
	getCalculableAssignments,
	getHiddenAssignmentsFromCategories,
	getPointsByCategory,
	gradesMatch,
	parseSynergyAssignment
} from './assignments';
import { getSynergyCourseAssignmentCategories } from './course';

export interface GradeCheck {
	course: string;
	server: number;
	calculated: number;
	matches: boolean;
	/** Point-discrepancy placeholders GradeCompass would show (hidden work). */
	hiddenCount: number;
}

export function checkCourseGrade(course: Course): GradeCheck | undefined {
	const mark = course.Marks?.Mark[0];
	if (!mark || mark._CalculatedScoreRaw === '') return undefined;

	const categories = getSynergyCourseAssignmentCategories(course);
	const gradeCategories = categories?.filter((c) => c.name !== 'TOTAL');

	const real = calculateAssignmentGPCs(
		(mark.Assignments?.Assignment ?? []).map(parseSynergyAssignment),
		gradeCategories
	);
	const hidden = categories
		? getHiddenAssignmentsFromCategories(categories, getPointsByCategory(getCalculableAssignments(real)))
		: [];

	const calculable = getCalculableAssignments([...hidden, ...real]);
	const calculated = gradeCategories
		? calculateCourseGradePercentageFromCategories(getPointsByCategory(calculable), gradeCategories)
		: calculateCourseGradePercentageFromTotals(calculable);

	const server = parseFloat(mark._CalculatedScoreRaw);
	return {
		course: course._CourseName,
		server,
		calculated,
		matches: gradesMatch(calculated, server) || Math.abs(calculated - server) < 0.01,
		hiddenCount: hidden.length
	};
}
