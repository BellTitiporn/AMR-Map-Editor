# AMR Map Editor v0.10.7

## Fixed — Navigation Object Placement over Floor / Building Geometry

Pickup, Drop-off and other Navigation Objects can now be placed on top of an existing Floor Area.

### Root cause
Object creation uses `placementObject` while the editor can still be in `select` mode.
Building/Floor, Zone, Path and Object layers previously listened for pointer events whenever
`tool === 'select'`, so a Floor polygon could consume the click before the Stage placement
handler received it.

### Change
Existing entity layers now listen only when:

```ts
e.tool === 'select' && !e.placementObject
```

While an object placement mode is active, clicks pass through to the Stage and create the object.

### Applies to
- Waypoint
- Home
- Charging Station
- Docking Station
- Pickup
- Drop-off
- Waiting
- Parking

### Preserved
- Floor selection/editing in normal Select mode
- Wall endpoint dragging
- Path snap highlight
- Wall endpoint snap/highlight
- Drawing Path over Floor
- Zone and Building tools
