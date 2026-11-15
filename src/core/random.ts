export function seedNumber(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

export function randomInteger(state: number, minimum: number, maximum: number): [number, number] {
  // Mulberry32. Only the 32-bit state needs to be carried over to the next call.
  const next = (state + 0x6d2b79f5) >>> 0;
  let mixed = Math.imul(next ^ (next >>> 15), next | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  const fraction = ((mixed ^ (mixed >>> 14)) >>> 0) / 0x100000000;
  return [minimum + Math.floor(fraction * (maximum - minimum + 1)), next];
}
