# RMF Path Orientation Patch

This patch adds RMF Traffic Editor lane `orientation` support.

## Values

- `None` -> `orientation: [1, ""]`
- `Forward` -> `orientation: [1, forward]`
- `Backward` -> `orientation: [1, backward]`

## Files

1. `MapCanvas.orientation.tsx`
   - New paths start with `orientation: ''`.
   - Displays an orientation badge when forward/backward is set.

2. `buildingExporter.orientation.ts`
   - Exports `path.orientation` into the RMF lane `orientation` property.

3. `NavigationPath-model.patch.txt`
   - Add `orientation?: '' | 'forward' | 'backward'` to `NavigationPath`.

4. `PathProperties-orientation.patch.tsx`
   - Add None / Forward / Backward buttons to the Path Properties panel.

## Expected YAML

```yaml
orientation:
  - 1
  - forward
```

or

```yaml
orientation:
  - 1
  - backward
```
