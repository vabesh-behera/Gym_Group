// Deterministic seeded PRNG helpers, used so demo figures (deltas, jitter) are
// stable across renders/requests instead of re-randomizing on every request.

function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRandom(seed: string): number {
  const rng = mulberry32(hashSeed(seed));
  return rng();
}

export function seededRange(seed: string, min: number, max: number): number {
  return min + seededRandom(seed) * (max - min);
}
