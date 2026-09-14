# AMR Map Editor v0.10.2

## Added
- Draggable START and END handles for selected Building Walls.
- Live wall geometry update while dragging.
- START/END labels on selected wall endpoints.
- Cursor feedback (`grab` / `grabbing`) on endpoint handles.
- Building layer lock prevents endpoint editing.
- Wall endpoint drag participates in Undo/Redo through the existing command history.

## Preserved
- Numeric Length (m) editing.
- Angle (°) editing.
- Start / Center / End anchor editing from the Properties Inspector.
- `.building.yaml` export.
