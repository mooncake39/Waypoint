import { expect, test } from 'vitest';
import { normalizeDistrictUrl } from './district';

test('normalizes to https origin', () => {
	expect(normalizeDistrictUrl('https://xx-district-psv.edupoint.com/PXP2_Login.aspx?x=1')).toBe(
		'https://xx-district-psv.edupoint.com'
	);
	expect(normalizeDistrictUrl('xx-district-psv.edupoint.com')).toBe('https://xx-district-psv.edupoint.com');
});

test('expands a bare district code to edupoint.com', () => {
	expect(normalizeDistrictUrl('xx-district-psv')).toBe('https://xx-district-psv.edupoint.com');
	expect(normalizeDistrictUrl(' XX-DISTRICT-PSV ')).toBe('https://xx-district-psv.edupoint.com');
});

test('ignores whitespace and invisible characters from pasting', () => {
	expect(normalizeDistrictUrl(' ​https://xx-district-psv.edupoint.com﻿\n')).toBe(
		'https://xx-district-psv.edupoint.com'
	);
});

test('rejects http, private and loopback hosts', () => {
	for (const bad of ['http://x.edupoint.com', 'https://localhost', 'https://127.0.0.1', 'https://10.0.0.5', 'https://192.168.1.1', 'https://[::1]', 'not a url', 'bad_code'])
		expect(normalizeDistrictUrl(bad)).toBeUndefined();
});
