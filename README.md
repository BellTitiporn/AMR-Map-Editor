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

Navigation Objects คือ **จุดเชิงตรรกะ (logical nodes)** บนแผนที่ที่ใช้บอกว่า Robot สามารถไปถึงจุดใด หยุดที่ใด เริ่ม/จบงานที่ใด หรือทำ operation อะไรเมื่อถึงตำแหน่งนั้น

Navigation Object ทุกประเภทมีข้อมูลพื้นฐานคล้ายกัน:

```ts
{
  id,
  name,
  type,
  x,
  y,
  yaw,
  description,
  enabled
}
```

- `x`, `y` = World Coordinate หน่วยเมตร
- `yaw` = Heading/Orientation ของ Robot ที่จุดนั้น
- `type` = ความหมายเชิงงานของจุด
- `enabled` = เปิด/ปิดการใช้งานโดยไม่ต้องลบออกจาก Project

> จุดที่ Robot ต้องไปถึงจริง เช่น Pickup, Drop-off, Charging, Docking, Waiting หรือ Parking ควรเชื่อมกับ Path topology จริง ไม่ใช่เพียงวางไว้ใกล้เส้น Path

## 7.1 Waypoint

**Waypoint** คือจุดอ้างอิงทั่วไปของ Navigation Graph ใช้กับ Junction, จุดเลี้ยว, ทางเข้า/ออก corridor, จุดเปลี่ยน traffic rule หรือจุดแบ่ง Path เป็น segment

```text
WP-001 ●────────● WP-002
                │
                ● WP-003
```

Robot ไม่จำเป็นต้องหยุดที่ Waypoint ทุกจุด เพราะ Waypoint อาจเป็นเพียง node ที่ planner ใช้ตัดสินใจเลือกเส้นทาง

**ควรใช้เมื่อ:** จุดนั้นสำคัญต่อ routing topology แต่ไม่ได้เป็น task station โดยตรง

**ไม่จำเป็นต้องใช้เมื่อ:** เป็นทางตรงยาวที่ไม่มี junction, turn หรือ rule change

---

## 7.2 Home

**Home** คือจุดฐานหรือจุดเริ่มต้นประจำของ Robot

เหมาะสำหรับ:

- จุดเริ่มต้นเชิง operation
- จุดที่ Robot กลับมารอเมื่อเริ่ม/จบ shift
- Default base position

```text
HOME ●────────● WP-001
```

**ต่างจาก Parking:** Home เป็นฐานหลัก ส่วน Parking เป็นจุดจอด idle ที่อาจมีหลายตำแหน่ง

---

## 7.3 Charging Station

**Charging Station** คือจุดสำหรับ Dock เพื่อชาร์จแบตเตอรี่

เหมาะสำหรับ:

- Auto charging
- Opportunity charging
- Low-battery recovery
- Fleet charging strategy

```text
Path ─────────● CHARGE-01
               ↑
             Heading
```

Position และโดยเฉพาะ `yaw` ต้องแม่น เพราะ Robot มักต้องเข้าหา charger ใน orientation ที่กำหนด

ตัวอย่าง logic:

```text
Battery < 20%
→ Route to CHARGE-01
→ Dock
→ Charge
```

ควรมี Path endpoint หรือ junction ที่เชื่อมถึง Charging Station จริง และควรมี approach path ที่ปลอด obstacle

---

## 7.4 Docking Station

**Docking Station** คือจุดที่ Robot ต้องเข้าจอดเทียบกับอุปกรณ์หรือสถานี เช่น Conveyor, Machine, Lift interface, Workstation หรือ Material transfer station

```text
AMR → DOCK-01 → Conveyor
```

**ต่างจาก Charging Station:** Charging เป็น docking เพื่อชาร์จไฟ ส่วน Docking Station ทั่วไปใช้ interface กับอุปกรณ์อื่น

Position และ Yaw สำคัญมากเพราะ docking มักมี tolerance จำกัด

---

## 7.5 Pickup Point

**Pickup Point** คือจุดที่ Robot รับวัสดุหรือสินค้า เช่น Pallet, Tote, Tray หรือ Material จาก conveyor

```text
Robot
  ↓
PICKUP-A
  ↓
Load material
```

Pickup ต้องเป็น destination ที่เข้าถึงได้จริง จึงควรเชื่อมกับ Path topology ไม่ควรแค่วางจุดไว้ใกล้ Path

หากต้องเข้ารับของจากทิศเฉพาะ ควรกำหนด Yaw ให้ตรงกับ approach direction

---

## 7.6 Drop-off Point

**Drop-off Point** คือจุดที่ Robot ส่งหรือปล่อยวัสดุ

```text
PICKUP-A
   ↓
   ↓ Path
   ↓
DROPOFF-A
```

ตัวอย่าง workflow:

```text
Go to PICKUP-A
→ Pickup
→ Go to DROPOFF-A
→ Drop-off
```

ควรเป็น node ที่เชื่อมกับ Path จริงเช่นเดียวกับ Pickup

---

## 7.7 Waiting Point

**Waiting Point** คือจุดให้ Robot หยุดรอชั่วคราวระหว่าง workflow

เหมาะสำหรับ:

- รอก่อนเข้า aisle แคบ
- รอก่อนเข้า lift
- รอ machine ready
- รอ traffic clearance
- Queueing point

```text
WAIT-01 ●
         │
         │  Wait until corridor is clear
         ▼
      Production
```

**ต่างจาก Waypoint:** Waypoint เป็น routing node ทั่วไป ส่วน Waiting Point มีความหมายว่า Robot สามารถถูกสั่งให้หยุดรอที่จุดนั้นได้

---

## 7.8 Parking Point

**Parking Point** คือจุดสำหรับจอด Robot เมื่อไม่มีงานหรือไม่ได้ใช้งานชั่วคราว

เหมาะสำหรับ Idle parking, Fleet staging หรือจุดจอดสำรอง

```text
PARK-01 ●
PARK-02 ●
PARK-03 ●
```

**ต่างจาก Waiting:** Waiting คือรอชั่วคราวระหว่าง task/traffic ส่วน Parking คือจอด idle นานกว่าและมักอยู่นอก main traffic lane

---

## วิธีสร้าง Navigation Object

1. ไปที่ Tab **Objects**
2. เลือก Object Type
3. คลิก `+` หรือรายการนั้น
4. คลิกตำแหน่งบน Map
5. Object ใหม่จะถูก Select
6. แก้ Properties ทางขวา

สามารถแก้ Name, ID, Type, X, Y, Heading/Yaw, Description และ Enabled

## สรุป Navigation Objects

| Object | ความหมายหลัก | Robot มักทำอะไรเมื่อถึงจุด |
|---|---|---|
| Waypoint | Routing node | ผ่าน / เลี้ยว / เลือกเส้นทาง |
| Home | ฐานประจำ | เริ่มงาน / กลับฐาน |
| Charging Station | จุดชาร์จ | Dock และชาร์จ |
| Docking Station | จุดเทียบอุปกรณ์ | Dock กับ machine/conveyor |
| Pickup Point | จุดรับของ | หยุดและรับวัสดุ |
| Drop-off Point | จุดส่งของ | หยุดและส่งวัสดุ |
| Waiting Point | จุดรอชั่วคราว | Queue / รอ traffic |
| Parking Point | จุดจอด idle | จอดเมื่อไม่มีงาน |

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

Path คือ **เส้นทางที่ Robot ได้รับอนุญาตให้เดินทาง** ระหว่าง Navigation Nodes หรือพื้นที่ต่าง ๆ บนแผนที่

```text
Navigation Object = Node
Path              = Edge
```

Path สามารถเก็บ Name/ID, Type, Points/Vertices, Maximum Speed, Width, Safety Clearance, Priority, Robot Types และ Enabled

## Path Types

รองรับ:

- Normal Path
- Preferred Path
- One-way Path
- Bidirectional Path
- Restricted Path

## 9.1 Normal Path

**Normal Path** คือเส้นทางมาตรฐาน ไม่มี preference หรือ restriction พิเศษ

```text
A ●────────────● B
```

เหมาะกับ Corridor ทั่วไป, Connector route และเส้นทางพื้นฐานระหว่าง waypoint

---

## 9.2 Preferred Path

**Preferred Path** คือเส้นทางที่ต้องการให้ planner/fleet manager เลือกก่อนเมื่อมีหลาย route ไปถึงปลายทางเดียวกัน

เหมาะกับ:

- Main transport corridor
- Route ที่ปลอดภัยหรือกว้างกว่า
- Route ที่ต้องการลด traffic ในพื้นที่อื่น
- เส้นที่ต้องการ lower planning cost

ตัว Editor เก็บ `type = preferred` ส่วน planner/backend เป็นผู้ตีความ priority/cost จริง

---

## 9.3 One-way Path

**One-way Path** อนุญาตให้ Robot วิ่งได้เพียงทิศเดียว

```text
A ●────────────→● B
```

Direction อิงตามลำดับ vertex:

```text
A → B → C
```

เหมาะกับ Aisle แคบ, Corridor ที่สวนกันไม่ได้, Production flow ทางเดียว หรือพื้นที่ที่ต้องลด deadlock

บน Map มี direction arrows และ badge `ONE-WAY A → B`

หากทิศผิด ใช้ **Reverse Direction**

---

## 9.4 Bidirectional Path

**Bidirectional Path** หรือ Two-way Path อนุญาตให้ Robot ใช้เส้นเดียวกันได้ทั้งสองทิศ

```text
A ●←──────────→● B
```

เหมาะกับ Corridor กว้าง, Aisle ที่สวนกันได้ หรือ Connector route ที่ไม่มี direction restriction

> Two-way ไม่ได้หมายความว่าปลอดภัยเสมอ ควรตรวจ Robot Width + Safety Margin + Passing Clearance เทียบกับความกว้าง aisle จริง

---

## 9.5 Restricted Path

**Restricted Path** คือเส้นทางที่มีข้อจำกัดการใช้งาน เช่น:

- เฉพาะ Robot Type บางรุ่น
- จำกัด Max Speed
- ใช้เฉพาะ Maintenance
- ใช้เฉพาะบาง operation
- จำกัด priority

ตัวอย่าง:

```json
{
  "type": "restricted",
  "maxSpeed": 0.5,
  "robotTypes": ["TUG-600"]
}
```

Backend/Fleet Manager เป็นผู้ enforce policy เหล่านี้จริง

---

## สรุป Path Types

| Path Type | ความหมาย | ตัวอย่างการใช้งาน |
|---|---|---|
| Normal | เส้นทางมาตรฐาน | Corridor ทั่วไป |
| Preferred | ควรเลือกก่อน route อื่น | Main transport route |
| One-way | วิ่งได้ทิศเดียว | Aisle แคบ / traffic loop |
| Bidirectional | วิ่งได้สองทิศ | Main aisle ที่กว้าง |
| Restricted | มีข้อจำกัดการใช้งาน | Robot เฉพาะรุ่น / special area |

## วิธีสร้าง Path

1. เลือก Path Type
2. คลิกจุดแรก
3. คลิกจุดต่อ ๆ ไปเพื่อเพิ่ม Vertex
4. Double Click หรือ Enter เพื่อ Finish
5. Esc เพื่อ Cancel

## Path ควรเชื่อมกับ Navigation Object หรือแค่ลากผ่าน?

จุดที่เป็น **task destination หรือ routing decision** ควรเชื่อม topology จริง เช่น Waypoint ที่เป็น Junction, Home, Charging, Docking, Pickup, Drop-off, Waiting และ Parking

ตัวอย่างที่ดี:

```text
HOME ●────● WP-001 ────● PICKUP-A
```

ถ้า Path แค่ลากผ่าน Pickup แต่ไม่ได้ share vertex/connection ระบบ routing อาจมองว่า Pickup ไม่ได้ connected

## Path จำเป็นต้องผ่าน Waypoint ทุกจุดหรือไม่?

**ไม่จำเป็น**

Intermediate vertex ใช้ดัดรูป Path ให้ตาม corridor ได้โดยไม่ต้องเป็น Waypoint

```text
WP-001 ●
        \
         ○  ← Path Vertex
          \
           ○────────● WP-002
```

แต่ junction, station หรือ destination ควรเป็น navigation node จริง

## One-way / Two-way Path

ใน Properties สามารถสลับ:

```text
[ One-way  A → B ]   [ Two-way  A ↔ B ]
```

> ลูกศรบน **Path** = ทิศทางที่ Robot ได้รับอนุญาตให้เดินทาง  
> ลูกศรบน **Navigation Object** = Heading/Orientation ที่ Robot ควรหันเมื่ออยู่ที่จุดนั้น

---

# 10. Zones

Zone คือ **พื้นที่ Polygon ที่กำหนดกฎหรือความหมายพิเศษบนแผนที่** เช่น พื้นที่ห้ามเข้า, จำกัดความเร็ว, จำกัด robot, พื้นที่จอด หรือพื้นที่คนเดิน

รองรับ:

- No-Go Zone
- Slow Zone
- Restricted Zone
- Parking Zone
- Loading Zone
- Unloading Zone
- Human Traffic Zone
- Safety Zone

## 10.1 No-Go Zone

**No-Go Zone** คือพื้นที่ที่ Robot ไม่ควรเข้าโดยเด็ดขาด

เหมาะสำหรับ Machine footprint, ชั้นวาง, บันได, Drop edge, พื้นที่อันตราย หรือพื้นที่สงวน

```text
┌─────────────────┐
│   NO-GO ZONE    │
│    MACHINE      │
└─────────────────┘
```

Validation สามารถเตือนเมื่อ Path เข้า No-Go Zone

---

## 10.2 Slow Zone

**Slow Zone** คือพื้นที่ที่ Robot ยังเข้าได้ แต่ต้องจำกัดความเร็ว

เหมาะกับ:

- ทางแคบ
- Blind corner
- หน้าประตู
- Intersection
- พื้นที่ใกล้ operator
- บริเวณก่อน docking

ตัวอย่าง:

```text
Max Speed = 0.5 m/s
```

Backend/Fleet สามารถนำค่า speed limit ไป enforce ได้

---

## 10.3 Restricted Zone

**Restricted Zone** คือพื้นที่ที่เข้าได้เฉพาะตามเงื่อนไข เช่นเฉพาะ Robot Type, Task, Authorized robot หรือช่วงเวลาที่กำหนด

ใช้เมื่อไม่ต้องการห้ามแบบ No-Go แต่ต้องมี access control

---

## 10.4 Parking Zone

**Parking Zone** คือพื้นที่ที่กำหนดไว้สำหรับจอด Robot เช่น Idle parking หรือ Fleet staging area

**ต่างจาก Parking Point:**

- Parking Point = ตำแหน่งจอดเฉพาะจุด
- Parking Zone = พื้นที่ที่อนุญาตให้ใช้เป็นบริเวณจอด

สามารถใช้ร่วมกันได้ เช่น Parking Zone ครอบ PARK-01, PARK-02 และ PARK-03

---

## 10.5 Loading Zone

**Loading Zone** คือพื้นที่สำหรับ operation รับ/โหลดวัสดุ เช่น Pallet loading, Operator loading, Conveyor loading หรือ Material staging ก่อน Pickup

มักใช้ร่วมกับ `Pickup Point`

```text
┌──── LOADING ZONE ────┐
│      ● PICKUP-A      │
└──────────────────────┘
```

---

## 10.6 Unloading Zone

**Unloading Zone** คือพื้นที่สำหรับส่ง/ปล่อยวัสดุ เช่น Drop-off operation, Conveyor unloading, Material handoff หรือ Finished goods delivery

มักใช้ร่วมกับ `Drop-off Point`

---

## 10.7 Human Traffic Zone

**Human Traffic Zone** คือพื้นที่ที่มีคนเดินหรือมี interaction ระหว่างคนกับ AMR สูง

เหมาะสำหรับ:

- Pedestrian crossing
- Walkway
- ประตูเข้า/ออก
- จุดรวมคน
- Production operator area
- Shared corridor

ข้อมูลนี้อาจใช้ร่วมกับการลด Max Speed, เพิ่ม Safety Margin หรือปรับ route priority

> Human Traffic Zone ไม่ได้ทดแทนระบบ safety จริง เช่น Safety PLC, scanner field หรือ E-stop

---

## 10.8 Safety Zone

**Safety Zone** คือพื้นที่ที่ต้องการกำหนดข้อควรระวังพิเศษด้าน safety

เหมาะกับ Hazard buffer, Machine interaction area, จุดที่ต้องเพิ่ม clearance หรือพื้นที่ที่ต้องลด speed เพิ่มเติม

Backend ในอนาคตสามารถตีความ zone นี้เพื่อเพิ่ม clearance, จำกัด speed หรือจำกัด robot type

---

## สรุป Zone Types

| Zone | ความหมาย | ตัวอย่าง |
|---|---|---|
| No-Go | ห้ามเข้า | Machine / Stair / Hazard |
| Slow | เข้าได้แต่ลดความเร็ว | Door / Narrow aisle |
| Restricted | เข้าได้ตามเงื่อนไข | Authorized robots |
| Parking | พื้นที่จอด | Fleet parking area |
| Loading | พื้นที่รับ/โหลดของ | Pickup operation |
| Unloading | พื้นที่ส่ง/ลงของ | Drop-off operation |
| Human Traffic | พื้นที่คนเดิน | Pedestrian crossing |
| Safety | พื้นที่ safety พิเศษ | Hazard buffer |

## วิธีสร้าง Zone

1. ไปที่ Tab **Zones**
2. เลือก Zone Type
3. คลิก Polygon Vertices
4. ต้องมีอย่างน้อย 3 จุด
5. Double Click หรือ Enter เพื่อ Finish
6. Esc เพื่อ Cancel

หลังสร้างสามารถแก้ Name, Type, Max Speed, Robot Access, Enabled และ Polygon vertices

> หลีกเลี่ยงการสร้าง Zone ซ้อนกันโดยไม่มี policy ชัดเจน เพราะ rule อาจ conflict เช่น Slow Zone ซ้อน No-Go Zone

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