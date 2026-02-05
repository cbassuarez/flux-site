function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededIndex(
  seed: number,
  docstep: number,
  length: number,
  offset = 0,
) {
  if (length <= 0) {
    return 0;
  }
  const base =
    (Math.imul(seed + offset, 0x9e3779b1) ^
      Math.imul(docstep + offset, 0x85ebca6b)) >>> 0;
  const rand = mulberry32(base)();
  return Math.floor(rand * length);
}

export function seededFloat(
  seed: number,
  docstep: number,
  min: number,
  max: number,
  offset = 0,
) {
  const clampedMin = Number.isFinite(min) ? min : 0;
  const clampedMax = Number.isFinite(max) ? max : 1;
  const base =
    (Math.imul(seed + offset, 0x27d4eb2d) ^
      Math.imul(docstep + offset, 0x165667b1)) >>> 0;
  const rand = mulberry32(base)();
  return clampedMin + (clampedMax - clampedMin) * rand;
}
