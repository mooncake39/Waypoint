import { describe, expect, test } from 'vitest';
import { extractJsObject, extractRemoteDataStore, htmlUnescape, parseLoginForm } from './extract';

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

describe('extractRemoteDataStore', () => {
	const id = '0F1E2D3C-4B5A-6978-8796-A5B4C3D2E1F0';

	test('reads both arguments verbatim, unescaping quotes', () => {
		const html = `var store = new DevExpress.PXPRemoteDataStore('${id}', '{"schoolName":"St. Mary\\'s High","orgYearGU":"<ORG>","AGU":"0"}');`;
		const store = extractRemoteDataStore(html);
		expect(store?.dataSourceId).toBe(id);
		expect(JSON.parse(store!.gridParameters)).toEqual({
			schoolName: "St. Mary's High",
			orgYearGU: '<ORG>',
			AGU: '0'
		});
	});

	test('returns undefined when absent or malformed', () => {
		expect(extractRemoteDataStore('<html>login</html>')).toBeUndefined();
		expect(extractRemoteDataStore(`PXPRemoteDataStore('not-a-guid', '{}')`)).toBeUndefined();
	});
});
