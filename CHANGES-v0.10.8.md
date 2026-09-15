# AMR Map Editor v0.10.8

## Interaction policy refactor

Pointer-event rules are centralized in `src/map-engine/interactionPolicy.ts`.
Existing geometry captures pointer events only during normal Select mode. While
placing Navigation Objects or using drawing tools, clicks reach the Stage.

This preserves:
- Pickup / Drop-off / Waypoint / Station placement over Floor Areas
- Path drawing over Floor / Zones / existing Paths
- Select/edit behavior when using Select Tool

## Unified snap engine

`src/geometry/snapEngine.ts` now provides shared snapping for:
- Navigation objects
- Path vertices
- Path segments
- Wall endpoints
- Wall segments

Path and Wall drawing no longer keep separate snap-search implementations in
`MapCanvas.tsx`.

## Door snap + auto alignment to Wall

When using `Building → Door`:
1. Move close to a Wall endpoint or segment.
2. A blue/amber `DOOR SNAP` highlight appears.
3. The first click snaps to the Wall and remembers that Wall.
4. The second point prefers the same Wall, keeping the Door collinear with it.

The second-click tolerance is slightly wider after the first Wall anchor is
established, making normal door-width placement easier without losing the Wall
association.

## Tests

Added:
- `src/__tests__/interactionPolicy.test.ts`
- `src/__tests__/snapEngine.test.ts`
