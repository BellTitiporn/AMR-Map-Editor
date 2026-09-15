import { describe, expect, it } from 'vitest';
import { entityLayersInteractive } from '../map-engine/interactionPolicy';

describe('entityLayersInteractive', () => {
  it('allows existing entities to receive events in normal select mode', () => {
    expect(entityLayersInteractive({ tool: 'select', placementObject: null })).toBe(true);
  });

  it('lets Stage receive clicks while placing a navigation object', () => {
    expect(entityLayersInteractive({ tool: 'select', placementObject: 'pickup' })).toBe(false);
    expect(entityLayersInteractive({ tool: 'select', placementObject: 'dropoff' })).toBe(false);
  });

  it('lets Stage receive clicks for drawing tools', () => {
    expect(entityLayersInteractive({ tool: 'path', placementObject: null })).toBe(false);
    expect(entityLayersInteractive({ tool: 'building', placementObject: null })).toBe(false);
  });
});
