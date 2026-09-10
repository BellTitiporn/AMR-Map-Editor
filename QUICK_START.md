# Quick Start

1. Open this folder in VS Code.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the editor:
   ```bash
   npm run dev
   ```
4. Run tests:
   ```bash
   npm test
   ```
5. Production build:
   ```bash
   npm run build
   ```

The project uses browser IndexedDB for local project persistence. Large map images are not stored in LocalStorage.


## Path connection

ลาก endpoint ของ Path เข้าใกล้ Waypoint/Station/Path ภายใน 0.25 m เพื่อ Auto Snap เมื่อเชื่อมจริงจะเห็นจุดสีเขียว `CONNECTED` หากต้องการเชื่อมแบบ manual ให้เลือก Path → Properties → PATH CONNECTIVITY → Connect Start/End/Both.
