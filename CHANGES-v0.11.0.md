# AMR Map Editor v0.11.0 — RMF Bundle + Heading Handoff

## Added

### RMF Bundle Export

New Export option:

```text
RMF Bundle (.zip: building + PNG + navigation)
```

The ZIP contains:

```text
<base>.building.yaml
<base>.png
<base>-navigation.json
README.txt
```

### Heading / Yaw Preservation

Traffic Editor does not render the custom `amr_yaw` vertex parameter as a waypoint heading arrow.

AMR Map Editor therefore keeps two representations:

1. `.building.yaml`
   - keeps `amr_yaw` as a custom vertex property
   - used by Traffic Editor / RMF graph editing

2. `-navigation.json`
   - keeps `yaw` in radians in ROS `map` frame
   - also exports `headingDegrees` for inspection/debugging
   - intended for Fleet Manager / Nav2 / robot integration

Example:

```json
{
  "id": "CHARGE-01",
  "x": 2.0,
  "y": 3.0,
  "yaw": 1.5707963267948966,
  "headingDegrees": 90
}
```

## Preserved

- v0.10.9 reference-image coordinate conversion
- RMF PNG scale/measurement fix
- Building/Wall/Door/Floor/Path export
- Path and Wall snapping
- Object placement over Floor
