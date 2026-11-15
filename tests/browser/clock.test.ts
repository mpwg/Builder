import { expect, test } from 'vitest';
import { createClock } from '../../src/browser/clock';

test('hiddenTabDoesNotCatchUp', () => {
  let ticks = 0;
  const clock = createClock(() => ticks++);
  clock.frame(0);
  clock.frame(100);
  expect(ticks).toBe(1);

  clock.setHidden(true);
  clock.frame(50_000);
  expect(ticks).toBe(1);
  clock.setPaused(true);
  clock.setHidden(false);
  clock.frame(50_100);
  clock.frame(50_300);
  expect(ticks).toBe(1);

  clock.setPaused(false);
  clock.frame(50_400);
  expect(ticks).toBe(1);
  clock.frame(50_500);
  expect(ticks).toBe(2);
});

test('same simulation duration produces the same ticks at every speed', () => {
  for (const speed of [1, 2, 4] as const) {
    let ticks = 0;
    const clock = createClock(() => ticks++);
    clock.setSpeed(speed);
    for (let ms = 0; ms <= 4000 / speed; ms += 25) clock.frame(ms);
    expect(ticks).toBe(40);
  }
});

test('limits catch-up and discards excess at a stalled frame', () => {
  let ticks = 0;
  const clock = createClock(() => ticks++);
  clock.frame(0);
  clock.frame(10000);
  expect(ticks).toBe(8);
  clock.frame(10016);
  expect(ticks).toBe(8);
});
