# AMR Map Editor v0.10.6

## Wall visual + endpoint connectivity fix

- Wall uses a dedicated purple color (`#7c3aed`) so it is visually distinct from navigation Paths.
- Selected Wall uses amber (`#f59e0b`) instead of Path blue.
- Wall START/END handles use amber styling.
- `Building → Wall` now snaps to existing Wall START/END points.
- Hovering near a Wall endpoint shows an amber/green `SNAP` indicator and endpoint label.
- Clicking while the indicator is active uses the exact existing endpoint coordinate.
- Dragging a selected Wall START/END handle snaps to another Wall endpoint on drag end.
- Path snap highlight remains available.
- Floor / existing geometry still does not block active drawing tools.
