# Canvas Pointer Interaction Fix

## Fixed
- Floor Area no longer blocks Path drawing.
- Building geometry no longer captures canvas clicks while Path, Zone, Measure, Brush, or another drawing tool is active.
- Existing Zones, Paths, and Navigation Objects no longer block the active drawing tool.
- Select mode still allows selecting/editing existing entities.
- Wall endpoint dragging remains available in Select mode.

## Technical change
Only `src/components/editor/MapCanvas.tsx` behavior was modified for this fix.
Existing entity layers now listen for pointer events only while `tool === 'select'`.

This full project is based on the available v0.10.2 source snapshot.
