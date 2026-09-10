import { describe, expect, it } from 'vitest';
import { degreesToRadians, headingLabel, normalizeAngle, radiansToDegrees } from '../geometry/angles';

describe('angle helpers', () => {
  it('converts degrees and radians round-trip', () => {
    expect(radiansToDegrees(degreesToRadians(90))).toBeCloseTo(90, 10);
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 10);
  });

  it('normalizes angle to [-pi, pi)', () => {
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(-Math.PI, 10);
    expect(normalizeAngle(-Math.PI * 2)).toBeCloseTo(0, 10);
  });

  it('labels cardinal headings in world coordinates', () => {
    expect(headingLabel(0)).toBe('E (+X)');
    expect(headingLabel(Math.PI / 2)).toBe('N (+Y)');
    expect(headingLabel(Math.PI)).toBe('W (-X)');
    expect(headingLabel(-Math.PI / 2)).toBe('S (-Y)');
  });
});
