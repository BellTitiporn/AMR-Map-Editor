# 🤖 AMR Map Editor

> A CAD/GIS-style web application for creating, editing, validating, and exporting navigation maps for Autonomous Mobile Robots (AMRs).

**Current version:** `0.11.0`  
**UI:** Light engineering theme  
**Primary outputs:** Navigation JSON, ROS Map, RMF `.building.yaml`, RMF Bundle

AMR Map Editor is designed for engineering workflows that start from a ROS occupancy map and continue through navigation-object creation, path planning, zone definition, validation, project saving, and export for ROS2 / Fleet Manager / Open-RMF workflows.

---

## ✨ Highlights

- Import ROS maps from `map.yaml` + `map.pgm` / `map.png`
- Edit occupancy maps with Freehand, Line, Rectangle, Polygon, and Eraser tools
- Create Waypoints, Home, Charging, Docking, Pickup, Drop-off, Waiting, and Parking points
- Create Normal, Preferred, One-way, Bidirectional, and Restricted paths
- Create No-Go, Slow, Restricted, Parking, Loading, Unloading, Human Traffic, and Safety zones
- Configure robot footprint, safety margin, clearance, turning radius, and speed
- Preview heading, path direction, labels, and map entities
- Validate geometry, connectivity, obstacles, zones, and robot clearance
- Save projects locally with IndexedDB and export `.amrmap`
- Export ROS maps, Navigation JSON, RMF `.building.yaml`, and RMF Bundle
- Build RMF geometry including Walls, Doors, Floor Areas, Models, and Measurements
- Snap paths, walls, objects, and doors for more reliable map topology

---

## 🚀 Quick Start

### 1. Install

```bash
npm install
npm run dev
```

Open the URL shown by Vite, usually:

```text
http://localhost:5173
```

### 2. Import a map

For a ROS map, select both files together:

```text
map.yaml
map.pgm
```

You can also import `PNG`, `JPG`, `PGM`, `.amrmap`, or supported JSON project data.

### 3. Build the navigation map

```text
Import Map
   ↓
Clean / Edit Occupancy Map
   ↓
Add Navigation Objects
   ↓
Create Paths
   ↓
Create Zones
   ↓
Configure Robot
   ↓
Preview
   ↓
Validate
   ↓
Save
   ↓
Export
```

### 4. Recommended first workflow

1. Import `map.yaml` + `map.pgm`
2. Press **Fit Map**
3. Verify resolution and origin
4. Clean the occupancy map if needed
5. Add `HOME`, `Charging Station`, `Pickup`, `Drop-off`, and Waypoints
6. Create navigation paths
7. Add operational zones
8. Configure robot dimensions
9. Open **Preview**
10. Run **Validate**
11. Save the project
12. Export the required format

---

## 🧭 Main Workflow

| Stage | Purpose |
|---|---|
| **Import** | Load ROS occupancy map or image |
| **Edit Map** | Clean obstacles and map noise |
| **Objects** | Create robot navigation poses |
| **Paths** | Build the navigation graph |
| **Zones** | Define No-Go, Slow, Human Traffic, etc. |
| **Building** | Add RMF walls, doors, floors, models, measurements |
| **Robot Config** | Configure footprint and motion constraints |
| **Preview** | Inspect the complete map visually |
| **Validate** | Detect geometry and navigation problems |
| **Save** | Store local project state |
| **Export** | Generate ROS / Navigation / RMF outputs |

---

## 🗺 Supported Data

### Navigation Objects

- Waypoint
- Home
- Charging Station
- Docking Station
- Pickup
- Drop-off
- Waiting
- Parking

### Path Types

- Normal
- Preferred
- One-way
- Bidirectional
- Restricted

### Zone Types

- No-Go
- Slow
- Restricted
- Parking
- Loading
- Unloading
- Human Traffic
- Safety

### Building Geometry

- Wall
- Door
- Floor Area
- Model
- Measurement

---

## 📤 Export Formats

| Output | Use case |
|---|---|
| `.amrmap` | Reopen and continue editing a full project |
| ROS Map ZIP | `map.yaml` + `map.pgm` |
| Occupancy PNG | Preview / RMF reference image |
| PGM | ROS occupancy map |
| YAML | ROS map metadata |
| Waypoints JSON | Navigation objects only |
| Paths JSON | Navigation paths only |
| Zones JSON | Zone definitions only |
| Navigation JSON | Objects + Paths + Zones |
| `.building.yaml` | Open-RMF / Traffic Editor |
| RMF Bundle ZIP | `.building.yaml` + PNG + navigation JSON + README |

---

## 🧭 Heading vs Path Direction

These are different concepts:

| Arrow | Meaning |
|---|---|
| **Waypoint / Station arrow** | Robot orientation at that pose |
| **One-way Path arrow** | Allowed travel direction along the path |

Heading convention:

```text
0° / 0 rad        = E (+X)
90° / +π/2 rad    = N (+Y)
180° / π rad      = W (-X)
-90° / -π/2 rad   = S (-Y)
```

Heading can be edited using degrees, radians, presets, or the rotation handle on the canvas.

---

## 🔗 Path Connectivity

A path that visually touches another path is **not automatically connected**.

Real connectivity is created when path topology shares the same coordinate / vertex.

Connected junctions are shown with a green `CONNECTED` marker.

The snap system supports:

- Waypoints and Stations
- Path vertices
- Path segments
- Wall endpoints
- Wall segments

When a path endpoint snaps to the middle of another path, the editor can insert a real vertex into the target path to create a valid junction.

---

## 🏗 RMF / Traffic Editor Integration

The editor supports Open-RMF-oriented export with:

```yaml
coordinate_system: cartesian_meters
```

Navigation data is converted to RMF vertices and lanes, while Building tools can generate:

- `walls`
- `doors`
- `floors`
- `models`
- `measurements`

For Traffic Editor alignment, RMF export converts the internal ROS/world-meter coordinates into reference-image coordinates using:

- map resolution
- ROS origin
- origin yaw
- image Y-axis conversion

Always keep these files together:

```text
<name>.building.yaml
<name>.png
```

For workflows that also need robot heading/orientation, use:

```text
Export → RMF Bundle
```

The bundle contains:

```text
<name>.building.yaml
<name>.png
<name>-navigation.json
README.txt
```

The navigation JSON preserves robot pose information such as `x`, `y`, `yaw`, and `headingDegrees`.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Function |
|---|---|
| `V` | Select |
| `H` | Pan |
| `B` | Brush |
| `E` | Eraser |
| `P` | Path |
| `Z` | Zone |
| `M` | Measure |
| `Delete` | Delete selection |
| `Ctrl/Cmd + C` | Copy |
| `Ctrl/Cmd + V` | Paste |
| `Ctrl/Cmd + D` | Duplicate |
| `Ctrl/Cmd + S` | Save |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Esc` | Cancel current operation |

---

## 📚 Detailed Guide

<details>
<summary><strong>Coordinate Convention</strong></summary>

## 5. Coordinate Convention

ระบบแยก coordinate space ชัดเจน:

- Screen Coordinate — ตำแหน่งบน browser
- Pixel Coordinate — pixel ใน occupancy image
- World Coordinate — พิกัดจริงของ map หน่วย meter

Navigation data ที่ Save/Export ใช้ **World Coordinate**

ตัวอย่าง:

```text
X: 12.450 m
Y: 6.320 m
```

### ROS Y-axis

Browser canvas มี Y เพิ่มลงล่าง แต่ ROS map ใช้ world convention คนละทิศ ระบบจัดการการกลับแกน Y ใน coordinate utilities ไม่ควรแก้ด้วย `height - y` กระจายใน component

### Yaw

ภายในใช้ **radian** เพื่อเข้ากับ ROS

```text
0        =   0°
1.5708   =  90°
3.14159  = 180°
-1.5708  = -90°
```

---

</details>

<details>
<summary><strong>Navigation Objects</strong></summary>

## 7. Navigation Objects

ไปที่ **Objects** แล้วเลือก:

- Waypoint
- Home
- Charging Station
- Docking Station
- Pickup Point
- Drop-off Point
- Waiting Point
- Parking Point

### วิธีสร้าง

1. เลือกชนิด Object
2. คลิก `+` หรือรายการนั้น
3. คลิกบน Map
4. Object ใหม่จะถูก select
5. Inspector ด้านขวาจะแสดง properties

สามารถแก้:

- Name
- ID
- Type
- X
- Y
- Yaw
- Description
- Enabled

ลาก Object บน map → X/Y ใน Inspector เปลี่ยนตาม

แก้ X/Y ใน Inspector → Object บน map ย้ายตาม

### คำแนะนำในการวาง Waypoint

ควรวางที่:

- Junction
- Turn
- จุดเข้า/ออก corridor
- Station approach
- Pickup / Drop-off
- Waiting area
- Parking area
- จุดที่ traffic rule เปลี่ยน

ไม่จำเป็นต้องวาง waypoint ทุกระยะบนทางตรงยาว

---

</details>

<details>
<summary><strong>Heading / Yaw</strong></summary>

## 8. Heading / Yaw

Object ที่มี orientation จะแสดงลูกศร heading

เหมาะกับ:

- Charging Station
- Docking Station
- Pickup/Drop-off ที่ต้องเข้าหาในทิศเฉพาะ
- Waypoint ที่ต้องการ pose

ตัวอย่าง:

```text
Yaw = 1.5708 rad ≈ 90°
```

---

</details>

<details>
<summary><strong>Paths and Navigation Graph</strong></summary>

## 9. Paths และ Navigation Graph

รองรับ:

- Normal Path
- Preferred Path
- One-way Path
- Bidirectional Path
- Restricted Path

### วิธีสร้าง Path

1. เลือก Path Type
2. คลิกจุดแรก
3. คลิกจุดต่อ ๆ ไปเพื่อเพิ่ม vertex
4. Double Click หรือ Enter เพื่อ Finish
5. Esc เพื่อ Cancel

ตัวอย่าง:

```text
WP-001 ●────────● WP-002
                │
                │
                ● WP-003
```

### Path จำเป็นต้องผ่าน Waypoint ทุกจุดหรือไม่?

**ไม่จำเป็น**

แนวคิด:

```text
Waypoint = Graph Node
Path     = Graph Edge
```

Path สามารถมี intermediate vertex เพื่อบังคับรูปทรงให้ตาม corridor โดย vertex เหล่านั้นไม่จำเป็นต้องเป็น waypoint

```text
WP-001 ●
        \
         ●  ← path vertex
          \
           ●────────● WP-002
```

แต่จุดที่เป็น junction, destination, station หรือ routing decision ควรเป็น node และควรให้ path terminate/connect ที่ node นั้น

#### แนะนำ

```text
PATH-001: WP-001 ↔ WP-002
PATH-002: WP-002 ↔ WP-003
```

ดีกว่าใช้ path เดียวยาวผ่าน junction ที่ต้องแตกแขนง

### One-way / Two-way Path

โปรแกรมแสดง direction ของ path ให้ชัดเจนทั้งบน Map Canvas, Properties และ Preview

#### One-way

เลือก **ONE-WAY** ใน Properties หรือใช้ Path Type `one_way`

```text
A ● ─────────→ ● B
```

ความหมายคือ Robot สามารถวิ่งตามลำดับ vertex จากจุดแรกไปจุดสุดท้ายเท่านั้น

ลำดับ click คือ direction:

```text
A → B → C
```

บน Map Canvas จะมี:

- ลูกศรทางเดียวบนแต่ละ segment
- Badge `ONE-WAY  A → B`
- Properties แสดงสถานะ `ONE-WAY`

หากทิศผิด ให้กด **Reverse Direction** เพื่อกลับลำดับ vertex:

```text
A → B
```

เป็น:

```text
A ← B
```

#### Two-way / Bidirectional

เลือก **TWO-WAY** ใน Properties หรือใช้ Path Type `bidirectional`

```text
A ● ←────────→ ● B
```

หมายถึง Robot สามารถใช้ path เดียวกันได้ทั้งสองทิศทาง

บน Map Canvas จะมีลูกศรคู่สวนทาง และ Badge:

```text
TWO-WAY  A ↔ B
```

#### การสลับทิศจาก Properties

เมื่อ Select Path ทางขวาจะมีส่วน **TRAVEL DIRECTION** พร้อมปุ่ม:

```text
[ One-way  A → B ]   [ Two-way  A ↔ B ]
```

กดเพื่อสลับได้ทันที โดยไม่ต้องลบและสร้าง path ใหม่

> ลูกศรบน **Path** = ทิศทางที่ Robot อนุญาตให้เดินทาง ส่วนลูกศรบน **Waypoint/Station** = Heading/Orientation ของ Robot เมื่ออยู่ที่จุดนั้น ซึ่งเป็นคนละความหมายกัน

---

</details>

<details>
<summary><strong>Zones</strong></summary>

## 10. Zones

รองรับ:

- No-Go
- Slow
- Restricted
- Parking
- Loading
- Unloading
- Human Traffic
- Safety

### วิธีสร้าง

1. เลือก Zone Type
2. คลิก polygon vertices
3. ต้องมีอย่างน้อย 3 จุด
4. Double Click หรือ Enter เพื่อ Finish
5. Esc เพื่อ Cancel

#### No-Go

ใช้กับเครื่องจักร ชั้นวาง บันได พื้นที่อันตราย หรือพื้นที่ห้าม AMR เข้า

#### Slow

เหมาะกับทางแคบ จุดตัด หน้าประตู หรือพื้นที่คนเดิน สามารถตั้ง Max Speed ได้

#### Human Traffic

ใช้สำหรับพื้นที่ที่คนเดินผ่านบ่อย

---

</details>

<details>
<summary><strong>Occupancy Brush Tools</strong></summary>

## 11. Occupancy Brush Tools

เลือก **Brush** หรือกด:

```text
B
```

เมื่อ Brush active จะมี Brush Toolbar บน canvas

### Brush Size

เลือกได้:

```text
1 / 3 / 5 / 10 / 20 / 50 px
```

Brush Size มีผลกับ Freehand, Line และ Eraser

### Brush Color

เมื่อเลือก **Brush** จะมี Color Picker ใน Brush Toolbar สามารถเลือกสีที่ต้องการได้ก่อนวาด เช่น:

```text
#000000  Black
#FF0000  Red
#0066FF  Blue
```

สีใช้กับ Freehand, Line, Rectangle และ Polygon โดยตรง ส่วน Eraser ยังคง restore จาก original map

> Brush Color เป็น visual color ของ raster ที่แก้ไข แต่ Brush ยังคงมี semantic เป็น **Occupied/Obstacle** สำหรับ Validation และ ROS PGM export เพื่อป้องกันไม่ให้สีที่เลือกทำให้ occupancy classification ผิด

### 11.1 Freehand

ใช้ลากวาด obstacle แบบอิสระ

```text
Brush → Freehand → เลือก Size → Drag
```

เหมาะกับการเก็บรายละเอียดเล็ก ๆ หรือแก้ obstacle เฉพาะจุด

### 11.2 Line

สร้าง obstacle เป็นเส้นตรง

```text
Brush → Line → Drag Start → End
```

ความหนาใช้ Brush Size

เหมาะกับ:

- เพิ่ม wall เส้นตรง
- ปิดช่องทาง
- วาด barrier

### 11.3 Rectangle

ลากจากมุมหนึ่งไปอีกมุมหนึ่งเพื่อสร้างพื้นที่สี่เหลี่ยม

```text
Brush → Rectangle → Drag
```

เหมาะกับ:

- Rack
- Machine footprint
- Blocked area

### 11.4 Polygon

ใช้วาดพื้นที่ obstacle รูปร่างอิสระ

1. เลือก `Brush → Polygon`
2. คลิกเพิ่ม vertices
3. จะเห็น preview ก่อน apply
4. Double Click / Enter หรือกด **Apply Polygon**
5. กด **Clear** เพื่อล้าง polygon ที่กำลังร่าง
6. Esc เพื่อ Cancel current operation

เหมาะกับเครื่องจักรหรือพื้นที่รูปร่างไม่เป็นสี่เหลี่ยม

### Eraser

เลือก Eraser หรือกด:

```text
E
```

Eraser จะ **restore pixel จาก original imported map** ไม่ใช่เพียงวาดสีขาวทับ

> Occupancy edit สามารถ Undo/Redo ได้

---

</details>

<details>
<summary><strong>Preview Mode</strong></summary>

## 12. Preview Mode

กดปุ่มรูป **ตา (Eye)** บน Top Toolbar

Preview ใช้สำหรับตรวจภาพรวมโดยไม่ต้องแก้ map

แสดง:

- Occupancy Map
- Navigation Objects
- ชื่อของทุก object
- Heading
- Paths และชื่อ path
- One-way arrows
- Zones และชื่อ/type
- จำนวน Objects / Paths / Zones
- World size
- Resolution
- รายละเอียด entity

Preview จะจัด Fit Map ให้เหมาะกับพื้นที่แสดงผลโดยอัตโนมัติ

#### แนะนำให้ใช้ Preview ก่อน

- Validate
- Save Revision / Save As
- Export Navigation JSON
- Export ROS Map

เพื่อตรวจว่าไม่มีชื่อซ้อน จุดวางผิด Path ผิดทิศ หรือ Zone ครอบผิดพื้นที่

---

</details>

<details>
<summary><strong>Robot Configuration</strong></summary>

## 13. Robot Configuration

สามารถตั้งค่า เช่น:

- Width
- Length
- Safety Margin
- Inflation Radius
- Minimum Clearance
- Minimum Turning Radius
- Maximum Speed

ตัวอย่าง:

```text
Width: 0.72 m
Length: 1.05 m
Safety Margin: 0.15 m
Inflation Radius: 0.35 m
Minimum Clearance: 0.20 m
Turning Radius: 0.65 m
Max Speed: 1.8 m/s
```

เมื่อเลือก waypoint/station สามารถเห็น robot footprint preview บน map

---

</details>

<details>
<summary><strong>Measurement</strong></summary>

## 14. Measurement

เลือก Measure หรือกด:

```text
M
```

คลิกหลายจุดเพื่อวัดระยะจริงบน map

โปรแกรมแสดง:

- Segment Distance
- Total Distance

หน่วยเป็น meter

---

</details>

<details>
<summary><strong>Validation</strong></summary>

## 15. Validation

กด **Validate**

ระบบตรวจอย่างน้อย:

#### Objects

- Object outside map
- Object / Station inside obstacle
- Duplicate IDs

#### Paths

- Path intersects obstacle
- Path enters No-Go Zone
- Path narrower than robot footprint
- Disconnected path
- Zero-length path segment

#### Zones

- Invalid polygon
- Self-intersection
- Zone outside map
- Conflicting zones

#### Robot Clearance

ตรวจ Robot footprint + Safety Margin กับ obstacle/restricted area

คลิก Validation Issue เพื่อ select และ center ไปยังตำแหน่งปัญหา

---

</details>

<details>
<summary><strong>Save / Autosave / Open</strong></summary>

## 16. Save / Autosave / Open

### Save

กด:

```text
Ctrl/Cmd + S
```

หรือปุ่ม Save

Project ถูกบันทึกลง IndexedDB

### Autosave

มี debounce autosave หลังแก้ข้อมูลประมาณ 1–2 วินาที

สถานะ:

```text
Unsaved
Saving…
Saved locally
```

### Save As

ดาวน์โหลดไฟล์:

```text
project-name.amrmap
```

เก็บ complete project state สำหรับเปิดกลับมาแก้ต่อ

### Open

รองรับ:

```text
.amrmap
.json
```

Project จะผ่าน schema validation ก่อน load

---

</details>

<details>
<summary><strong>Export</strong></summary>

## 17. Export

เปิด:

```text
Export
```

ตัวเลือกปัจจุบัน:

- AMR Project
- ROS Map (.zip)
- Occupancy PNG
- PGM
- YAML
- Waypoints JSON
- Paths JSON
- Zones JSON
- **Navigation JSON (Waypoints + Paths + Zones)**

สำหรับ navigation data สามารถเลือก:

- Export All
- Export Selected

---

</details>

<details>
<summary><strong>Navigation JSON Format</strong></summary>

## 18. Navigation JSON Format

Navigation JSON เป็นไฟล์หลักที่แนะนำเมื่อจะส่ง navigation data ไป backend, ROS2 bridge หรือ Fleet Manager

ชื่อไฟล์ตัวอย่าง:

```text
factory-a-floor-1-navigation.json
```

โครงสร้าง:

```json
{
  "format": "AMR_NAVIGATION",
  "version": "1.0",
  "frame": "map",
  "map": {
    "id": "factory-a-f1",
    "name": "Factory A / Floor 1",
    "resolution": 0.05,
    "worldWidth": 42.5,
    "worldHeight": 31.0,
    "origin": {
      "x": -10.0,
      "y": -8.0,
      "yaw": 0.0
    }
  },
  "waypoints": [
    {
      "id": "WP-001",
      "name": "Loading Area",
      "type": "waypoint",
      "x": 12.4,
      "y": 8.1,
      "yaw": 1.5708,
      "enabled": true
    },
    {
      "id": "CHARGE-01",
      "name": "Charging Station 01",
      "type": "charging_station",
      "x": 2.2,
      "y": 3.5,
      "yaw": 3.14159,
      "enabled": true
    }
  ],
  "paths": [
    {
      "id": "PATH-001",
      "name": "Main Aisle",
      "type": "one_way",
      "points": [
        { "x": 12.4, "y": 8.1 },
        { "x": 18.2, "y": 8.1 }
      ],
      "maxSpeed": 1.2,
      "enabled": true
    }
  ],
  "zones": [
    {
      "id": "ZONE-001",
      "name": "Slow Area",
      "type": "slow",
      "maxSpeed": 0.5,
      "polygon": [
        { "x": 10.0, "y": 10.0 },
        { "x": 15.0, "y": 10.0 },
        { "x": 15.0, "y": 14.0 }
      ],
      "enabled": true
    }
  ],
  "robotConfigs": []
}
```

#### Important

- `waypoints` รวม navigation objects ทุกประเภท เช่น Home, Charging, Docking, Pickup, Drop-off, Waiting, Parking และ Waypoint
- ใช้ `type` แยกชนิด
- `x`, `y` เป็น **world coordinate หน่วย meter**
- `yaw` เป็น **radian**
- Path points และ Zone polygon เป็น world coordinates เช่นกัน
- ห้ามนำ screen/pixel coordinate ไปใช้เป็น navigation coordinate

---

</details>

---

## 🧩 Advanced Features

<details>
<summary><strong>Delete a Single Path Vertex</strong></summary>

### Delete a Single Path Point / Vertex

Path vertices can now be removed individually without deleting the entire path.

1. Select the path with the Select tool (`V`).
2. Click one of the circular path vertices.
3. The selected vertex is highlighted in red.
4. Delete it using either:
   - `Delete`
   - `Backspace`
   - **Properties → Path Points → Delete Point**
5. The remaining path vertices are automatically reconnected.
6. The operation can be reverted with `Ctrl/Cmd + Z`.

The Properties panel also allows editing the selected vertex X/Y world coordinates directly.

> A valid path must contain at least 2 points. When only 2 points remain, **Delete Point** is disabled. Deleting the whole path remains available through the normal Path Delete button.

</details>

<details>
<summary><strong>Path Connectivity / Junctions</strong></summary>

### Path Connectivity / Junctions (v0.8.0)

ในเวอร์ชัน 0.8.0 การที่ Path สองเส้นดูเหมือนแตะหรือตัดกันบนหน้าจอ **ไม่ถือว่าเชื่อมกันโดยอัตโนมัติ** ระบบใช้ topology connection ที่เกิดจากพิกัด vertex ที่ตรงกันจริง

#### สัญลักษณ์ CONNECTED

เมื่อ Path endpoint เชื่อมกับ Waypoint / Station / Path อื่นจริง จะเห็น **จุด Junction สีเขียว** พร้อมคำว่า `CONNECTED` บน Map

```text
PATH-A ─────●───── PATH-B
            ↑
       green junction
```

จุดสีเขียวหมายถึง Path share coordinate/vertex เดียวกันจริง ไม่ใช่แค่เส้นวาดทับกัน

#### Auto Snap

เมื่อสร้าง Path ใหม่ หรือ drag จุด Start / End ของ Path เข้าใกล้:

- Waypoint
- Home
- Charging Station
- Docking Station
- Pickup / Drop-off
- Path vertex
- Path segment

ภายในระยะประมาณ `0.25 m` ระบบจะ snap ให้โดยอัตโนมัติ

ถ้า endpoint ถูกลากไปชน **กลาง Path อื่น** ระบบจะเพิ่ม vertex ให้ Path เป้าหมายโดยอัตโนมัติ เพื่อสร้าง junction จริง

```text
ก่อน

PATH-A ─────────────
               ↑ endpoint PATH-B

หลัง

PATH-A ───────●─────
              │
              │ PATH-B
```

#### Path Connectivity panel

เลือก Path แล้วดูที่ Properties → **PATH CONNECTIVITY**

จะแสดงสถานะ:

```text
START   Connected / Open
END     Connected / Open
```

และมีปุ่ม:

- `Connect Start`
- `Connect End`
- `Connect Both`
- `Merge with <path>` เมื่อมี Path ที่ compatible อยู่ใกล้

#### Connect vs Merge

**Connect** เหมาะกับกรณีส่วนใหญ่ เพราะ Path ยังเป็นคนละเส้นและสามารถมี speed/type/direction ต่างกันได้

```text
        PATH-C
           │
PATH-A ────●──── PATH-B
```

**Merge** ใช้เมื่อต้องการรวมสอง Path ให้กลายเป็น Path เดียวจริง ๆ

ระบบจะอนุญาต Merge เฉพาะกรณีที่ปลอดภัย เช่น Path type compatible กัน สำหรับ One-way Path จะไม่ merge ถ้าต้องกลับทิศทางของเส้น

ถ้า Path เป็นคนละ type เช่น:

```text
One-way + Bidirectional
```

ควรใช้ **Connect** แทน Merge เพื่อรักษา routing rule ของแต่ละ Path

#### Validation เพิ่มเติม

Validate Map จะเตือนกรณี:

```text
Path A crosses Path B visually but no topology junction exists.
```

หมายความว่าเส้นตัดกันบนภาพ แต่ไม่ได้ share vertex จริง ให้ใช้ Connect หรือแก้ vertex ให้ตรงกันจนเห็นจุด `CONNECTED` สีเขียว

</details>

<details>
<summary><strong>Custom Export File Name</strong></summary>

### Custom Export File Name (v0.8.1)

ก่อนดาวน์โหลดไฟล์จาก **Export Map** สามารถกำหนดชื่อไฟล์หลักได้ที่ช่อง **File name**

ตัวอย่างกรอก:

```text
WB220126_Floor3
```

ระบบจะเติม suffix และนามสกุลให้ตามประเภท Export อัตโนมัติ เช่น:

```text
WB220126_Floor3.amrmap
WB220126_Floor3-ros-map.zip
WB220126_Floor3.png
WB220126_Floor3.pgm
WB220126_Floor3.yaml
WB220126_Floor3-waypoints.json
WB220126_Floor3-paths.json
WB220126_Floor3-zones.json
WB220126_Floor3-navigation.json
```

ถ้าเลือก **Export Selected** ระบบจะเพิ่ม `-selected` ก่อน `.json` เช่น:

```text
WB220126_Floor3-paths-selected.json
```

ชื่อภาษาไทยสามารถใช้ได้ และระบบจะลบ/แทนที่อักขระที่ไม่เหมาะกับชื่อไฟล์ เช่น `/ \\ : * ? \" < > |` โดยอัตโนมัติ

</details>

<details>
<summary><strong>RMF Traffic Editor Export</strong></summary>

### RMF Traffic Editor `.building.yaml` Export (v0.9.0)

เมนู **Export → RMF Building (.building.yaml)** จะสร้างไฟล์ เช่น:

```text
WB220126_Floor3.building.yaml
```

ไฟล์นี้เป็น Open-RMF Traffic Editor style building map navigation skeleton โดยใช้:

```yaml
coordinate_system: cartesian_meters
```

การแปลงข้อมูลหลัก:

- Navigation Objects → `vertices`
- Path segments → `lanes`
- One-way Path → `bidirectional: false`
- Bidirectional/other Path → `bidirectional: true`
- Path Max Speed → `speed_limit`
- Charging Station → `is_charger`
- Waiting Point → `is_holding_point`
- Parking Point → `is_parking_spot`
- Docking Station → `dock_name`
- Pickup Point → `pickup_dispenser`
- Drop-off Point → `dropoff_ingestor`

ไฟล์ `.building.yaml` จะอ้าง background image เป็นชื่อเดียวกัน เช่น:

```yaml
drawing:
  filename: WB220126_Floor3.png
```

ดังนั้นถ้าต้องการเปิดใน Traffic Editor พร้อมภาพพื้นหลัง ให้ Export **Occupancy PNG** ด้วยชื่อ base เดียวกันแล้ววาง `.building.yaml` และ `.png` ไว้ในโฟลเดอร์เดียวกัน

> หมายเหตุ: Export นี้เน้น Navigation Graph/Vertices/Lanes จาก AMR Map Editor ยังไม่ได้สร้าง walls, doors, lifts, models หรือ simulation geometry แบบเต็มของ Traffic Editor

---

</details>

<details>
<summary><strong>RMF Building Geometry</strong></summary>

## RMF Building Geometry (v0.10.0)

เวอร์ชันนี้เพิ่ม Building tab สำหรับสร้างข้อมูลที่ใช้ใน Open-RMF `.building.yaml` โดยตรง ได้แก่ **Wall, Door, Floor Area, Model และ Measurement** นอกเหนือจาก Navigation Objects และ Paths เดิม

### Wall

เลือก `Building → Wall` แล้วคลิก 2 จุดบนแผนที่ จากนั้นเลือก Wall เพื่อแก้ Properties:

- Start / End X,Y
- **Length (m)** — ปรับความยาว Wall แบบตัวเลขหลังจากวาดได้
- **Angle (°)** — ปรับมุม Wall โดยไม่ต้องวาดใหม่
- **Resize Anchor: Start / Center / End** — เลือกจุดอ้างอิงตอนยืด/หดหรือหมุน Wall
- Texture Name
- Texture Height
- Texture Width
- Texture Scale
- Alpha
- Enabled

Exporter จะสร้างรายการ `walls` ที่อ้างอิง vertex indices และ parameters เช่น `alpha`, `texture_height`, `texture_name`, `texture_scale`, `texture_width`.

### Door

เลือก `Building → Door` แล้วคลิก 2 จุด สามารถกำหนด:

- Name
- Door Type: hinged / double_hinged / sliding / double_sliding
- Motion Axis: start / end
- Motion Degrees
- Motion Direction: 1 / -1
- Plugin
- Right/Left Ratio

ข้อมูลถูก export ไปยัง `doors` ใน `.building.yaml`.

### Floor Area

เลือก `Building → Floor Area` คลิกอย่างน้อย 3 vertices แล้วกด Enter หรือ Double Click เพื่อปิด polygon

Properties:

- Texture Name
- Texture Scale
- Texture Rotation
- Ceiling Texture
- Ceiling Scale
- Indoor

### Model

เลือก `Building → Model` แล้วคลิกตำแหน่งที่ต้องการวาง สามารถกำหนด `model_name`, name, X/Y, Yaw, Z, Static และ Dispensable.

### Measurement

เลือก `Building → Measurement` แล้วคลิก 2 จุด ระบบคำนวณระยะจริงเป็นเมตรอัตโนมัติ และสามารถแก้ Distance ได้ใน Properties ก่อน export.

### Building / Level Properties

ใน Properties มีส่วน **RMF BUILDING / LEVEL** สำหรับกำหนด:

- Building Name
- Level Name
- Reference Level
- Elevation (m)

### `.building.yaml` ที่ Export

ไฟล์ที่ได้มีโครงสร้างหลัก:

```yaml
name: Factory
reference_level_name: L1
coordinate_system: cartesian_meters
levels:
  L1:
    elevation: 0
    drawing:
      filename: Factory.png
    doors: []
    floors: []
    lanes: []
    measurements: []
    models: []
    vertices: []
    walls: []
lifts: {}
```

Navigation Objects จะถูกแปลงเป็น named vertices และ Paths เป็น lanes เช่นเดิม ส่วน Building tab จะเติม walls / doors / floors / models / measurements.

> ปัจจุบัน editor เป็น single-level workflow และ `lifts` ยัง export เป็น `{}`. การทำ multi-level + lift editor ควรเป็น phase ถัดไป เพราะ lift ต้องผูกหลาย level และ door pairs เข้าด้วยกัน.

### Wall Length / Angle Editing

หลังวาด Wall 2 จุดแล้ว ให้เลือก Wall และเปิด **WALL PROPERTIES → WALL GEOMETRY** สามารถแก้ `Length (m)` และ `Angle (°)` ได้โดยตรง ถ้าวาดสั้นเกินไปไม่ต้องลบและวาดใหม่

เลือก Anchor ได้ 3 แบบ:

- **Start** — Start Point อยู่ที่เดิม แล้ว End Point ขยับ
- **End** — End Point อยู่ที่เดิม แล้ว Start Point ขยับ
- **Center** — จุดกึ่งกลางอยู่ที่เดิม และ Wall ขยาย/หดออกสองด้านเท่า ๆ กัน

ค่าจะ sync สองทาง: การแก้ Start/End X,Y จะทำให้ Length/Angle คำนวณใหม่ และการแก้ Length/Angle จะอัปเดต Start/End geometry บน Map ทันที พร้อมรองรับ Undo/Redo ผ่าน history ของ Project Store.

### Wall Endpoint Dragging (v0.10.2)

Wall สามารถแก้ geometry ได้ทั้งจาก Properties และจาก Mouse บน Map Canvas

#### ลากปลาย Wall ด้วย Mouse

1. เลือก **Select Tool (`V`)**
2. คลิก Wall ที่ต้องการแก้
3. ที่ปลาย Wall จะปรากฏ Handle 2 จุด:
   - `START`
   - `END`
4. ลาก Handle ที่ต้องการไปยังตำแหน่งใหม่
5. ค่า Start X/Y, End X/Y, Length และ Angle ใน Properties จะอัปเดตตาม geometry ใหม่

```text
START ○────────────────○ END
      ↑                ↑
      ลากได้           ลากได้
```

- ลาก `START` → `END` อยู่ที่เดิม
- ลาก `END` → `START` อยู่ที่เดิม
- ระหว่างลาก Wall จะเปลี่ยนแบบ live
- การลากหนึ่งครั้งถูกบันทึกเป็น Undo step เดียว
- ใช้ `Ctrl/Cmd + Z` เพื่อ Undo ได้
- หาก Building Layer ถูก Lock จะไม่สามารถลาก Handle ได้

#### Precision + Mouse Workflow

แนะนำให้ใช้สองวิธีร่วมกัน:

- **Mouse Drag** สำหรับปรับตำแหน่งอย่างรวดเร็ว
- **Length / Angle / Coordinates** ใน Properties สำหรับปรับค่าที่ต้องการความแม่นยำ

</details>

<details>
<summary><strong>Interaction & Snap Architecture</strong></summary>

### Interaction & Snap Architecture (v0.10.8)

- Pointer interaction policy ถูกแยกไว้ที่ `src/map-engine/interactionPolicy.ts` เพื่อป้องกัน Floor/Zone/Path ดัก click ตอนกำลังวาดหรือวาง Navigation Object
- Snapping ถูกรวมไว้ที่ `src/geometry/snapEngine.ts` รองรับ Object, Path vertex/segment, Wall endpoint/segment
- `Building → Door` สามารถ snap เข้ากับ Wall และพยายามรักษา Door สองจุดให้อยู่บน Wall เดียวกันโดยอัตโนมัติ
- มี `DOOR SNAP` highlight ก่อนคลิก เพื่อให้เห็นตำแหน่งที่จะยึดจริง

</details>

<details>
<summary><strong>RMF Coordinate Compatibility</strong></summary>

### RMF Traffic Editor Coordinate Compatibility (v0.10.9)

RMF `.building.yaml` export uses `reference_image` coordinates so the geometry aligns with the
exported occupancy PNG in Traffic Editor.

AMR Map Editor internally stores geometry in ROS/world meters. During RMF export it converts every
point into the source image pixel coordinate frame using map `resolution`, ROS `origin`, and
`originYaw`, including the required image Y-axis flip.

The exporter also creates a full-width measurement equal to:

```text
image_width × resolution
```

so Traffic Editor derives the same meters-per-pixel scale as the ROS occupancy map.

Always export and keep these files together:

```text
<name>.building.yaml
<name>.png
```

Do not rename only one of the two files because the building YAML references the PNG by filename.

</details>

<details>
<summary><strong>RMF Bundle + Robot Heading</strong></summary>

### RMF Bundle + Robot Heading (v0.11.0)

Traffic Editor ไม่ได้ render custom vertex property `amr_yaw` เป็นลูกศร heading ของ Waypoint/Station โดยตรง

AMR Map Editor จึง export ข้อมูล RMF และ robot pose แยกหน้าที่กัน:

```text
Export → RMF Bundle
```

จะได้ ZIP:

```text
<name>.building.yaml
<name>.png
<name>-navigation.json
README.txt
```

- `.building.yaml` ใช้กับ Open-RMF / Traffic Editor และยังเก็บ `amr_yaw` ไว้เป็น custom property
- `.png` เป็น reference image ที่ใช้กับ `.building.yaml`
- `-navigation.json` เก็บ `x`, `y`, `yaw` และ `headingDegrees` ของ Navigation Objects เพื่อใช้กับ Fleet Manager / Nav2

ตัวอย่าง:

```json
{
  "name": "CHARGING_STATION-01",
  "x": 36.79,
  "y": 41.36,
  "yaw": 1.5707963268,
  "headingDegrees": 90
}
```

ดังนั้นการไม่เห็น heading arrow ใน Traffic Editor ไม่ได้หมายความว่า orientation หาย ข้อมูล orientation ยังคงถูกเก็บไว้สำหรับ robot integration

</details>

---

## 🛠 Requirements

- Node.js 20 LTS or newer
- npm
- Modern browser
  - Chrome
  - Edge
  - Firefox

Check versions:

```bash
node -v
npm -v
```

---

## 🧪 Development

### Run development server

```bash
npm run dev
```

### Production build

```bash
npm run build
```

### Tests

```bash
npm test
```

---

## 📁 Project Structure

```text
src/
├── components/
│   ├── editor/
│   ├── toolbar/
│   ├── sidebar/
│   ├── inspector/
│   ├── validation/
│   └── dialogs/
│
├── map-engine/
│   ├── coordinates.ts
│   ├── viewport.ts
│   └── interactionPolicy.ts
│
├── geometry/
│   ├── polygon.ts
│   ├── collision.ts
│   ├── distance.ts
│   └── snapEngine.ts
│
├── validation/
│   └── validator.ts
│
├── state/
│   ├── editorStore.ts
│   └── projectStore.ts
│
├── services/
│   ├── import/
│   ├── export/
│   ├── persistence/
│   └── mapEditing/
│
├── schemas/
│   └── projectSchema.ts
│
└── utils/
    └── files.ts
```

The architecture separates UI, map engine, geometry, validation, state, persistence, and import/export logic so the project can be extended toward ROS2, Fleet Manager, REST API, or WebSocket integration.

---

## 🧯 Troubleshooting

<details>
<summary><strong>Open troubleshooting guide</strong></summary>

## 21. Troubleshooting

### 21.1 Import สำเร็จแต่ Map ไม่ขึ้น

ลองตามลำดับ:

1. กด **Fit Map**
2. เปิด **Layers** และตรวจ `Occupancy Map` ว่า visible
3. ถ้าใช้ ROS YAML ให้เลือก YAML + image พร้อมกัน
4. ตรวจชื่อ image ใน YAML:

```yaml
image: map.pgm
```

ต้องตรงกับไฟล์จริง

5. กด `F12 → Console` เพื่อดู error

### 21.2 React-Konva error

หากพบ:

```text
Text components are not supported for now in ReactKonva.
Your text is: " "
```

หรือ:

```text
TypeError: can't access property "getParent", child is undefined
```

หมายถึงมี plain text node อยู่ภายใน Konva `Layer/Group`

เวอร์ชันปัจจุบันได้แก้จุดที่เคยพบแล้ว

หลังอัปเดต source ให้ restart:

```bash
Ctrl + C
npm run dev
```

แล้ว Hard Refresh:

```text
Ctrl + Shift + R
```

### 21.3 YAML หา image ไม่พบ

ถ้า YAML มี:

```yaml
image: warehouse_map.pgm
```

ต้องเลือก `warehouse_map.pgm` มาพร้อม YAML ในครั้งเดียว

### 21.4 Preview ไม่มีบาง layer

ตรวจ Layers ใน editor ก่อน และตรวจว่า entity ถูก `enabled`

### 21.5 Path validation ขึ้น disconnected

ตรวจว่าปลาย path อยู่ที่ node ที่ต้องการเชื่อมจริง และ junction สำคัญควรถูกแบ่งเป็น path segments

### 21.6 Export ROS ไม่ได้

ต้องมี:

- Valid occupancy map
- Width / Height ที่ถูกต้อง
- Resolution > 0

---

</details>

---

## ⚠️ Known Limitations

- Deploy is not connected to a real robot or fleet backend yet
- Current editor workflow is single-level
- `lifts` currently export as `{}`
- Multi-level + lift editing is not implemented yet
- Real deployment API is not connected
- Authentication / authorization is not implemented
- Browser-level E2E test coverage can be expanded

Possible future improvements:

- Free-space / Unknown occupancy brush modes
- Fill tool
- Advanced box / multi-selection
- Revision history and revision comparison
- Recent Projects management
- ROS2 integration
- Fleet Manager integration
- Real deployment API
- Multi-level RMF building editing

---

## 🛡 Production Safety

AMR Map Editor is currently an **Engineering Tool / Development Project**.

Before using exported data with a real AMR, verify:

- Map resolution and origin
- ROS frame convention
- Robot footprint
- Safety margin and clearance
- Navigation graph connectivity
- One-way path direction
- No-Go / Slow / Human Traffic zones
- Charging and Docking pose / yaw
- All validation errors and warnings

Always test exported maps in a staging or test environment before production deployment.

---

## 🧪 Test Coverage

Unit tests cover logic including:

- `pixelToWorld`
- `worldToPixel`
- PGM P2 / P5 parsing
- YAML parsing
- Project schema validation
- Project migration
- Waypoint export
- Navigation export
- ROS YAML generation
- Polygon validation

Run:

```bash
npm test
```

---

## 🗺 Roadmap

- [x] ROS map import
- [x] Occupancy map editing
- [x] Navigation objects
- [x] Path editor
- [x] Zones
- [x] Robot configuration
- [x] Validation
- [x] Navigation JSON export
- [x] RMF `.building.yaml` export
- [x] RMF Building geometry
- [x] Path / wall / door snapping
- [x] RMF Bundle export
- [ ] Multi-level RMF support
- [ ] Lift editor
- [ ] ROS2 runtime integration
- [ ] Fleet Manager integration
- [ ] Deployment API
- [ ] Authentication / authorization
- [ ] Expanded E2E tests

---

## 📌 Version

```text
AMR Map Editor v0.11.0
```