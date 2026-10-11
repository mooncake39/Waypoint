import { describe, expect, test } from 'vitest';
import { extractJsObject, htmlUnescape, parseLoginForm } from './extract';

describe('extractJsObject', () => {
	const page = `<script>
var x = 1;
PXP.GBFocusData = {"Schools":[{"SchoolName":"A \\"quoted\\" {brace} school","GradingPeriods":[]}],"n":1};
PXP.GBCurrentFocus = {"FocusArgs":{"studentGU":"<STUDENT_GU>"}};
</script>`;

	test('extracts objects with braces and escaped quotes inside strings', () => {
		const data = extractJsObject<{ Schools: { SchoolName: string }[]; n: number }>(page, 'PXP.GBFocusData');
		expect(data?.Schools[0].SchoolName).toBe('A "quoted" {brace} school');
		expect(data?.n).toBe(1);
	});

	test('extracts a second object on the same page', () => {
		expect(extractJsObject<{ FocusArgs: { studentGU: string } }>(page, 'PXP.GBCurrentFocus')?.FocusArgs.studentGU).toBe('<STUDENT_GU>');
	});

	test('returns undefined when absent (e.g. login HTML)', () => {
		expect(extractJsObject('<html>login</html>', 'PXP.GBFocusData')).toBeUndefined();
	});
});

describe('parseLoginForm', () => {
	const html = `<form>
<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="abc&amp;def" />
<input type="hidden" name="__EVENTVALIDATION" value='xyz' />
<input name="ctl00$MainContent$username" type="text" />
<input name="ctl00$MainContent$password" type="password" />
<input type="checkbox" name="remember" />
<input type="submit" name="ctl00$MainContent$Submit1" value="Login" />
<input type="submit" name="other" value="Other" />
</form>`;

	test('detects hidden fields, credentials fields and the first submit', () => {
		const form = parseLoginForm(html);
		expect(form.usernameField).toBe('ctl00$MainContent$username');
		expect(form.passwordField).toBe('ctl00$MainContent$password');
		expect(form.fields).toEqual([
			['__VIEWSTATE', 'abc&def'],
			['__EVENTVALIDATION', 'xyz'],
			['ctl00$MainContent$Submit1', 'Login']
		]);
	});

	test('throws when there is no password field', () => {
		expect(() => parseLoginForm('<input name="u" type="text">')).toThrow();
	});
});

test('htmlUnescape', () => {
	expect(htmlUnescape('a&amp;b&#39;c&#x41;&quot;')).toBe(`a&b'cA"`);
});
