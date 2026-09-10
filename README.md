# AMR Map Editor

AMR Map Editor คือเว็บแอปสำหรับสร้าง แก้ไข ตรวจสอบ บันทึก และ Export แผนที่นำทางสำหรับ Autonomous Mobile Robot (AMR) โดยออกแบบให้มีลักษณะการใช้งานแบบ CAD / GIS / Industrial Robotics Engineering Tool

เวอร์ชันปัจจุบันใช้ **Light Theme** สำหรับงานวิศวกรรม และรองรับ workflow หลักตั้งแต่ Import ROS map ไปจนถึงสร้าง Navigation Objects, Paths, Zones, แก้ Occupancy Map, Preview, Validate, Save/Open และ Export Navigation JSON / ROS Map

> Project version: **0.5.0**

---

## Quick Start — เริ่มใช้งานใน 5 นาที

1. ติดตั้งและเปิดโปรแกรม
   ```bash
   npm install
   npm run dev
   ```
2. เปิด URL ที่ Vite แสดง เช่น `http://localhost:5173`
3. กด **Import** แล้วเลือก `map.yaml` + `map.pgm` พร้อมกัน
4. กด **Fit Map** ถ้าแผนที่ไม่อยู่กลางจอ
5. ไปที่ **Objects** แล้วสร้าง `HOME`, `Charging Station`, `Waypoint`
6. ไปที่ **Paths** แล้วสร้างเส้นทางเชื่อมจุดสำคัญ
7. ไปที่ **Zones** แล้วสร้าง `No-Go`, `Slow`, `Human Traffic` ตามต้องการ
8. กดปุ่มรูป **ตา (Preview)** เพื่อตรวจภาพรวม ชื่อจุด Path และ Zone
9. กด **Validate** เพื่อตรวจข้อผิดพลาด
10. กด **Save** หรือ **Save As**
11. กด **Export → Navigation JSON (Waypoints + Paths + Zones)** เพื่อได้ไฟล์ navigation รวม

---

## Heading / Orientation ของ Waypoint และ Station

ลูกศรที่ Navigation Object หมายถึง **ทิศที่ตัว Robot ควรหันเมื่ออยู่ที่จุดนั้น** ไม่ใช่ทิศทางของ Path

เลือก Waypoint/Station แล้วกำหนดทิศได้ 3 วิธี:

1. กรอก **Heading (°)** เช่น `0`, `90`, `180`, `-90`
2. กรอก **Yaw (rad)** เช่น `0`, `1.5708`, `3.1416`, `-1.5708`
3. ลาก **blue rotation handle** ที่ปรากฏบน Canvas เมื่อเลือก Object

ค่าทั้งสองช่อง sync กันอัตโนมัติ และใช้ convention ของ world/map frame:

```text
0° / 0 rad        = E (+X)
90° / +π/2 rad    = N (+Y)
180° / π rad      = W (-X)
-90° / -π/2 rad   = S (-Y)
```

มี preset buttons `0° E`, `90° N`, `180° W`, `-90° S` เพื่อกำหนดทิศได้เร็ว และ Canvas จะแสดง heading label ขณะเลือกจุด

> หมายเหตุ: ลูกศรของ **One-way Path** หมายถึงทิศทางที่อนุญาตให้วิ่งบน Path ซึ่งเป็นคนละความหมายกับ heading arrow ของ Waypoint/Station

---

## Features

- Light engineering theme สำหรับ CAD/GIS/robotics workflow
- Import ROS Map: YAML + PGM / PNG
- Import PNG/JPG แบบระบุ resolution/origin เอง
- PGM P2 / P5
- Zoom to cursor / Pan / Fit Map
- World coordinates หน่วยเมตร
- Navigation Objects
  - Waypoint
  - Home
  - Charging Station
  - Docking Station
  - Pickup
  - Drop-off
  - Waiting
  - Parking
- Path types
  - Normal
  - Preferred
  - One-way
  - Bidirectional
  - Restricted
- Zone types
  - No-Go
  - Slow
  - Restricted
  - Parking
  - Loading
  - Unloading
  - Human Traffic
  - Safety
- Occupancy Brush
  - Freehand
  - Line
  - Rectangle
  - Polygon
  - Brush size `1 / 3 / 5 / 10 / 20 / 50 px`
- Eraser restore จาก original imported map
- Preview Mode สำหรับดูภาพรวมทั้งระบบ
- Robot footprint preview
- Validation panel และ issue navigation
- Undo / Redo
- Copy / Paste / Duplicate
- IndexedDB Save + Autosave
- `.amrmap` Save As / Open
- Navigation JSON รวม Objects + Paths + Zones
- ROS ZIP Export (`map.yaml` + `map.pgm`)

---

## สารบัญ

- [1. Requirements](#1-requirements)
- [2. Installation](#2-installation)
- [3. Light Theme และหน้าจอหลัก](#3-light-theme-และหน้าจอหลัก)
- [4. Import Map](#4-import-map)
- [5. Coordinate Convention](#5-coordinate-convention)
- [6. การควบคุม Map Canvas](#6-การควบคุม-map-canvas)
- [7. Navigation Objects](#7-navigation-objects)
- [8. Heading / Yaw](#8-heading--yaw)
- [9. Paths และ Navigation Graph](#9-paths-และ-navigation-graph)
- [10. Zones](#10-zones)
- [11. Occupancy Brush Tools](#11-occupancy-brush-tools)
- [12. Preview Mode](#12-preview-mode)
- [13. Robot Configuration](#13-robot-configuration)
- [14. Measurement](#14-measurement)
- [15. Validation](#15-validation)
- [16. Save / Autosave / Open](#16-save--autosave--open)
- [17. Export](#17-export)
- [18. Navigation JSON Format](#18-navigation-json-format)
- [19. Keyboard Shortcuts](#19-keyboard-shortcuts)
- [20. Recommended Workflow](#20-recommended-workflow)
- [21. Troubleshooting](#21-troubleshooting)
- [22. Tests](#22-tests)
- [23. Project Structure](#23-project-structure)
- [24. Known Limitations](#24-known-limitations)

---

# 1. Requirements

แนะนำ:

- Node.js 20 LTS ขึ้นไป
- npm
- Browser รุ่นใหม่
  - Chrome
  - Edge
  - Firefox

ตรวจสอบ:

```bash
node -v
npm -v
```

---

# 2. Installation

เปิด Terminal ที่ root ของ project:

```bash
cd AMR-Map-Editor-Light-Theme
npm install
npm run dev
```

เปิด URL ที่ Vite แสดง เช่น:

```text
http://localhost:5173
```

Build สำหรับ production:

```bash
npm run build
```

Tests:

```bash
npm test
```

---

# 3. Light Theme และหน้าจอหลัก

UI ปัจจุบันเป็น **Light Theme** สำหรับงานวิศวกรรม โดยใช้:

- Off-white / slate surfaces
- Light-gray CAD canvas
- Blue accent สำหรับ active tool / selection
- Amber สำหรับ warning
- Red สำหรับ error
- Compact borders และ dense controls

โครงสร้างหน้าจอ:

```text
┌──────────────────────────────────────────────────────────────┐
│                        Top Toolbar                           │
├──────────────┬─────────────────────────────┬─────────────────┤
│              │                             │                 │
│ Left Sidebar │        Map Canvas           │   Properties    │
│              │                             │   Inspector     │
│              │                             │                 │
├──────────────┴─────────────────────────────┴─────────────────┤
│                    Validation / Status Bar                   │
└──────────────────────────────────────────────────────────────┘
```

### Top Toolbar

ประกอบด้วย New, Open, Import, Save, Save As, Undo, Redo, Select, Pan, Brush, Eraser, Path, Zone, Measure, Zoom, Fit Map, Validate, Preview, Export และ Deploy

### Left Sidebar

Tabs:

- Objects
- Paths
- Zones
- Layers

### Right Inspector

ใช้แก้ property ของ entity ที่เลือกแบบ live

### Bottom Panel

แสดง validation issues และ status ของ editor

---

# 4. Import Map

รองรับ:

- `.pgm`
- `.png`
- `.jpg`
- `.jpeg`
- `.yaml`
- `.yml`
- `.amrmap`
- `.json`

## 4.1 ROS YAML + PGM/PNG

เลือกไฟล์พร้อมกัน:

```text
map.yaml
map.pgm
```

ตัวอย่าง YAML:

```yaml
image: map.pgm
resolution: 0.05
origin: [-10.0, -8.0, 0.0]
negate: 0
occupied_thresh: 0.65
free_thresh: 0.196
```

ขั้นตอน:

1. กด **Import**
2. เลือก YAML และ image พร้อมกัน
3. ตรวจ Import Preview
4. กด **Import Map**

ระบบจะโหลด resolution, origin, negate และ occupancy thresholds จาก YAML

World size:

```text
World Width  = Image Width  × Resolution
World Height = Image Height × Resolution
```

## 4.2 Drag & Drop

สามารถลาก YAML + PGM/PNG ลงบน Map Canvas ได้โดยตรง

## 4.3 Image-only Import

ถ้าเลือก PNG/JPG/PGM โดยไม่มี YAML ระบบจะถาม:

- Resolution
- Origin X
- Origin Y
- Origin Yaw

Default resolution:

```text
0.05 m/pixel
```

## 4.4 Replace Existing Map

หาก project มี Objects/Paths/Zones อยู่แล้ว โปรแกรมจะเตือนก่อนเปลี่ยน map และให้เลือกเก็บหรือล้าง navigation data

---

# 5. Coordinate Convention

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

## ROS Y-axis

Browser canvas มี Y เพิ่มลงล่าง แต่ ROS map ใช้ world convention คนละทิศ ระบบจัดการการกลับแกน Y ใน coordinate utilities ไม่ควรแก้ด้วย `height - y` กระจายใน component

## Yaw

ภายในใช้ **radian** เพื่อเข้ากับ ROS

```text
0        =   0°
1.5708   =  90°
3.14159  = 180°
-1.5708  = -90°
```

---

# 6. การควบคุม Map Canvas

## Zoom

ใช้ Mouse Wheel

- Scroll Up → Zoom In
- Scroll Down → Zoom Out
- Zoom จะเกิดรอบ cursor

ช่วงประมาณ:

```text
5% - 1000%
```

## Pan

เลือก Pan หรือกด:

```text
H
```

แล้วลาก viewport

## Fit Map

กด **Fit Map** เมื่อ map หลุดจาก viewport หรือ zoom มากเกินไป

Pan/Zoom ไม่ถูกบันทึกใน Undo history

---

# 7. Navigation Objects

ไปที่ **Objects** แล้วเลือก:

- Waypoint
- Home
- Charging Station
- Docking Station
- Pickup Point
- Drop-off Point
- Waiting Point
- Parking Point

## วิธีสร้าง

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

## คำแนะนำในการวาง Waypoint

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

# 8. Heading / Yaw

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

# 9. Paths และ Navigation Graph

รองรับ:

- Normal Path
- Preferred Path
- One-way Path
- Bidirectional Path
- Restricted Path

## วิธีสร้าง Path

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

## Path จำเป็นต้องผ่าน Waypoint ทุกจุดหรือไม่?

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

### แนะนำ

```text
PATH-001: WP-001 ↔ WP-002
PATH-002: WP-002 ↔ WP-003
```

ดีกว่าใช้ path เดียวยาวผ่าน junction ที่ต้องแตกแขนง

## One-way / Two-way Path

โปรแกรมแสดง direction ของ path ให้ชัดเจนทั้งบน Map Canvas, Properties และ Preview

### One-way

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

### Two-way / Bidirectional

เลือก **TWO-WAY** ใน Properties หรือใช้ Path Type `bidirectional`

```text
A ● ←────────→ ● B
```

หมายถึง Robot สามารถใช้ path เดียวกันได้ทั้งสองทิศทาง

บน Map Canvas จะมีลูกศรคู่สวนทาง และ Badge:

```text
TWO-WAY  A ↔ B
```

### การสลับทิศจาก Properties

เมื่อ Select Path ทางขวาจะมีส่วน **TRAVEL DIRECTION** พร้อมปุ่ม:

```text
[ One-way  A → B ]   [ Two-way  A ↔ B ]
```

กดเพื่อสลับได้ทันที โดยไม่ต้องลบและสร้าง path ใหม่

> ลูกศรบน **Path** = ทิศทางที่ Robot อนุญาตให้เดินทาง ส่วนลูกศรบน **Waypoint/Station** = Heading/Orientation ของ Robot เมื่ออยู่ที่จุดนั้น ซึ่งเป็นคนละความหมายกัน

---

# 10. Zones

รองรับ:

- No-Go
- Slow
- Restricted
- Parking
- Loading
- Unloading
- Human Traffic
- Safety

## วิธีสร้าง

1. เลือก Zone Type
2. คลิก polygon vertices
3. ต้องมีอย่างน้อย 3 จุด
4. Double Click หรือ Enter เพื่อ Finish
5. Esc เพื่อ Cancel

### No-Go

ใช้กับเครื่องจักร ชั้นวาง บันได พื้นที่อันตราย หรือพื้นที่ห้าม AMR เข้า

### Slow

เหมาะกับทางแคบ จุดตัด หน้าประตู หรือพื้นที่คนเดิน สามารถตั้ง Max Speed ได้

### Human Traffic

ใช้สำหรับพื้นที่ที่คนเดินผ่านบ่อย

---

# 11. Occupancy Brush Tools

เลือก **Brush** หรือกด:

```text
B
```

เมื่อ Brush active จะมี Brush Toolbar บน canvas

## Brush Size

เลือกได้:

```text
1 / 3 / 5 / 10 / 20 / 50 px
```

Brush Size มีผลกับ Freehand, Line และ Eraser

## 11.1 Freehand

ใช้ลากวาด obstacle แบบอิสระ

```text
Brush → Freehand → เลือก Size → Drag
```

เหมาะกับการเก็บรายละเอียดเล็ก ๆ หรือแก้ obstacle เฉพาะจุด

## 11.2 Line

สร้าง obstacle เป็นเส้นตรง

```text
Brush → Line → Drag Start → End
```

ความหนาใช้ Brush Size

เหมาะกับ:

- เพิ่ม wall เส้นตรง
- ปิดช่องทาง
- วาด barrier

## 11.3 Rectangle

ลากจากมุมหนึ่งไปอีกมุมหนึ่งเพื่อสร้างพื้นที่สี่เหลี่ยม

```text
Brush → Rectangle → Drag
```

เหมาะกับ:

- Rack
- Machine footprint
- Blocked area

## 11.4 Polygon

ใช้วาดพื้นที่ obstacle รูปร่างอิสระ

1. เลือก `Brush → Polygon`
2. คลิกเพิ่ม vertices
3. จะเห็น preview ก่อน apply
4. Double Click / Enter หรือกด **Apply Polygon**
5. กด **Clear** เพื่อล้าง polygon ที่กำลังร่าง
6. Esc เพื่อ Cancel current operation

เหมาะกับเครื่องจักรหรือพื้นที่รูปร่างไม่เป็นสี่เหลี่ยม

## Eraser

เลือก Eraser หรือกด:

```text
E
```

Eraser จะ **restore pixel จาก original imported map** ไม่ใช่เพียงวาดสีขาวทับ

> Occupancy edit สามารถ Undo/Redo ได้

---

# 12. Preview Mode

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

### แนะนำให้ใช้ Preview ก่อน

- Validate
- Save Revision / Save As
- Export Navigation JSON
- Export ROS Map

เพื่อตรวจว่าไม่มีชื่อซ้อน จุดวางผิด Path ผิดทิศ หรือ Zone ครอบผิดพื้นที่

---

# 13. Robot Configuration

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

# 14. Measurement

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

# 15. Validation

กด **Validate**

ระบบตรวจอย่างน้อย:

### Objects

- Object outside map
- Object / Station inside obstacle
- Duplicate IDs

### Paths

- Path intersects obstacle
- Path enters No-Go Zone
- Path narrower than robot footprint
- Disconnected path
- Zero-length path segment

### Zones

- Invalid polygon
- Self-intersection
- Zone outside map
- Conflicting zones

### Robot Clearance

ตรวจ Robot footprint + Safety Margin กับ obstacle/restricted area

คลิก Validation Issue เพื่อ select และ center ไปยังตำแหน่งปัญหา

---

# 16. Save / Autosave / Open

## Save

กด:

```text
Ctrl/Cmd + S
```

หรือปุ่ม Save

Project ถูกบันทึกลง IndexedDB

## Autosave

มี debounce autosave หลังแก้ข้อมูลประมาณ 1–2 วินาที

สถานะ:

```text
Unsaved
Saving…
Saved locally
```

## Save As

ดาวน์โหลดไฟล์:

```text
project-name.amrmap
```

เก็บ complete project state สำหรับเปิดกลับมาแก้ต่อ

## Open

รองรับ:

```text
.amrmap
.json
```

Project จะผ่าน schema validation ก่อน load

---

# 17. Export

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

# 18. Navigation JSON Format

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

### Important

- `waypoints` รวม navigation objects ทุกประเภท เช่น Home, Charging, Docking, Pickup, Drop-off, Waiting, Parking และ Waypoint
- ใช้ `type` แยกชนิด
- `x`, `y` เป็น **world coordinate หน่วย meter**
- `yaw` เป็น **radian**
- Path points และ Zone polygon เป็น world coordinates เช่นกัน
- ห้ามนำ screen/pixel coordinate ไปใช้เป็น navigation coordinate

---

# 19. Keyboard Shortcuts

| Shortcut | Function |
|---|---|
| `V` | Select |
| `H` | Pan |
| `B` | Brush |
| `E` | Eraser |
| `P` | Path |
| `Z` | Zone |
| `M` | Measure |
| `Delete` | Delete Selection |
| `Ctrl/Cmd + C` | Copy |
| `Ctrl/Cmd + V` | Paste |
| `Ctrl/Cmd + D` | Duplicate |
| `Ctrl/Cmd + S` | Save |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Esc` | Cancel Current Tool |

---

# 20. Recommended Workflow

```text
Import YAML + PGM
        ↓
Fit Map
        ↓
ตรวจ Resolution / Origin
        ↓
Clean Occupancy Map
(Freehand / Line / Rectangle / Polygon)
        ↓
สร้าง HOME / CHARGE / DOCK
        ↓
สร้าง Pickup / Drop-off
        ↓
วาง Waypoints ตาม Junction / Turn
        ↓
สร้าง Navigation Paths
        ↓
สร้าง Zones
        ↓
ตั้ง Robot Configuration
        ↓
Preview
        ↓
Validate
        ↓
แก้ Errors / Warnings
        ↓
Save / Save As
        ↓
Export Navigation JSON / ROS Map
```

---

# 21. Troubleshooting

## 21.1 Import สำเร็จแต่ Map ไม่ขึ้น

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

## 21.2 React-Konva error

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

## 21.3 YAML หา image ไม่พบ

ถ้า YAML มี:

```yaml
image: warehouse_map.pgm
```

ต้องเลือก `warehouse_map.pgm` มาพร้อม YAML ในครั้งเดียว

## 21.4 Preview ไม่มีบาง layer

ตรวจ Layers ใน editor ก่อน และตรวจว่า entity ถูก `enabled`

## 21.5 Path validation ขึ้น disconnected

ตรวจว่าปลาย path อยู่ที่ node ที่ต้องการเชื่อมจริง และ junction สำคัญควรถูกแบ่งเป็น path segments

## 21.6 Export ROS ไม่ได้

ต้องมี:

- Valid occupancy map
- Width / Height ที่ถูกต้อง
- Resolution > 0

---

# 22. Tests

Unit tests ครอบคลุม logic เช่น:

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

รัน:

```bash
npm test
```

Build:

```bash
npm run build
```

---

# 23. Project Structure

```text
src/
  components/
    editor/
    toolbar/
    sidebar/
    inspector/
    validation/
    dialogs/

  map-engine/
    coordinates.ts
    viewport.ts

  geometry/
    polygon.ts
    collision.ts
    distance.ts

  validation/
    validator.ts

  state/
    editorStore.ts
    projectStore.ts

  services/
    import/
      mapImporter.ts
      pgmParser.ts
      yamlMapParser.ts
      projectImporter.ts

    export/
      projectExporter.ts
      rosExporter.ts
      navigationExporters.ts

    persistence/
      indexedDb.ts

    mapEditing/
      occupancyEditor.ts

  schemas/
    projectSchema.ts

  utils/
    files.ts
```

Architecture แยก UI / map engine / geometry / validation / persistence / import-export เพื่อรองรับ ROS2, REST API, WebSocket และ Fleet Manager ในอนาคต

---

# 24. Known Limitations

ฟังก์ชัน Deploy ยังไม่ได้เชื่อมกับ robot/fleet backend จริง และจะไม่แสดง fake success

สิ่งที่ยังสามารถพัฒนาต่อ:

- Free-space / Unknown occupancy brush modes
- Fill tool
- Advanced multi-selection / box selection
- Insert/Delete individual path vertex ผ่าน dedicated commands
- Insert/Delete individual zone vertex ผ่าน dedicated commands
- Whole-zone drag refinement
- Revision history / compare revisions
- Recent Projects management UI
- Real deployment API
- ROS2 integration
- Fleet Manager integration
- Authentication / authorization
- Browser-level integration/E2E tests เพิ่มเติม

---

## Production Safety Note

AMR Map Editor อยู่ในสถานะ Engineering Tool / Development Project

ก่อนนำข้อมูลไปใช้กับ AMR จริงใน production ควรตรวจสอบอย่างน้อย:

- Map resolution / origin / ROS frame
- Robot footprint
- Safety margin / clearance
- Navigation graph connectivity
- One-way direction
- No-Go / Slow / Human Traffic zones
- Charging / Docking pose และ yaw
- Validation errors ทั้งหมด
- ทดสอบใน staging/test environment ก่อน deploy ไป production


## Delete a Single Path Point / Vertex

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



## Path Connectivity / Junctions (v0.8.0)

ในเวอร์ชัน 0.8.0 การที่ Path สองเส้นดูเหมือนแตะหรือตัดกันบนหน้าจอ **ไม่ถือว่าเชื่อมกันโดยอัตโนมัติ** ระบบใช้ topology connection ที่เกิดจากพิกัด vertex ที่ตรงกันจริง

### สัญลักษณ์ CONNECTED

เมื่อ Path endpoint เชื่อมกับ Waypoint / Station / Path อื่นจริง จะเห็น **จุด Junction สีเขียว** พร้อมคำว่า `CONNECTED` บน Map

```text
PATH-A ─────●───── PATH-B
            ↑
       green junction
```

จุดสีเขียวหมายถึง Path share coordinate/vertex เดียวกันจริง ไม่ใช่แค่เส้นวาดทับกัน

### Auto Snap

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

### Path Connectivity panel

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

### Connect vs Merge

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

### Validation เพิ่มเติม

Validate Map จะเตือนกรณี:

```text
Path A crosses Path B visually but no topology junction exists.
```

หมายความว่าเส้นตัดกันบนภาพ แต่ไม่ได้ share vertex จริง ให้ใช้ Connect หรือแก้ vertex ให้ตรงกันจนเห็นจุด `CONNECTED` สีเขียว

## Custom Export File Name (v0.8.1)

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
