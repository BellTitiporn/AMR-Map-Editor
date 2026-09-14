# AMR Map Editor v0.10.3 — Draw-to-Endpoint Snap

## Added
- New Path can start or end on an existing Path START/END point.
- New Wall can start or end on an existing Wall START/END point.
- Existing navigation objects remain valid Path snap targets.
- Endpoint snap markers are visible while Path/Wall drawing tools are active.
- Nearest endpoint highlights when the pointer is inside the 0.25 m snap radius.
- Draft line preview follows the snapped endpoint before clicking.

## Interaction behavior
1. Activate **Path** or **Building → Wall**.
2. Move the pointer near an existing line endpoint.
3. The endpoint becomes highlighted in yellow.
4. Click to reuse the exact endpoint coordinate.
5. Continue drawing normally.

This avoids nearly-overlapping coordinates and keeps exported navigation/building topology clean.
