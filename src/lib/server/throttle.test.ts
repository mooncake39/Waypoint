import { expect, test } from 'vitest';
import { AttemptThrottle, accountKey } from './throttle';

function clock(start = 0) {
	let t = start;
	return { now: () => t, advance: (ms: number) => (t += ms) };
}

test('allows one attempt per key every interval', () => {
	const c = clock();
	const throttle = new AttemptThrottle(3000, c.now);

	expect(throttle.take('a')).toBe(0);
	c.advance(1000);
	expect(throttle.take('a')).toBe(2000);
	c.advance(1999);
	expect(throttle.take('a')).toBe(1);
	c.advance(1);
	expect(throttle.take('a')).toBe(0);
});

test('a rejected attempt does not push the next allowed time back', () => {
	const c = clock();
	const throttle = new AttemptThrottle(3000, c.now);
	throttle.take('a');
	for (let i = 0; i < 5; i++) {
		c.advance(500);
		expect(throttle.take('a')).toBeGreaterThan(0);
	}
	c.advance(500); // 3 s after the first, allowed one
	expect(throttle.take('a')).toBe(0);
});

test('accounts are independent', () => {
	const throttle = new AttemptThrottle(3000, clock().now);
	expect(throttle.take('a')).toBe(0);
	expect(throttle.take('b')).toBe(0);
});

test('sweep drops expired entries', () => {
	const c = clock();
	const throttle = new AttemptThrottle(3000, c.now);
	throttle.take('a');
	throttle.take('b');
	c.advance(3000);
	throttle.take('c');
	throttle.sweep();
	expect(throttle.size).toBe(1);
});

test('accountKey ignores capitals and surrounding spaces in the username', () => {
	expect(accountKey('https://d.edupoint.com', ' Sam.Student ')).toBe(
		accountKey('https://d.edupoint.com', 'sam.student')
	);
	expect(accountKey('https://a.edupoint.com', 'sam')).not.toBe(accountKey('https://b.edupoint.com', 'sam'));
});
