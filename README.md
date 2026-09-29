# AMR Map Editor

**Engineering Guide & README**  
Documentation update: 2026-09-23  
Current frontend package version: **v0.11.7**

AMR Map Editor is a CAD/GIS-style web application for creating, editing, validating, and exporting navigation maps for Autonomous Mobile Robots (AMRs), ROS2, Fleet Manager, and Open-RMF / Traffic Editor workflows.

> This README consolidates the engineering guide with the features currently implemented in the frontend, including Keepout Zone export, RMF nav graphs, RMF Bundle generation, and PostgreSQL-backed project revisions through the companion backend API.

---

## 1. Highlights

- Import ROS occupancy maps from `map.yaml` + `map.pgm` / PNG.
- Edit occupancy raster with Freehand, Line, Rectangle, Polygon, and Eraser tools.
- Create navigation objects: Waypoint, Home, Charging Station, Docking Station, Pickup, Drop-off, Waiting, and Parking.
- Create Normal, Preferred, One-way, Bidirectional, and Restricted paths.
- Create No-Go, **Keepout**, Slow, Restricted, Parking, Loading, Unloading, Human Traffic, and Safety zones.
- Create RMF building geometry: Wall, Door, Floor Area, Model, and Measurement.
- Configure robot footprint, safety margin, clearance, turning radius, and max speed.
- Validate navigation geometry and topology.
- Export ROS maps, navigation JSON, GeoJSON, RMF `.building.yaml`, RMF nav graphs, RMF Bundle, Keepout masks, and reference-coordinate YAML.
- Save `.amrmap` + RMF Bundle revisions to PostgreSQL through the configured backend API.

## 2. Quick Start

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Tests:

```bash
npm test
```

Typical workflow:

```text
Import Map
  -> Clean / Edit Occupancy Map
  -> Add Navigation Objects
  -> Create Paths
  -> Create Zones
  -> Create / Verify RMF Floor Geometry
  -> Configure Robot
  -> Preview
  -> Validate
  -> Save
  -> Export
```

## 3. Coordinate Conventions

The editor uses several coordinate spaces.

| Space | Purpose |
|---|---|
| Screen | Browser / pointer interaction |
| Pixel | Occupancy image pixels |
| World | ROS / robot map coordinates in meters |
| RMF reference image | Traffic Editor `.building.yaml` geometry |

Navigation objects, paths, zones, and building geometry are internally stored in **world coordinates in meters**.

Heading convention:

```text
0 rad       = 0 deg   = East  (+X)
+pi/2 rad   = 90 deg  = North (+Y)
pi rad      = 180 deg = West  (-X)
-pi/2 rad   = -90 deg = South (-Y)
```

### RMF reference-image conversion

The RMF building exporter uses the same `worldToReferenceImage()` conversion for building vertices and automatically generated reference coordinates.

```text
world / robot coordinate
        |
        +--> GeoJSON / robot coordinate
        |
        +--> worldToReferenceImage(...)
                 |
                 +--> RMF building vertex
                 +--> reference_coordinates.rmf[]
```

This guarantees that `rmf[i]` and `robot[i]` represent the **same physical point** in different coordinate systems.

## 4. Navigation Objects

After creating an object, the Properties panel supports:

- Name
- ID
- Type
- X / Y position
- Heading in degrees
- Yaw in radians
- Description
- Enabled state

### Pickup

Pickup objects include the additional RMF property `pickup_dispenser`.

```yaml
pickup_dispenser: [1, "dispenser_name"]
```

### Drop-off

Drop-off objects include `dropoff_ingestor`.

```yaml
dropoff_ingestor: [1, "ingestor_name"]
```

If the dedicated field is empty, the exporter may fall back to the object name / ID according to the current exporter logic.

## 5. Paths: Travel Direction vs Lane Orientation

These are separate concepts.

### Travel Direction

Controls whether the lane can be traversed one way or both ways.

```text
One-way:      A -----> B
Bidirectional A <----> B
```

In RMF lane parameters:

```yaml
bidirectional: [4, false]   # one-way
```

or:

```yaml
bidirectional: [4, true]    # two-way
```

### Lane Orientation

Controls the robot heading constraint while traversing the lane.

Available values:

- None
- Forward
- Backward

Exported as:

```yaml
orientation: [1, ""]
orientation: [1, forward]
orientation: [1, backward]
```

The map canvas displays a dedicated orientation arrow when `forward` or `backward` is set.

**Travel direction is not the same as robot orientation.** A two-way lane can still carry an orientation constraint.

## 6. Path Connectivity

A path visually crossing another path is **not automatically connected**. True connectivity requires shared topology / coordinates.

The editor supports:

- Endpoint snapping to navigation objects.
- Endpoint snapping to existing path vertices.
- Endpoint snapping to path segments.
- Automatic junction insertion when dropping an endpoint onto the middle of another path.
- Start / End connection status.
- Connect Start / End / Both.
- Merge with a compatible path.
- Reverse Direction / Reverse Vertices.

Green `CONNECTED` markers indicate actual topology connections rather than only visual overlap.

## 7. Building Geometry

### Wall

Supports Start / End X,Y, Length, Angle, Resize Anchor, Texture, Height / Width, Texture Scale, Alpha, and Enabled.

### Door

Supports Door Type, Motion Axis, Motion Degrees, Motion Direction, Plugin, and Right / Left Ratio.

### Floor Area

Floor polygons are used by the RMF building exporter and are also the source for **automatic reference-coordinate generation**.

### Model

Supports model name, pose, static state, and dispensable state.

### Measurement

Used for scale / distance metadata in RMF export.

## 8. RMF `.building.yaml` Export

The current exporter targets Traffic Editor style:

```yaml
coordinate_system: reference_image
```

Main structure:

```yaml
coordinate_system: reference_image
crowd_sim: ...
graphs: {}
levels:
  L1:
    constraints: []
    drawing:
      filename: <map>.png
    elevation: 0
    features: []
    floors: ...
    lanes: ...
    layers: ...
    measurements: ...
    vertices: ...
    walls: ...
lifts: {}
name: <map_name>
```

The exporter converts internal world-meter geometry into reference-image coordinates using map resolution, ROS origin, origin yaw, and image Y-axis conversion.

Keep the exported `.building.yaml` and referenced PNG together.

## 9. GeoJSON Export

GeoJSON export follows the current graph-oriented reference format.

```json
{
  "crs": {
    "type": "name",
    "properties": {
      "name": "urn:ogc:def:crs:EPSG::3857"
    }
  },
  "type": "FeatureCollection",
  "name": "graph",
  "features": []
}
```

Graph points are exported as Point features. Directed path edges use `id`, `startid`, `endid`, `cost`, and `overridable`.

A bidirectional path creates forward and reverse edge records. A one-way path creates only the stored forward edge.

## 10. Automatic RMF <-> Robot Reference Coordinates

Reference coordinates are generated automatically. Manual coordinate entry is not required.

### Source

The exporter:

1. Finds enabled Floor polygons with at least 4 unique vertices.
2. Selects the largest enabled Floor as the reference geometry.
3. Chooses exactly **4 principal outer corners**.
4. Uses the same four physical points for both coordinate systems.

Export order:

```text
1. Top-left
2. Top-right
3. Bottom-right
4. Bottom-left
```

`robot[]` contains the Floor/world coordinates used on the robot / GeoJSON side.

`rmf[]` contains the same points after `worldToReferenceImage()` conversion.

Therefore:

```text
rmf[0]   <-> robot[0]   Top-left
rmf[1]   <-> robot[1]   Top-right
rmf[2]   <-> robot[2]   Bottom-right
rmf[3]   <-> robot[3]   Bottom-left
```

### Output format

The exporter intentionally writes each coordinate pair in compact flow style:

```yaml
reference_coordinates:
  automation_room1:
    rmf:
      - [-0.257426175713, -0.234604896665]
      - [159.950112688115, -0.131773041364]
      - [159.924785241558, 96.868364927862]
      - [-0.063116205376, 96.868211585931]
    robot:
      - [-5.192871308786, 3.331730244833]
      - [2.817505634406, 3.326588652068]
      - [2.816239262078, -1.523418246393]
      - [-5.183155810269, -1.523410579297]
```

The numeric values above are examples only. The application generates values from the current map.

The compact `[x, y]` writer is used intentionally instead of generic block-array YAML formatting.

## 11. RMF Bundle

The current RMF Bundle exporter creates a deployment ZIP with a fixed internal base name of `map`:

```text
map.building.yaml
map.png
map.pgm
map.yaml
map_keepout.png
map_keepout.yaml
nav_graphs/
  0.yaml
  1.yaml        # when additional graph indices are used
  ...
```

Requirements:

- A valid occupancy map image must be loaded.
- Map width, height, and resolution must be valid.
- At least one enabled path with 2 or more points must exist so a nav graph can be generated.

The downloaded ZIP name uses the filename entered in the Export dialog, for example:

```text
WB220126_Floor3-rmf-bundle.zip
```

The files **inside** the ZIP still use the deployment names shown above (`map.*`, `map_keepout.*`, `nav_graphs/*`).

### Keepout mask

Only enabled zones whose type is `keepout` are painted into `map_keepout.png`. The mask uses:

```text
White = free
Black = keepout / occupied
```

`map_keepout.yaml` references `map_keepout.png` and uses the current map resolution and ROS origin with `negate: 0` and `mode: trinary`.

### RMF nav graphs

Each enabled path is assigned to its configured graph index. The bundle exports one YAML file per graph index:

```text
nav_graphs/<graphIndex>.yaml
```

## 12. Export Formats

| Output | Use |
|---|---|
| `.amrmap` | Reopen and continue editing a full project |
| ROS Map ZIP | `map.yaml` + occupancy map |
| Occupancy PNG | Preview / RMF reference image |
| PGM | ROS occupancy map |
| YAML | ROS map metadata |
| Waypoints JSON | Navigation objects |
| Paths JSON | Navigation paths |
| Zones JSON | Zone definitions |
| Navigation JSON | Objects + paths + zones + robot config |
| GeoJSON | Graph / coordinate exchange |
| `.building.yaml` | Open-RMF / Traffic Editor |
| Reference Coordinates YAML | RMF <-> robot coordinate correspondence |
| RMF Nav Graphs ZIP | `nav_graphs/<graphIndex>.yaml` files |
| RMF Bundle ZIP | `map.building.yaml` + PNG + PGM + ROS YAML + Keepout mask + nav graphs |

## 13. Validation

Validation should be run before deployment / export.

### Objects

- Outside map
- Inside obstacle
- Duplicate IDs

### Paths

- Obstacle intersection
- No-Go / Keepout intersection
- Narrow path vs robot footprint
- Disconnected path
- Zero-length segments
- Visual crossing without a topology junction

### Zones

- Invalid polygon
- Self-intersection
- Outside map
- Conflicting zones

### Robot clearance

Checks footprint + safety margin against map restrictions.

## 14. Save / Open / Database

### Local project persistence

Projects are saved locally through IndexedDB.

Typical status:

```text
Unsaved
Saving...
Saved locally
```

Project export:

```text
<name>.amrmap
```

Use `.amrmap` to reopen the complete editable project state.

### PostgreSQL project database

The frontend also includes a **Project Database** dialog. It connects to the companion backend API configured by:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

Database actions currently supported by the UI:

- Health-check the backend API.
- Save the current project as a new database project.
- Automatically generate and store both the current `.amrmap` and RMF Bundle.
- Save a new revision of an existing project.
- Load the latest `.amrmap` revision.
- Download the latest RMF Bundle revision.
- Delete a project and its revisions.

The frontend expects PostgreSQL and the Node backend to be running separately. The backend is not contained in this frontend ZIP. The default UI troubleshooting message assumes the backend is on port `3001`.

> When opening a GitHub Pages-hosted frontend, `localhost` points to the **viewer's own computer**, not the PC running your backend. Set `VITE_API_BASE_URL` to an API address that the browser can actually reach and ensure the backend allows the frontend origin.

## 15. Project Structure

```text
src/
├── components/
│   ├── editor/
│   │   └── MapCanvas.tsx
│   ├── inspector/
│   │   └── Inspector.tsx
│   ├── dialogs/
│   │   ├── DatabaseDialog.tsx
│   │   ├── ExportDialog.tsx
│   │   └── ...
│   └── ...
├── geometry/
│   ├── pathTopology.ts
│   ├── snapEngine.ts
│   └── ...
├── map-engine/
│   └── ...
├── models/
│   └── index.ts
├── services/
│   ├── database/
│   │   └── databaseApi.ts
│   ├── export/
│   │   ├── buildingExporter.ts
│   │   ├── geojsonExporter.ts
│   │   ├── keepoutExporter.ts
│   │   ├── navGraphExporter.ts
│   │   ├── referenceCoordinatesExporter.ts
│   │   ├── rmfBundleExporter.ts
│   │   └── ...
│   ├── import/
│   └── persistence/
├── state/
│   ├── editorStore.ts
│   └── projectStore.ts
└── utils/
    └── files.ts
```

## 16. Important Exporter Responsibilities

### `buildingExporter.ts`

- Converts world coordinates to RMF reference-image coordinates.
- Generates vertices, lanes, floors, walls, doors, models, and measurements.
- Exports `bidirectional`.
- Exports lane `orientation`.
- Exports Pickup / Drop-off RMF parameters.

### `geojsonExporter.ts`

- Exports graph points / path edges in the selected GeoJSON reference format.

### `referenceCoordinatesExporter.ts`

- Selects the reference Floor.
- Selects exactly four principal corners.
- Uses the same four source points for RMF and robot coordinates.
- Outputs compact `[x, y]` YAML.

### `keepoutExporter.ts`

- Generates `map_keepout.png` at the same pixel dimensions as the occupancy map.
- Paints only enabled `keepout` polygons.
- Generates the companion `map_keepout.yaml`.

### `navGraphExporter.ts`

- Collects graph indices from enabled paths.
- Generates `nav_graphs/<graphIndex>.yaml`.

### `rmfBundleExporter.ts`

- Packages `map.building.yaml`, occupancy PNG, PGM, ROS YAML, Keepout mask files, and nav graphs.
- Requires at least one enabled path with at least two points.

### `databaseApi.ts`

- Uses `VITE_API_BASE_URL` (default `http://localhost:3001/api`).
- Lists database projects and revisions.
- Creates projects, uploads new revisions, downloads latest files, and deletes projects.

## 17. Troubleshooting

### Reference-coordinate YAML still shows block arrays

If you see:

```yaml
- - 10
  - 20
```

confirm the active exporter contains:

```ts
formatPair(...)
return lines.join('\n')
```

Then clear the Vite build cache:

```bash
rm -rf dist node_modules/.vite
npm run build
npm run dev
```

Correct format:

```yaml
- [10, 20]
```

### No reference coordinates generated

Verify:

- A Floor exists.
- The Floor is enabled.
- It has at least 4 unique vertices.
- The Floor represents the intended outer reference area.

### Lane orientation missing

Verify the selected path has one of:

```text
orientation = ""
orientation = "forward"
orientation = "backward"
```

and that the building exporter writes:

```yaml
orientation: [1, forward]
```

### Pickup / Drop-off RMF property missing

Verify the object type and its Properties field:

```text
Pickup  -> pickup_dispenser
Dropoff -> dropoff_ingestor
```


### Keepout files missing or incorrect

Verify:

- The zone type is `keepout`, not only `no_go`.
- The Keepout Zone is enabled.
- The polygon has at least 3 points.
- Map width, height, resolution, and origin are correct.

Expected bundle files:

```text
map_keepout.png
map_keepout.yaml
```

### RMF Bundle says nav graph is required

Add or enable at least one navigation path containing 2 or more points. RMF Bundle generation intentionally fails when no nav graph can be produced.

### Project Database shows Offline

Check:

- PostgreSQL is running on the backend machine.
- The companion Node backend is running.
- `VITE_API_BASE_URL` points to the reachable backend address.
- Port `3001` (or your configured API port) is reachable through the firewall/network.
- CORS on the backend allows the frontend origin.
- For another PC on the same LAN, do not use `localhost`; use the backend PC's LAN IP/hostname.

## 18. Deployment Checklist

- [ ] Correct map resolution.
- [ ] Correct map origin and origin yaw.
- [ ] Navigation objects are not inside obstacles.
- [ ] Path junctions are truly connected.
- [ ] Keepout Zones are enabled and correctly placed.
- [ ] `map_keepout.png` / `map_keepout.yaml` are present in the RMF Bundle.
- [ ] Required `nav_graphs/<index>.yaml` files are present.
- [ ] One-way / bidirectional routing is correct.
- [ ] Lane forward / backward orientation is correct.
- [ ] Pickup dispenser names are correct.
- [ ] Drop-off ingestor names are correct.
- [ ] Floor / wall geometry matches the environment.
- [ ] Reference Floor is enabled and has valid outer corners.
- [ ] Reference coordinates contain exactly four physical pairs.
- [ ] `.building.yaml` and PNG use matching names.
- [ ] Validation has been run.
- [ ] Exported files were tested in the target RMF / robot workflow.

## 19. Notes

- Travel direction and lane orientation are intentionally separate.
- Reference coordinate values must come from the active map, not from hard-coded examples.
- The four reference pairs correspond to the same four physical map corners in RMF and robot coordinates.
- Traffic Editor, Fleet Manager, Nav2, and robot-side systems may use different coordinate representations; keep coordinate conversion centralized in the exporters.
- `No-Go` and `Keepout` both block path validation, but only `Keepout` zones are rasterized into the RMF Bundle keepout mask.
- Database storage is revision-based and depends on the separately deployed backend API and PostgreSQL database.