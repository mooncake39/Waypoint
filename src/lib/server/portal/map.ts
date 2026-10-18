// Handoff §10–§11 (Option A): converts one raw refresh (GetClassData +
// LoadWithOptions + schedule per class) into GradeCompass's old `Gradebook`
// shape, so its UI and grade math can be reused unchanged. Pure; no I/O.

import type {
	AssignmentEntity,
	AssignmentGradeCalc,
	Course,
	Gradebook,
	Mark,
	ReportPeriod,
	ScoreScale
} from '../../types/Gradebook';
import type { RawClass, RawGradebook } from './gradebook';

// ---------- portal payload types (only the fields used here) ----------

interface ClassGrade {
	studentId: number;
	points: number;
	pointsPossible: number;
	totalWeightedPercentage: number;
	calculatedMark: string;
	manualMark: string;
	maxValue: number;
	reportCardScoreTypeId?: number;
}

interface MeasureType {
	id: number;
	name: string;
	weight: number;
}

interface MeasureTypeGrade {
	measureTypeId: number;
	measureTypeWeight: number;
	points: number;
	pointsPossible: number;
	calculatedMark: string;
}

interface GcdAssignment {
	gradeBookId: number;
	measureTypeId: number;
	category: string;
	gradeBookCategoryId: number;
	gradeBookScoreTypeId: number;
	score: string | null;
	maxValue: number;
	pointsPossible: number;
	dueDate: string;
	excused: boolean;
	isForGrading: boolean;
	hideInPortal: boolean;
	publicNote: string;
}

interface ScoreType {
	id: number;
	name: string;
	max: number;
	details: { score: string; value: number }[];
}

export interface ClassData {
	GradingPeriodName: string;
	isAssignmentWeightingOn: boolean;
	classGrades: ClassGrade[];
	measureTypes: MeasureType[];
	measureTypeGrades: MeasureTypeGrade[];
	assignments: GcdAssignment[];
	gradeBookCategories: { id: number; name: string }[];
	gradeBookScoreTypes: ScoreType[];
	reportCardScoreTypes?: {
		id: number;
		max: number;
		details: { score: string; lowScore: number }[];
	}[];
}

export interface LwoItem {
	itemID: number;
	itemType: string;
	title: string;
	assignmentType: string;
	due_date: string;
	pointsPossible: string;
	points: string;
	gradeMark: string;
	commentText: string;
	publicNote: string;
}

export interface ContentItems {
	responseData: { data: { items: LwoItem[] }[] };
}

// ---------- helpers ----------

/** Number → shortest string ("13.0000000000" and 13 both become "13"). */
const num = (n: number) => String(Number(n));

const NUMERIC = /^\s*-?\d+(\.\d+)?\s*$/;

function parseNumber(s: string | null | undefined) {
	return s !== null && s !== undefined && NUMERIC.test(s) ? parseFloat(s) : undefined;
}

export function lwoItems(contentItems: unknown): LwoItem[] {
	const groups = (contentItems as ContentItems | null)?.responseData?.data ?? [];
	return groups.flatMap((g) => g.items ?? []).filter((i) => i.itemType === 'GradeBookItem');
}

/** Category name for a GCD measure type, falling back to whatever the item itself says. */
function categoryName(gcd: ClassData, measureTypeId: number | undefined, ...fallbacks: (string | undefined)[]) {
	const fromId = gcd.measureTypes.find((m) => m.id === measureTypeId)?.name;
	return (fromId ?? fallbacks.find((f) => f) ?? '').trim();
}

/**
 * The class grade as a percentage. Classes on a non-percent report-card scale
 * (e.g. Rubric 0–4) report `totalWeightedPercentage` on that scale, so the
 * percentage is rebuilt from the category or point totals instead.
 */
export function serverPercentage(gcd: ClassData): number | undefined {
	const cg = gcd.classGrades[0];
	if (!cg) return undefined;
	if (cg.maxValue === 100) return cg.totalWeightedPercentage;

	if (gcd.isAssignmentWeightingOn) {
		const graded = gcd.measureTypeGrades.filter((m) => m.pointsPossible > 0);
		const weight = graded.reduce((s, m) => s + m.measureTypeWeight, 0);
		if (weight === 0) return undefined;
		return (
			(graded.reduce((s, m) => s + m.measureTypeWeight * (m.points / m.pointsPossible), 0) / weight) *
			100
		);
	}
	return cg.pointsPossible > 0 ? (cg.points / cg.pointsPossible) * 100 : undefined;
}

/**
 * The class's report-card scale when it isn't a percentage (e.g. Rubric 0–4),
 * with its letter cutoffs. Rows with a negative low score (I, P, W, …) are not grades.
 */
export function buildScoreScale(gcd: ClassData): ScoreScale | undefined {
	const cg = gcd.classGrades[0];
	if (!cg || cg.maxValue === 100) return undefined;
	const type = gcd.reportCardScoreTypes?.find((t) => t.id === cg.reportCardScoreTypeId);
	const letters = (type?.details ?? [])
		.filter((d) => d.lowScore >= 0)
		.map((d) => ({ letter: d.score, low: d.lowScore }))
		.sort((a, b) => b.low - a.low);
	return letters.length ? { max: cg.maxValue, letters } : undefined;
}

// ---------- categories (§10.3) ----------

export function buildCategories(gcd: ClassData): AssignmentGradeCalc[] | null {
	if (!gcd.isAssignmentWeightingOn) return null;

	const rows: AssignmentGradeCalc[] = [];
	const seen = new Set<number>();
	const add = (id: number, weight: number, points: number, possible: number, mark: string) => {
		if (seen.has(id)) return;
		seen.add(id);
		rows.push({
			_Type: categoryName(gcd, id, gcd.assignments.find((a) => a.measureTypeId === id)?.category),
			_Weight: `${num(weight)}%`,
			_Points: num(points),
			_PointsPossible: num(possible),
			_WeightedPct: possible > 0 ? `${((weight * points) / possible).toFixed(2)}%` : '0.00%',
			_CalculatedMark: mark ?? ''
		});
	};

	// Categories with graded work, with the server's totals.
	for (const m of gcd.measureTypeGrades)
		add(m.measureTypeId, m.measureTypeWeight, m.points, m.pointsPossible, m.calculatedMark);

	// Categories that only have ungraded or hidden-from-totals work, so hypothetical
	// assignments can be added to them. Unrelated measure types (weight 0, unused) are left out.
	const used = new Set(gcd.assignments.map((a) => a.measureTypeId));
	for (const m of gcd.measureTypes)
		if (used.has(m.id) || m.weight > 0) add(m.id, m.weight, 0, 0, '');

	return rows;
}

// ---------- assignments (§10.1–§10.2) ----------

function buildAssignment(
	gcd: ClassData,
	item: LwoItem | undefined,
	a: GcdAssignment | undefined,
	studentId: string
): AssignmentEntity {
	const catKind = gcd.gradeBookCategories.find((c) => c.id === a?.gradeBookCategoryId)?.name ?? '';
	const extraCredit = catKind.toLowerCase() === 'extra credit';
	const notForGrade =
		a?.isForGrading === false || catKind.toLowerCase() === 'not for grading' || a?.excused === true;
	const scoreType = gcd.gradeBookScoreTypes.find((t) => t.id === a?.gradeBookScoreTypeId);

	const pointsPossible = parseNumber(item?.pointsPossible) ?? a?.pointsPossible ?? 0;

	// LWO `points` is already converted to points ("" when ungraded). Without an
	// LWO item, fall back to the GCD score (§10.2; unverified for non-raw types).
	let pointsEarned: number | undefined;
	if (item) pointsEarned = parseNumber(item.points);
	else if (a?.score !== null && a?.score !== undefined) {
		const raw = parseNumber(a.score);
		if (raw !== undefined) pointsEarned = raw;
		else if (scoreType) {
			const value = scoreType.details.find((d) => d.score.toLowerCase() === a.score!.toLowerCase())?.value;
			if (value !== undefined && scoreType.max) pointsEarned = (value / scoreType.max) * a.pointsPossible;
		}
	}
	const graded = pointsEarned !== undefined;

	// The raw (unscaled) score only makes sense when it is numeric. For Yes/No,
	// letter or rubric scores it is set equal to the points so GradeCompass
	// doesn't treat it as a scaled score and parse "y" as a number.
	const rawScore = parseNumber(a?.score);
	const numericRaw = graded && rawScore !== undefined && a !== undefined;
	const scoreCal = !graded ? undefined : numericRaw ? num(rawScore!) : num(pointsEarned!);
	const scoreMax = !graded ? undefined : numericRaw ? num(a!.maxValue) : num(pointsPossible);

	const display = !graded
		? 'Not Graded'
		: numericRaw
			? `${num(rawScore!)} out of ${num(a!.maxValue)}`
			: (item?.gradeMark || a?.score || num(pointsEarned!)).toUpperCase();

	const comment = (item?.commentText || item?.publicNote || a?.publicNote || '').trim();
	const date = item?.due_date || a?.dueDate || '';

	return {
		Resources: null,
		Standards: null,
		_GradebookID: String(item?.itemID ?? a!.gradeBookId),
		_Measure: (item?.title || a?.category || 'Assignment').trim(),
		_Type: categoryName(gcd, a?.measureTypeId, a?.category, item?.assignmentType),
		_Date: date,
		_DueDate: date,
		_DisplayScore: display,
		_ScoreCalValue: scoreCal,
		_ScoreMaxValue: scoreMax,
		_ScoreType: scoreType?.name ?? 'Raw Score',
		_Points: graded ? `${num(pointsEarned!)} / ${num(pointsPossible)}` : `${num(pointsPossible)} Points Possible`,
		_Point: graded ? num(pointsEarned!) : undefined,
		_PointPossible: extraCredit ? '' : num(pointsPossible),
		_Notes: (notForGrade ? '(Not For Grading) ' : '') + comment,
		_MeasureDescription: '',
		_TeacherID: '',
		_StudentID: studentId,
		_HasDropBox: false,
		_DropStartDate: '',
		_DropEndDate: '',
		_TimeSincePost: '',
		_TotalSecondsSincePost: ''
	};
}

/**
 * Merges LWO items (titles, all items incl. ungraded) with GCD results (scores,
 * flags) on itemID = gradeBookId. Hidden-in-portal work is dropped; its points
 * surface as a discrepancy via GradeCompass's getHiddenAssignmentsFromCategories.
 * Sorted newest first, because GradeCompass's calculator replays the list reversed.
 */
export function buildAssignments(gcd: ClassData, items: LwoItem[]): AssignmentEntity[] {
	const studentId = String(gcd.classGrades[0]?.studentId ?? '');
	const byId = new Map(gcd.assignments.map((a) => [a.gradeBookId, a]));
	const itemIds = new Set(items.map((i) => i.itemID));

	const merged = [
		...items.map((item) => ({ item, a: byId.get(item.itemID) })),
		...gcd.assignments.filter((a) => !itemIds.has(a.gradeBookId)).map((a) => ({ item: undefined, a }))
	].filter(({ a }) => !a?.hideInPortal);

	return merged
		.map(({ item, a }) => buildAssignment(gcd, item, a, studentId))
		.sort((x, y) => {
			const dx = new Date(x._DueDate).getTime() || 0;
			const dy = new Date(y._DueDate).getTime() || 0;
			return dy - dx || Number(y._GradebookID) - Number(x._GradebookID);
		});
}

// ---------- course and gradebook (§11) ----------

export function buildCourse(raw: RawClass): Course {
	const gcd = raw.classData as ClassData | null;
	const name = raw.info.Name.trim();
	const cg = gcd?.classGrades?.[0];

	let mark: Mark | undefined;
	if (gcd && cg) {
		const assignments = buildAssignments(gcd, lwoItems(raw.contentItems));
		const percentage = serverPercentage(gcd);
		mark = {
			StandardViews: null,
			GradeCalculationSummary: gcd.isAssignmentWeightingOn
				? { AssignmentGradeCalc: buildCategories(gcd) ?? [] }
				: null,
			Assignments: assignments.length ? { Assignment: assignments } : null,
			AssignmentsSinceLastAccess: null,
			_MarkName: gcd.GradingPeriodName,
			_ShortMarkName: gcd.GradingPeriodName,
			// A teacher's manual override is what the portal shows.
			_CalculatedScoreString: cg.manualMark || cg.calculatedMark,
			_CalculatedScoreRaw: percentage === undefined ? '' : num(percentage),
			_ScoreScale: buildScoreScale(gcd)
		};
	}

	return {
		Marks: mark ? { Mark: [mark] } : null,
		_Period: raw.schedule?.period ?? '',
		_Title: `${name} (${raw.info.ID})`,
		_CourseName: name,
		_CourseID: String(raw.info.ID),
		_Room: raw.schedule?.room ?? '',
		_Staff: raw.info.TeacherName,
		_StaffEMail: raw.schedule?.teacherEmail ?? '',
		_StaffGU: '',
		_ImageType: '',
		_HighlightPercentageCutOffForProgressBar: '',
		_UsesRichContent: true
	};
}

/** Portal names may be "Last, First Middle"; show them as "First Middle Last". */
export function formatStudentName(name: string) {
	const clean = name.trim().replace(/\s+/g, ' ');
	const comma = clean.indexOf(',');
	if (comma < 0) return clean;
	const last = clean.slice(0, comma).trim();
	const first = clean.slice(comma + 1).trim();
	return first ? `${first} ${last}` : last;
}

export function toGradebook(raw: RawGradebook): Gradebook {
	const periods: ReportPeriod[] = raw.periods.map((p, i) => ({
		_GradePeriod: p.Name,
		_Index: String(i),
		_StartDate: '',
		_EndDate: ''
	}));

	return {
		ReportingPeriods: { ReportPeriod: periods },
		// The period actually returned, not always the current one: the client
		// files each response under ReportingPeriod._Index.
		ReportingPeriod: periods[raw.periodIndex],
		Courses: { Course: raw.classes.map(buildCourse) },
		'_xmlns:xsd': '',
		'_xmlns:xsi': '',
		_Type: '',
		_ErrorMessage: '',
		_HideStandardGraphInd: false,
		_HideMarksColumnElementary: false,
		_HidePointsColumnElementary: false,
		_HidePercentSecondary: false,
		_DisplayStandardsData: false,
		_GBStandardsTabDefault: false,
		_StudentName: raw.studentName ? formatStudentName(raw.studentName) : undefined
	};
}
