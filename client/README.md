# Fac Vision - Industrial Machine Vision Inspection System

ระบบตรวจสอบคุณภาพด้วย AI สำหรับงานอุตสาหกรรม รองรับกล้อง Industrial Camera หลายประเภท พร้อมระบบ Integration กับ PLC และ IoT

---

---

## สารบัญ

- [ภาพรวมระบบ](#ภาพรวมระบบ)
- [คุณสมบัติหลัก](#คุณสมบัติหลัก)
- [System Requirements](#system-requirements)
- [การติดตั้ง](#การติดตั้ง)
- [การใช้งานแต่ละหน้า](#การใช้งานแต่ละหน้า)
- [Workflow การใช้งาน](#workflow-การใช้งาน)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## ภาพรวมระบบ

Fac Vision เป็นระบบ Machine Vision สำหรับตรวจสอบคุณภาพในโรงงานอุตสาหกรรม โดยใช้ AI/Deep Learning ในการวิเคราะห์ภาพ พร้อมรองรับการเชื่อมต่อกับระบบอัตโนมัติผ่าน Modbus TCP และ MQTT

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Fac Vision System                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌───────────┐    ┌───────────┐    ┌───────────┐              │
│   │   RTSP    │    │   GigE    │    │   HTTP    │   Cameras    │
│   │  Camera   │    │  Camera   │    │  Camera   │              │
│   └─────┬─────┘    └─────┬─────┘    └─────┬─────┘              │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          ▼                                      │
│                  ┌───────────────┐                              │
│                  │ Image Capture │                              │
│                  │    Module     │                              │
│                  └───────┬───────┘                              │
│                          ▼                                      │
│                  ┌───────────────┐                              │
│                  │  AI Inference │                              │
│                  │    Engine     │                              │
│                  └───────┬───────┘                              │
│                          ▼                                      │
│         ┌────────────────┼────────────────┐                     │
│         ▼                ▼                ▼                     │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│   │ Database │    │  Modbus  │    │   MQTT   │   Actions       │
│   │ Logging  │    │   TCP    │    │  Broker  │                 │
│   └──────────┘    └──────────┘    └──────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## คุณสมบัติหลัก

### 1. รองรับกล้องหลายประเภท

| ประเภท          | Protocol                     | Use Case                                 |
| --------------- | ---------------------------- | ---------------------------------------- |
| **RTSP**        | Real Time Streaming Protocol | IP Camera ทั่วไป, Network Camera         |
| **GigE Vision** | GigE Vision Protocol         | Industrial Camera, High-speed Inspection |
| **HTTP**        | HTTP/HTTPS                   | Web Camera, REST API Camera              |

### 2. โหมดการทำงาน

- **Auto Mode** - ประมวลผลต่อเนื่องอัตโนมัติ
- **Snapshot Mode** - ถ่ายภาพตาม Trigger Signal

### 3. Trigger Sources (สำหรับ Snapshot Mode)

- Digital Input (DI)
- Modbus Register
- MQTT Topic
- HTTP Webhook
- Timer Interval

### 4. AI Model Support

- ONNX Runtime
- TensorRT
- OpenVINO
- Custom Framework

### 5. Output Actions

- Database Logging (PostgreSQL, MySQL, SQLite)
- Modbus TCP (Write Coil/Register)
- MQTT Publish

---

## System Requirements

### Hardware Requirements

| Component | Minimum         | Recommended                        |
| --------- | --------------- | ---------------------------------- |
| CPU       | Intel i5 Gen 8+ | Intel i7 Gen 10+ / AMD Ryzen 7     |
| RAM       | 8 GB            | 16 GB+                             |
| GPU       | -               | NVIDIA GTX 1060+ (CUDA Support)    |
| Storage   | 256 GB SSD      | 512 GB NVMe SSD                    |
| Network   | 1 Gbps          | 1 Gbps (Dedicated for GigE Camera) |

### Software Requirements

| Software         | Version                      |
| ---------------- | ---------------------------- |
| Operating System | Windows 10/11, Ubuntu 20.04+ |
| Node.js          | 18.x LTS หรือสูงกว่า         |
| Python           | 3.9+ (สำหรับ Backend)        |
| Database         | PostgreSQL 14+ / MySQL 8+    |

### Network Requirements สำหรับ GigE Camera

```
Camera IP: 192.168.1.x
Host IP: 192.168.1.1
Subnet Mask: 255.255.255.0
MTU: 9000 (Jumbo Frame)
```

---

## การติดตั้ง

### ขั้นตอนที่ 1: Clone Repository

```bash
git clone https://github.com/your-org/fac-vision.git
cd fac-vision
```

### ขั้นตอนที่ 2: ติดตั้ง Frontend Dependencies

```bash
npm install
# หรือ
pnpm install
```

### ขั้นตอนที่ 3: ติดตั้ง Backend (Python)

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### ขั้นตอนที่ 4: ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local` ใน root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/facvision

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000

# MQTT (Optional)
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# Modbus (Optional)
MODBUS_DEFAULT_PORT=502
```

### ขั้นตอนที่ 5: ตั้งค่า Database

```bash
# สร้าง Database
createdb facvision

# Run Migrations
npm run db:migrate
```

### ขั้นตอนที่ 6: เริ่มต้นระบบ

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd backend
python main.py
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

---

## การใช้งานแต่ละหน้า

### 1. Projects - จัดการโปรเจค

หน้าแรกของระบบ ใช้สำหรับจัดการโปรเจคตรวจสอบ

#### การสร้างโปรเจคใหม่

1. คลิกปุ่ม **"New Project"**
2. กรอกข้อมูล:
   - **Project Name** - ชื่อโปรเจค (เช่น "Line-A QC Inspection")
   - **Description** - รายละเอียดโปรเจค
3. คลิก **"Create"**

#### การจัดการโปรเจค

- **Edit** - แก้ไขชื่อและรายละเอียด
- **Delete** - ลบโปรเจค (ต้อง confirm)
- **Status Toggle** - เปิด/ปิดการทำงาน

#### ข้อมูลที่แสดง

| Field   | Description                                |
| ------- | ------------------------------------------ |
| Status  | Active (กำลังทำงาน) / Inactive (หยุดทำงาน) |
| Cameras | จำนวนกล้องที่เชื่อมต่อ                     |
| Models  | จำนวนโมเดลที่ใช้                           |
| Created | วันที่สร้าง                                |

---

### 2. Cameras - ตั้งค่ากล้อง

จัดการการเชื่อมต่อกล้องทุกประเภท

#### การเพิ่มกล้องใหม่

1. คลิกปุ่ม **"Add Camera"**
2. เลือก **Camera Type**:
   - RTSP
   - GigE Vision
   - HTTP

#### การตั้งค่าตามประเภทกล้อง

**RTSP Camera:**

```
URL: rtsp://username:password@192.168.1.100:554/stream1
```

**GigE Vision Camera:**

```
IP Address: 192.168.1.10
Port: 3956 (default)
```

**HTTP Camera:**

```
URL: http://192.168.1.20/capture
Method: GET
Headers: (Optional)
```

#### Camera Settings

| Parameter     | Description    | Range               |
| ------------- | -------------- | ------------------- |
| Resolution    | ความละเอียดภาพ | 640x480 - 4096x2160 |
| Frame Rate    | อัตราเฟรม      | 1-120 fps           |
| Exposure      | ค่าแสง         | Auto / Manual (μs)  |
| Gain          | ค่า Gain       | Auto / Manual (dB)  |
| White Balance | สมดุลแสงขาว    | Auto / Manual       |
| Gamma         | ค่า Gamma      | 0.5 - 2.0           |

#### โหมดการทำงาน

**Auto Mode:**

- ประมวลผลต่อเนื่อง
- เหมาะกับ Continuous Inspection

**Snapshot Mode:**

- ถ่ายภาพตาม Trigger
- Trigger Sources:
  - **Digital Input** - สัญญาณจาก Sensor/PLC
  - **Modbus** - Register Change
  - **MQTT** - Topic Message
  - **HTTP** - Webhook Call
  - **Timer** - ตามเวลาที่กำหนด

#### การทดสอบการเชื่อมต่อ

1. คลิกปุ่ม **"Test Connection"**
2. ระบบจะทดสอบและแสดงผล:
   - Connection Status
   - Preview Image
   - Camera Info (Model, Serial, etc.)

---

### 3. Models - จัดการโมเดล AI

อัพโหลดและตั้งค่าโมเดล AI สำหรับการตรวจสอบ

#### Supported Model Formats

| Format   | Extension     | Framework       |
| -------- | ------------- | --------------- |
| ONNX     | .onnx         | ONNX Runtime    |
| TensorRT | .engine, .trt | NVIDIA TensorRT |
| OpenVINO | .xml, .bin    | Intel OpenVINO  |
| PyTorch  | .pt, .pth     | PyTorch         |

#### การอัพโหลดโมเดล

1. คลิก **"Upload Model"**
2. เลือกไฟล์โมเดล
3. กรอกข้อมูล:
   - **Model Name** - ชื่อโมเดล
   - **Version** - เวอร์ชัน
   - **Description** - รายละเอียด
4. รอการ Upload และ Validation

#### Model Classes

หลังจาก Upload สำเร็จ ระบบจะแสดง Classes ที่โมเดลตรวจจับได้:

```
Classes:
├── 0: OK (Good Product)
├── 1: Scratch (รอยขีดข่วน)
├── 2: Dent (รอยบุบ)
├── 3: Crack (รอยแตก)
└── 4: Missing Part (ชิ้นส่วนหาย)
```

#### Model Configuration

| Parameter            | Description                 | Default |
| -------------------- | --------------------------- | ------- |
| Confidence Threshold | ค่าความมั่นใจขั้นต่ำ        | 0.5     |
| IoU Threshold        | ค่า Intersection over Union | 0.45    |
| Max Detections       | จำนวน Detection สูงสุด      | 100     |

#### ROI (Region of Interest)

กำหนดพื้นที่ที่ต้องการตรวจสอบ:

1. คลิก **"Configure"** บนโมเดล
2. ไปที่ Tab **"ROI"**
3. วาดกรอบพื้นที่ด้วยเมาส์
4. สามารถสร้างได้หลาย ROI

#### การทดสอบโมเดล

1. คลิก **"Test"** บนโมเดล
2. เลือกวิธีการทดสอบ:
   - **Upload Image** - อัพโหลดรูปทดสอบ
   - **Camera Capture** - ถ่ายจากกล้อง
3. ดูผลลัพธ์:
   - Bounding Boxes
   - Class Labels
   - Confidence Scores
   - Inference Time

---

### 4. Live View - แสดงผล Real-time

หน้าจอแสดงผลการตรวจสอบแบบ Real-time

#### ส่วนประกอบหน้าจอ

```
┌─────────────────────────────────────────────────────────────┐
│  Camera Select  │  Start/Stop  │  Recording  │  Settings   │
├─────────────────┴──────────────┴─────────────┴─────────────┤
│                                                             │
│                    ┌─────────────────┐                      │
│                    │                 │                      │
│                    │   Live Video    │                      │
│                    │   + Overlays    │                      │
│                    │                 │                      │
│                    └─────────────────┘                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Detection Results                                          │
│  ┌──────────┬───────────┬────────────┬─────────────────┐   │
│  │ Time     │ Class     │ Confidence │ Action          │   │
│  ├──────────┼───────────┼────────────┼─────────────────┤   │
│  │ 10:30:01 │ Scratch   │ 0.95       │ Logged, Modbus  │   │
│  │ 10:30:02 │ OK        │ 0.98       │ Logged          │   │
│  └──────────┴───────────┴────────────┴─────────────────┘   │
│                                                             │
├──────────────────────┬──────────────────────────────────────┤
│  Statistics          │  Class Distribution                  │
│  • Total: 1,234      │  [Chart]                             │
│  • Pass: 1,200       │                                      │
│  • Fail: 34          │                                      │
│  • Yield: 97.2%      │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

#### การใช้งาน

1. **เลือกกล้อง** จาก Dropdown
2. **เลือกโมเดล** ที่จะใช้
3. คลิก **"Start"** เพื่อเริ่มการตรวจสอบ
4. ดูผลลัพธ์แบบ Real-time

#### Overlay Information

ข้อมูลที่แสดงบนภาพ:

- Bounding Box (กรอบวัตถุ)
- Class Name (ชื่อ Class)
- Confidence Score (ค่าความมั่นใจ)
- ROI Boundaries (ขอบเขต ROI)

#### Recording

- บันทึกวิดีโอพร้อม Overlay
- Format: MP4 (H.264)
- บันทึกเฉพาะ Detection Events

---

### 5. Actions - ตั้งค่า Output Actions

กำหนดการทำงานเมื่อตรวจพบวัตถุ

#### 5.1 Database Logging

บันทึกผลลัพธ์ลงฐานข้อมูล

**การตั้งค่า:**

```
Database Type: PostgreSQL / MySQL / SQLite
Host: localhost
Port: 5432
Database: facvision
Username: admin
Password: ********
```

**ข้อมูลที่บันทึก:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary Key |
| timestamp | DateTime | เวลาที่ตรวจพบ |
| camera_id | String | ID กล้อง |
| model_id | String | ID โมเดล |
| class_name | String | ชื่อ Class |
| confidence | Float | ค่าความมั่นใจ |
| bbox | JSON | พิกัด Bounding Box |
| image_path | String | Path รูปภาพ |

#### 5.2 Modbus TCP

ส่งค่าไปยัง PLC ผ่าน Modbus TCP

**การตั้งค่า:**

```
Host: 192.168.1.50
Port: 502
Unit ID: 1
```

**Function Codes:**
| Function | Code | Description |
|----------|------|-------------|
| Write Single Coil | 05 | เขียน DO 1 bit |
| Write Single Register | 06 | เขียน Register 16 bit |
| Write Multiple Coils | 15 | เขียน DO หลาย bit |
| Write Multiple Registers | 16 | เขียน Register หลายตัว |

**ตัวอย่างการตั้งค่า:**

```
เมื่อตรวจพบ Class "Scratch":
  - Function: Write Single Coil (05)
  - Address: 100
  - Value: ON

เมื่อตรวจพบ Class "OK":
  - Function: Write Single Register (06)
  - Address: 200
  - Value: 1
```

#### 5.3 MQTT

Publish ข้อมูลไปยัง MQTT Broker

**การตั้งค่า:**

```
Broker URL: mqtt://192.168.1.100:1883
Username: (optional)
Password: (optional)
Client ID: facvision-01
Topic: facvision/results
QoS: 1
```

**Payload Format (JSON):**

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "camera_id": "CAM-001",
  "model_id": "MODEL-001",
  "detections": [
    {
      "class": "Scratch",
      "confidence": 0.95,
      "bbox": {
        "x": 100,
        "y": 150,
        "width": 50,
        "height": 30
      }
    }
  ],
  "summary": {
    "total_detections": 1,
    "pass": false
  }
}
```

---

### 6. Settings - ตั้งค่าระบบ

#### General Settings

| Setting    | Description         | Default |
| ---------- | ------------------- | ------- |
| Language   | ภาษาที่แสดง         | English |
| Theme      | ธีมหน้าจอ           | Dark    |
| Auto Start | เริ่มทำงานอัตโนมัติ | Off     |

#### Performance Settings

| Setting          | Description          | Default |
| ---------------- | -------------------- | ------- |
| GPU Acceleration | ใช้ GPU ประมวลผล     | On      |
| Max Workers      | จำนวน Worker Threads | 4       |
| Buffer Size      | ขนาด Frame Buffer    | 30      |

#### Storage Settings

| Setting       | Description         | Default          |
| ------------- | ------------------- | ---------------- |
| Image Storage | Path เก็บรูปภาพ     | ./storage/images |
| Video Storage | Path เก็บวิดีโอ     | ./storage/videos |
| Auto Cleanup  | ลบไฟล์เก่าอัตโนมัติ | 30 days          |

---

## Workflow การใช้งาน

### First Time Setup

```
1. สร้าง Project
   └── กำหนดชื่อและรายละเอียด

2. เพิ่มกล้อง
   ├── เลือกประเภท (RTSP/GigE/HTTP)
   ├── กรอก Connection Settings
   ├── ตั้งค่า Resolution, Frame Rate
   ├── เลือก Mode (Auto/Snapshot)
   └── Test Connection

3. อัพโหลดโมเดล
   ├── Upload ไฟล์โมเดล (.onnx, .engine)
   ├── ตรวจสอบ Classes
   ├── ตั้งค่า Confidence Threshold
   ├── กำหนด ROI (ถ้าต้องการ)
   └── Test Inference

4. ตั้งค่า Actions
   ├── Database Logging
   ├── Modbus TCP (ถ้าใช้)
   └── MQTT (ถ้าใช้)

5. เริ่มการตรวจสอบ
   └── ไปที่ Live View → Start
```

### Daily Operation

```
1. เปิดระบบ
2. ตรวจสอบ Camera Status
3. เริ่ม Inspection (Live View → Start)
4. Monitor ผลลัพธ์
5. ตรวจสอบ Logs/Reports
```

---

## API Reference

### REST API Endpoints

#### Projects

```
GET    /api/projects          - List all projects
POST   /api/projects          - Create project
GET    /api/projects/:id      - Get project details
PUT    /api/projects/:id      - Update project
DELETE /api/projects/:id      - Delete project
```

#### Cameras

```
GET    /api/cameras           - List all cameras
POST   /api/cameras           - Add camera
GET    /api/cameras/:id       - Get camera details
PUT    /api/cameras/:id       - Update camera
DELETE /api/cameras/:id       - Delete camera
POST   /api/cameras/:id/test  - Test connection
POST   /api/cameras/:id/capture - Capture image
```

#### Models

```
GET    /api/models            - List all models
POST   /api/models            - Upload model
GET    /api/models/:id        - Get model details
PUT    /api/models/:id        - Update model config
DELETE /api/models/:id        - Delete model
POST   /api/models/:id/test   - Test inference
```

#### Inference

```
POST   /api/inference/start   - Start inference
POST   /api/inference/stop    - Stop inference
GET    /api/inference/status  - Get status
GET    /api/inference/results - Get results
```

---

## Troubleshooting

### Camera Connection Issues

**ปัญหา: ไม่สามารถเชื่อมต่อ GigE Camera**

```
สาเหตุที่เป็นไปได้:
1. IP Address ไม่ถูกต้อง
2. Firewall block port
3. Network card ไม่รองรับ Jumbo Frame

แก้ไข:
1. ตรวจสอบ IP Address ของกล้อง
2. ปิด Firewall หรือเปิด port 3956
3. เปิด Jumbo Frame (MTU 9000)
4. ใช้ Network card แยกสำหรับกล้อง
```

**ปัญหา: RTSP Stream ไม่แสดงภาพ**

```
สาเหตุที่เป็นไปได้:
1. URL ไม่ถูกต้อง
2. Username/Password ผิด
3. Codec ไม่รองรับ

แก้ไข:
1. ทดสอบ URL ด้วย VLC
2. ตรวจสอบ Credentials
3. ลองเปลี่ยน Stream Profile
```

### Model Issues

**ปัญหา: Model load ช้า**

```
แก้ไข:
1. ใช้ TensorRT แทน ONNX
2. ลด Model size
3. เปิด GPU Acceleration
```

**ปัญหา: Inference ผิดพลาด**

```
แก้ไข:
1. ตรวจสอบ Input size
2. ตรวจสอบ Normalization
3. ลอง Re-export model
```

### Performance Issues

**ปัญหา: FPS ต่ำ**

```
แก้ไข:
1. ลด Resolution
2. ใช้ GPU
3. ลด Max Detections
4. ใช้ TensorRT
```

---

## License

MIT License - Copyright (c) 2024 Fac Vision

---

## Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Email: support@facvision.com
