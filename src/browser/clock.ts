const STEP_MS = 100;
const MAX_STEPS = 8;

export function createClock(step: () => void) {
  let previous: number | undefined;
  let remainder = 0;
  let speed: 1 | 2 | 4 = 1;
  let paused = false;
  let hidden = false;

  function reset() {
    previous = undefined;
    remainder = 0;
  }

  return {
    reset,
    setPaused(value: boolean) {
      paused = value;
      reset();
    },
    setHidden(value: boolean) {
      hidden = value;
      reset();
    },
    setSpeed(value: 1 | 2 | 4) {
      speed = value;
    },
    frame(now: number) {
      if (paused || hidden) return 0;
      if (previous !== undefined) {
        remainder = Math.min(remainder + (now - previous) * speed, MAX_STEPS * STEP_MS);
      }
      previous = now;
      while (remainder >= STEP_MS) {
        step();
        remainder -= STEP_MS;
      }
      return remainder / STEP_MS;
    },
  };
}
