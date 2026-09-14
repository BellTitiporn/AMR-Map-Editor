import { describe, expect, it } from 'vitest';
import { dedupeEndpointCandidates, snapPointToEndpointCandidates } from '../geometry/endpointSnapping';

describe('drawing endpoint snapping', () => {
  it('snaps a new line point to an existing endpoint inside the threshold', () => {
    const candidates = [
      { point: { x: 2, y: 3 }, sourceId: 'P-1', sourceKind: 'path' as const, endpoint: 'end' as const, label: 'P-1 END' },
    ];
    const result = snapPointToEndpointCandidates({ x: 2.12, y: 3.04 }, candidates, 0.25);
    expect(result.candidate?.sourceId).toBe('P-1');
    expect(result.point).toEqual({ x: 2, y: 3 });
  });

  it('does not snap when the nearest endpoint is outside the threshold', () => {
    const candidates = [
      { point: { x: 2, y: 3 }, sourceId: 'W-1', sourceKind: 'wall' as const, endpoint: 'start' as const },
    ];
    const result = snapPointToEndpointCandidates({ x: 2.5, y: 3 }, candidates, 0.25);
    expect(result.candidate).toBeNull();
    expect(result.point).toEqual({ x: 2.5, y: 3 });
  });

  it('chooses the nearest endpoint', () => {
    const candidates = [
      { point: { x: 0, y: 0 }, sourceId: 'A', sourceKind: 'wall' as const, endpoint: 'end' as const },
      { point: { x: 0.2, y: 0 }, sourceId: 'B', sourceKind: 'wall' as const, endpoint: 'start' as const },
    ];
    const result = snapPointToEndpointCandidates({ x: 0.16, y: 0 }, candidates, 0.25);
    expect(result.candidate?.sourceId).toBe('B');
    expect(result.point).toEqual({ x: 0.2, y: 0 });
  });

  it('deduplicates endpoints that already share the same coordinate', () => {
    const candidates = dedupeEndpointCandidates([
      { point: { x: 1, y: 1 }, sourceId: 'A', sourceKind: 'path' as const, endpoint: 'end' as const },
      { point: { x: 1, y: 1 }, sourceId: 'B', sourceKind: 'path' as const, endpoint: 'start' as const },
    ]);
    expect(candidates).toHaveLength(1);
  });
});
