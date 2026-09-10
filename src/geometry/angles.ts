export const TAU = Math.PI * 2;

export function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

export function radiansToDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

/** Normalize an angle in radians to [-PI, PI). */
export function normalizeAngle(radians: number): number {
  if (!Number.isFinite(radians)) return 0;
  let a = (radians + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

/** Normalize degrees to [-180, 180). */
export function normalizeDegrees(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  let d = (degrees + 180) % 360;
  if (d < 0) d += 360;
  return d - 180;
}

export function headingLabel(radians: number): string {
  const deg = ((radiansToDegrees(normalizeAngle(radians)) % 360) + 360) % 360;
  if (deg >= 337.5 || deg < 22.5) return 'E (+X)';
  if (deg < 67.5) return 'NE';
  if (deg < 112.5) return 'N (+Y)';
  if (deg < 157.5) return 'NW';
  if (deg < 202.5) return 'W (-X)';
  if (deg < 247.5) return 'SW';
  if (deg < 292.5) return 'S (-Y)';
  return 'SE';
}
