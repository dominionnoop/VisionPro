"use client";

import { useState } from "react";
import DashboardPageLayout from "@/components/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FolderIcon from "@/components/icons/folder";
import CameraIcon from "@/components/icons/camera";
import CubeIcon from "@/components/icons/cube";
import MonitorIcon from "@/components/icons/monitor";
import ZapIcon from "@/components/icons/zap";
import GearIcon from "@/components/icons/gear";
import { cn } from "@/lib/utils";

// Book icon component
function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

// Check icon
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Arrow icon
function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <DashboardPageLayout
      header={{
        title: "Documentation",
        description: "User Guide & Installation",
        icon: BookIcon,
      }}
    >
      <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-6">
        <TabsList className="grid grid-cols-3 lg:grid-cols-7 gap-2 h-auto p-1 bg-card">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="installation" className="text-xs">Installation</TabsTrigger>
          <TabsTrigger value="projects" className="text-xs">Projects</TabsTrigger>
          <TabsTrigger value="cameras" className="text-xs">Cameras</TabsTrigger>
          <TabsTrigger value="models" className="text-xs">Models</TabsTrigger>
          <TabsTrigger value="live" className="text-xs">Live View</TabsTrigger>
          <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
        </TabsList>

        {/* Overview Section */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <CameraIcon className="size-8 text-primary" />
                Fac Vision - Industrial Machine Vision System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose prose-invert max-w-none">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Fac Vision เป็นระบบ Machine Vision สำหรับงานอุตสาหกรรม ที่ออกแบบมาเพื่อการตรวจสอบคุณภาพ
                  และควบคุมกระบวนการผลิตด้วย AI โดยรองรับกล้องอุตสาหกรรมหลากหลายประเภท
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="bg-card/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Key Features</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      "รองรับกล้อง RTSP, GigE Vision, HTTP",
                      "AI Model Management (ONNX, TensorRT)",
                      "Real-time Object Detection",
                      "Modbus & MQTT Integration",
                      "Database Logging",
                      "ROI Configuration",
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckIcon className="size-4 text-primary shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Supported Cameras</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Badge variant="outline" className="mb-2">GigE Vision</Badge>
                      <p className="text-sm text-muted-foreground">
                        Industrial cameras (Basler, FLIR, Hikvision, Dahua) ที่ใช้ GigE Vision protocol
                      </p>
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-2">RTSP</Badge>
                      <p className="text-sm text-muted-foreground">
                        IP Cameras ทั่วไปที่รองรับ RTSP streaming
                      </p>
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-2">HTTP</Badge>
                      <p className="text-sm text-muted-foreground">
                        Web cameras และ MJPEG streams
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Workflow Diagram */}
              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">System Workflow</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center justify-center gap-2 py-4">
                    {[
                      { icon: FolderIcon, label: "Create Project", step: 1 },
                      { icon: CameraIcon, label: "Setup Camera", step: 2 },
                      { icon: CubeIcon, label: "Upload Model", step: 3 },
                      { icon: MonitorIcon, label: "Run Inspection", step: 4 },
                      { icon: ZapIcon, label: "Trigger Actions", step: 5 },
                    ].map((item, i, arr) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                            <item.icon className="size-6 text-primary" />
                          </div>
                          <div className="text-center">
                            <Badge variant="secondary" className="mb-1">Step {item.step}</Badge>
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                          </div>
                        </div>
                        {i < arr.length - 1 && (
                          <ArrowRightIcon className="size-5 text-muted-foreground mx-2 hidden sm:block" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Installation Section */}
        <TabsContent value="installation" className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">Installation Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* System Requirements */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Badge>1</Badge> System Requirements
                </h3>
                <Card className="bg-card/50">
                  <CardContent className="pt-4">
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium mb-2">Hardware</p>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>- CPU: Intel i5 / AMD Ryzen 5 ขึ้นไป</li>
                          <li>- RAM: 8GB ขึ้นไป (แนะนำ 16GB)</li>
                          <li>- GPU: NVIDIA GTX 1060 ขึ้นไป (สำหรับ TensorRT)</li>
                          <li>- Storage: SSD 256GB ขึ้นไป</li>
                          <li>- Network: Gigabit Ethernet (สำหรับ GigE cameras)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium mb-2">Software</p>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>- OS: Windows 10/11 หรือ Ubuntu 20.04+</li>
                          <li>- Python 3.8+ (สำหรับ Backend)</li>
                          <li>- Node.js 18+ (สำหรับ Frontend)</li>
                          <li>- NVIDIA Driver 470+ (สำหรับ GPU)</li>
                          <li>- Docker (Optional)</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Backend Installation */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Badge>2</Badge> Backend Installation
                </h3>
                <Card className="bg-card/50">
                  <CardContent className="pt-4 space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Clone Repository</p>
                      <pre className="bg-background/50 rounded-lg p-3 text-xs overflow-x-auto">
{`git clone https://github.com/your-org/fac-vision-backend.git
cd fac-vision-backend`}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Install Dependencies</p>
                      <pre className="bg-background/50 rounded-lg p-3 text-xs overflow-x-auto">
{`# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\\Scripts\\activate     # Windows

# Install packages
pip install -r requirements.txt

# Install GigE Vision SDK (ถ้าใช้ GigE cameras)
pip install harvesters`}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Configure Environment</p>
                      <pre className="bg-background/50 rounded-lg p-3 text-xs overflow-x-auto">
{`# Copy example config
cp .env.example .env

# Edit configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/facvision
REDIS_URL=redis://localhost:6379
MQTT_BROKER=localhost
MQTT_PORT=1883`}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Start Backend Server</p>
                      <pre className="bg-background/50 rounded-lg p-3 text-xs overflow-x-auto">
{`# Run database migrations
python manage.py migrate

# Start server
python manage.py runserver --host 0.0.0.0 --port 8000`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Frontend Installation */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Badge>3</Badge> Frontend Installation
                </h3>
                <Card className="bg-card/50">
                  <CardContent className="pt-4 space-y-4">
                    <div>
                      <pre className="bg-background/50 rounded-lg p-3 text-xs overflow-x-auto">
{`# Clone frontend
git clone https://github.com/your-org/fac-vision-frontend.git
cd fac-vision-frontend

# Install dependencies
npm install

# Configure API endpoint
cp .env.example .env.local
# Edit NEXT_PUBLIC_API_URL=http://localhost:8000

# Start development server
npm run dev

# Or build for production
npm run build
npm start`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* GigE Camera Setup */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Badge>4</Badge> GigE Camera Network Setup
                </h3>
                <Card className="bg-card/50">
                  <CardContent className="pt-4 space-y-4">
                    <div className="text-sm space-y-3">
                      <p className="text-muted-foreground">
                        สำหรับ GigE Vision cameras จำเป็นต้องตั้งค่า Network ให้ถูกต้อง:
                      </p>
                      <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
                        <li>ตั้งค่า Jumbo Frames บน Network Adapter (MTU = 9000)</li>
                        <li>ปิด Windows Firewall หรือเพิ่ม Exception</li>
                        <li>ตั้งค่า IP Address ให้อยู่ใน Subnet เดียวกับกล้อง</li>
                        <li>ติดตั้ง GenTL Producer ของผู้ผลิตกล้อง</li>
                      </ol>
                      <pre className="bg-background/50 rounded-lg p-3 text-xs overflow-x-auto">
{`# Windows - Set Jumbo Frames
netsh interface ipv4 set subinterface "Ethernet" mtu=9000

# Linux - Set Jumbo Frames
sudo ip link set eth0 mtu 9000

# Verify camera connection
python -c "from harvesters.core import Harvester; h = Harvester(); h.update(); print(h.device_info_list)"`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Page Documentation */}
        <TabsContent value="projects" className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <FolderIcon className="size-6 text-primary" />
                Projects - การจัดการโปรเจค
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  หน้า Projects เป็นจุดเริ่มต้นของการใช้งานระบบ ใช้สำหรับสร้างและจัดการโปรเจคตรวจสอบคุณภาพ
                  แต่ละโปรเจคจะประกอบด้วย กล้อง, โมเดล AI, และการตั้งค่า Actions ที่เกี่ยวข้อง
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">วิธีการใช้งาน</h4>
                
                <StepCard
                  step={1}
                  title="สร้างโปรเจคใหม่"
                  description="คลิกปุ่ม 'New Project' ที่มุมขวาบน"
                  details={[
                    "กรอกชื่อโปรเจค เช่น 'PCB Inspection Line 1'",
                    "เพิ่มคำอธิบายโปรเจค (Optional)",
                    "คลิก 'Create Project' เพื่อสร้าง",
                  ]}
                />

                <StepCard
                  step={2}
                  title="จัดการโปรเจค"
                  description="ใช้เมนูจัดการในแต่ละ Project Card"
                  details={[
                    "Edit - แก้ไขชื่อและคำอธิบาย",
                    "Duplicate - สร้างสำเนาโปรเจค",
                    "Delete - ลบโปรเจค (ต้องยืนยัน)",
                  ]}
                />

                <StepCard
                  step={3}
                  title="ดูสถานะโปรเจค"
                  description="ตรวจสอบสถานะและสถิติของโปรเจค"
                  details={[
                    "Active - โปรเจคที่กำลังทำงาน",
                    "Inactive - โปรเจคที่หยุดทำงาน",
                    "จำนวนกล้องและโมเดลที่เชื่อมต่อ",
                    "วันที่สร้างและแก้ไขล่าสุด",
                  ]}
                />
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <p className="text-sm">
                    <span className="font-semibold text-primary">Tip:</span>{" "}
                    แนะนำให้ตั้งชื่อโปรเจคให้สื่อถึงสายการผลิตหรือจุดตรวจสอบ 
                    เช่น "Assembly Line A - Component Check" เพื่อง่ายต่อการจัดการ
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cameras Page Documentation */}
        <TabsContent value="cameras" className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <CameraIcon className="size-6 text-primary" />
                Cameras - การตั้งค่ากล้อง
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  หน้า Cameras ใช้สำหรับเพิ่ม ตั้งค่า และทดสอบการเชื่อมต่อกล้อง
                  รองรับ 3 ประเภท: RTSP, GigE Vision, และ HTTP
                </p>
              </div>

              {/* Camera Types */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-card/50">
                  <CardHeader className="pb-2">
                    <Badge className="w-fit">RTSP</Badge>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p className="text-muted-foreground">สำหรับ IP Cameras ทั่วไป</p>
                    <pre className="bg-background/50 rounded p-2 text-xs">
{`rtsp://admin:pass@192.168.1.100:554/stream1`}
                    </pre>
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardHeader className="pb-2">
                    <Badge className="w-fit">GigE Vision</Badge>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p className="text-muted-foreground">Industrial cameras</p>
                    <pre className="bg-background/50 rounded p-2 text-xs">
{`Device ID หรือ Serial Number
เช่น: 22290375`}
                    </pre>
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardHeader className="pb-2">
                    <Badge className="w-fit">HTTP</Badge>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p className="text-muted-foreground">Web cameras / MJPEG</p>
                    <pre className="bg-background/50 rounded p-2 text-xs">
{`http://192.168.1.100/video.mjpg`}
                    </pre>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">วิธีการใช้งาน</h4>

                <StepCard
                  step={1}
                  title="เพิ่มกล้องใหม่"
                  description="คลิก 'Add Camera' และกรอกข้อมูล"
                  details={[
                    "ตั้งชื่อกล้อง เช่น 'Camera Line 1'",
                    "เลือกประเภท: RTSP, GigE, หรือ HTTP",
                    "กรอก URL หรือ Device ID",
                    "เลือก Project ที่ต้องการเชื่อมต่อ",
                  ]}
                />

                <StepCard
                  step={2}
                  title="ตั้งค่าพารามิเตอร์กล้อง"
                  description="คลิกไอคอน Settings ในแต่ละกล้อง"
                  details={[
                    "Resolution - ความละเอียด (640x480 ถึง 4096x3072)",
                    "Frame Rate - อัตราเฟรม (1-120 fps)",
                    "Exposure - ค่า Exposure Time",
                    "Gain - ค่า Gain",
                    "White Balance - สมดุลสีขาว",
                  ]}
                />

                <StepCard
                  step={3}
                  title="ตั้งค่าโหมดการทำงาน"
                  description="เลือกโหมด Auto หรือ Snapshot"
                  details={[
                    "Auto Mode - ประมวลผลต่อเนื่องตาม Frame Rate",
                    "Snapshot Mode - รอ Trigger ก่อนถ่ายภาพ",
                    "Trigger Source: Software, Hardware I/O, หรือ Timer",
                    "Trigger Delay - หน่วงเวลาหลังรับ Trigger",
                  ]}
                />

                <StepCard
                  step={4}
                  title="ทดสอบการเชื่อมต่อ"
                  description="ตรวจสอบว่ากล้องเชื่อมต่อได้"
                  details={[
                    "คลิก 'Test Connection' ในการ์ดกล้อง",
                    "ระบบจะพยายามเชื่อมต่อและแสดงสถานะ",
                    "Connected (สีเขียว) = เชื่อมต่อสำเร็จ",
                    "Disconnected (สีแดง) = เชื่อมต่อไม่ได้",
                  ]}
                />
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <p className="text-sm">
                    <span className="font-semibold text-primary">สำหรับ GigE Camera:</span>{" "}
                    ตรวจสอบให้แน่ใจว่า Jumbo Frames เปิดใช้งาน และ IP ของกล้องอยู่ใน Subnet เดียวกับคอมพิวเตอร์
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Models Page Documentation */}
        <TabsContent value="models" className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <CubeIcon className="size-6 text-primary" />
                Models - การจัดการโมเดล AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  หน้า Models ใช้สำหรับอัพโหลดและจัดการโมเดล AI สำหรับการตรวจจับวัตถุ
                  รองรับ ONNX และ TensorRT format
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="bg-card/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Supported Formats</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">ONNX</Badge>
                      <span className="text-muted-foreground">Cross-platform, CPU/GPU</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">TensorRT</Badge>
                      <span className="text-muted-foreground">NVIDIA GPU optimized</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">OpenVINO</Badge>
                      <span className="text-muted-foreground">Intel CPU optimized</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Model Types</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">YOLOv8</Badge>
                      <span className="text-muted-foreground">Object Detection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">YOLOv5</Badge>
                      <span className="text-muted-foreground">Object Detection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Custom</Badge>
                      <span className="text-muted-foreground">Your trained model</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">วิธีการใช้งาน</h4>

                <StepCard
                  step={1}
                  title="อัพโหลดโมเดล"
                  description="คลิก 'Upload Model' และเลือกไฟล์"
                  details={[
                    "ลากไฟล์มาวางหรือคลิกเพื่อเลือก",
                    "รองรับ .onnx, .engine, .xml",
                    "ระบบจะวิเคราะห์และดึง Classes อัตโนมัติ",
                    "ตั้งชื่อและเลือก Project",
                  ]}
                />

                <StepCard
                  step={2}
                  title="ดู Classes ในโมเดล"
                  description="ตรวจสอบ Classes ที่โมเดลตรวจจับได้"
                  details={[
                    "คลิกที่การ์ดโมเดลเพื่อดูรายละเอียด",
                    "แสดงรายชื่อ Classes ทั้งหมด",
                    "แสดงสีที่ใช้แสดงผลแต่ละ Class",
                    "แก้ไขชื่อ Class ได้ถ้าต้องการ",
                  ]}
                />

                <StepCard
                  step={3}
                  title="ตั้งค่า Confidence & ROI"
                  description="คลิกไอคอน Settings ในโมเดล"
                  details={[
                    "Confidence Threshold - ค่าความมั่นใจขั้นต่ำ (0.1-1.0)",
                    "NMS Threshold - ค่า Non-Maximum Suppression",
                    "ROI - กำหนดพื้นที่ที่ต้องการตรวจจับ",
                    "วาด ROI โดยการลากเมาส์บนภาพ",
                  ]}
                />

                <StepCard
                  step={4}
                  title="ทดสอบโมเดล"
                  description="ทดลอง Inference กับภาพตัวอย่าง"
                  details={[
                    "คลิก 'Test' ในการ์ดโมเดล",
                    "อัพโหลดภาพทดสอบ",
                    "ดูผลลัพธ์ Bounding Box และ Confidence",
                    "ปรับค่า Threshold ถ้าผลไม่ดี",
                  ]}
                />
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <p className="text-sm">
                    <span className="font-semibold text-primary">Tip:</span>{" "}
                    สำหรับความเร็วสูงสุด ให้ใช้ TensorRT format บนการ์ดจอ NVIDIA
                    สามารถแปลง ONNX เป็น TensorRT ได้ด้วย trtexec
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live View Page Documentation */}
        <TabsContent value="live" className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <MonitorIcon className="size-6 text-primary" />
                Live View - การแสดงผลแบบ Real-time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  หน้า Live View แสดงผลการตรวจจับแบบ Real-time พร้อม Bounding Box, 
                  Confidence Score และ Detection Log
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">ส่วนประกอบหน้าจอ</h4>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="bg-card/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Video Stream</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <ul className="space-y-1">
                        <li>- แสดงภาพจากกล้องแบบ Real-time</li>
                        <li>- วาด Bounding Box รอบวัตถุที่ตรวจพบ</li>
                        <li>- แสดง Class Name และ Confidence</li>
                        <li>- แสดง ROI ที่กำหนดไว้</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Detection Panel</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <ul className="space-y-1">
                        <li>- รายการวัตถุที่ตรวจพบปัจจุบัน</li>
                        <li>- จำนวนแต่ละ Class</li>
                        <li>- Confidence Score เฉลี่ย</li>
                        <li>- Processing Time (ms)</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <ul className="space-y-1">
                        <li>- Total Inspections</li>
                        <li>- Pass/Fail Count</li>
                        <li>- Yield Rate (%)</li>
                        <li>- Average Inference Time</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">History Log</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <ul className="space-y-1">
                        <li>- บันทึกผลการตรวจจับย้อนหลัง</li>
                        <li>- Timestamp ของแต่ละ Detection</li>
                        <li>- รายละเอียด Classes ที่พบ</li>
                        <li>- สถานะ Pass/Fail</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">วิธีการใช้งาน</h4>

                <StepCard
                  step={1}
                  title="เลือก Project และ Camera"
                  description="เลือกโปรเจคและกล้องที่ต้องการดู"
                  details={[
                    "Dropdown เลือก Project",
                    "เลือกกล้องที่ต้องการแสดงผล",
                    "สามารถดูหลายกล้องพร้อมกันได้",
                  ]}
                />

                <StepCard
                  step={2}
                  title="เริ่ม/หยุด Inspection"
                  description="ควบคุมการทำงานของระบบ"
                  details={[
                    "Start - เริ่มการตรวจจับ",
                    "Stop - หยุดการตรวจจับ",
                    "Pause - หยุดชั่วคราว",
                    "Snapshot - ถ่ายภาพเดี่ยว (Snapshot Mode)",
                  ]}
                />

                <StepCard
                  step={3}
                  title="ดูผลลัพธ์"
                  description="ตรวจสอบผลการตรวจจับ"
                  details={[
                    "Bounding Box แสดงตำแหน่งวัตถุ",
                    "สีของ Box ตาม Class",
                    "แสดง Confidence % บน Box",
                    "สถิติ Pass/Fail แบบ Real-time",
                  ]}
                />
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <p className="text-sm">
                    <span className="font-semibold text-primary">Backend Output:</span>{" "}
                    Backend จะส่งข้อมูลผ่าน WebSocket ในรูปแบบ JSON ประกอบด้วย 
                    boxes (x, y, width, height), class_id, confidence ของแต่ละวัตถุ
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Page Documentation */}
        <TabsContent value="actions" className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <ZapIcon className="size-6 text-primary" />
                Actions - การตั้งค่า Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  หน้า Actions ใช้ตั้งค่าการทำงานอัตโนมัติเมื่อตรวจพบวัตถุ
                  รวมถึงการบันทึกฐานข้อมูล, ส่งสัญญาณ Modbus, และ MQTT
                </p>
              </div>

              <div className="space-y-6">
                {/* Database Section */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">Database Logging</Badge>
                  </h4>
                  <Card className="bg-card/50">
                    <CardContent className="pt-4 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        บันทึกผลการตรวจจับลงฐานข้อมูล PostgreSQL หรือ SQLite
                      </p>
                      <div className="text-sm space-y-2">
                        <p className="font-medium">ข้อมูลที่บันทึก:</p>
                        <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Timestamp - เวลาที่ตรวจจับ</li>
                          <li>Project ID, Camera ID</li>
                          <li>Detection Results (JSON)</li>
                          <li>Image Path - ภาพที่บันทึก</li>
                          <li>Pass/Fail Status</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Modbus Section */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">Modbus TCP</Badge>
                  </h4>
                  <Card className="bg-card/50">
                    <CardContent className="pt-4 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        ส่งสัญญาณไปยัง PLC หรืออุปกรณ์ควบคุมผ่าน Modbus TCP
                      </p>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium mb-2">การตั้งค่า:</p>
                          <ul className="text-muted-foreground space-y-1">
                            <li>- Host: IP Address ของ PLC</li>
                            <li>- Port: 502 (default)</li>
                            <li>- Unit ID: 1-247</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium mb-2">Register Mapping:</p>
                          <ul className="text-muted-foreground space-y-1">
                            <li>- Result Register: ผลการตรวจ (Pass/Fail)</li>
                            <li>- Count Register: จำนวนที่ตรวจพบ</li>
                            <li>- Trigger Register: รับ Trigger จาก PLC</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* MQTT Section */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">MQTT</Badge>
                  </h4>
                  <Card className="bg-card/50">
                    <CardContent className="pt-4 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        ส่งข้อมูลผ่าน MQTT Protocol สำหรับ IoT และระบบ SCADA
                      </p>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium mb-2">Broker Settings:</p>
                          <ul className="text-muted-foreground space-y-1">
                            <li>- Broker URL: mqtt://broker:1883</li>
                            <li>- Username/Password (Optional)</li>
                            <li>- Client ID</li>
                            <li>- QoS Level: 0, 1, หรือ 2</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium mb-2">Topics:</p>
                          <pre className="bg-background/50 rounded p-2 text-xs">
{`facvision/{project}/result
facvision/{project}/status
facvision/{project}/trigger`}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">วิธีการใช้งาน</h4>

                <StepCard
                  step={1}
                  title="เปิดใช้งาน Action"
                  description="Toggle เปิด/ปิดแต่ละ Action"
                  details={[
                    "เปิด Database Logging เพื่อบันทึกข้อมูล",
                    "เปิด Modbus เพื่อส่งสัญญาณไป PLC",
                    "เปิด MQTT เพื่อส่งข้อมูลไป IoT Platform",
                  ]}
                />

                <StepCard
                  step={2}
                  title="กรอกการตั้งค่า"
                  description="กรอก Connection Settings"
                  details={[
                    "Database: Connection String",
                    "Modbus: IP, Port, Unit ID, Registers",
                    "MQTT: Broker URL, Topics, Credentials",
                  ]}
                />

                <StepCard
                  step={3}
                  title="ทดสอบการเชื่อมต่อ"
                  description="คลิก 'Test Connection' เพื่อทดสอบ"
                  details={[
                    "ระบบจะทดลองเชื่อมต่อและแสดงผล",
                    "Connected = เชื่อมต่อสำเร็จ",
                    "Failed = ตรวจสอบการตั้งค่าอีกครั้ง",
                  ]}
                />

                <StepCard
                  step={4}
                  title="บันทึกการตั้งค่า"
                  description="คลิก 'Save' เพื่อบันทึก"
                  details={[
                    "การตั้งค่าจะถูกบันทึกใน Project",
                    "เริ่มทำงานอัตโนมัติเมื่อ Start Inspection",
                    "สามารถแก้ไขได้ภายหลัง",
                  ]}
                />
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <p className="text-sm">
                    <span className="font-semibold text-primary">Example MQTT Payload:</span>
                  </p>
                  <pre className="bg-background/50 rounded-lg p-3 text-xs mt-2 overflow-x-auto">
{`{
  "timestamp": "2024-01-15T10:30:00Z",
  "project": "pcb-inspection",
  "camera": "camera-1",
  "result": "PASS",
  "detections": [
    {"class": "capacitor", "confidence": 0.95, "bbox": [100, 150, 50, 60]},
    {"class": "resistor", "confidence": 0.92, "bbox": [200, 180, 30, 40]}
  ],
  "inference_time_ms": 25
}`}
                  </pre>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardPageLayout>
  );
}

// Step Card Component
function StepCard({
  step,
  title,
  description,
  details,
}: {
  step: number;
  title: string;
  description: string;
  details: string[];
}) {
  return (
    <Card className="bg-card/50">
      <CardContent className="pt-4">
        <div className="flex gap-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
            {step}
          </div>
          <div className="flex-1">
            <h5 className="font-semibold">{title}</h5>
            <p className="text-sm text-muted-foreground mb-2">{description}</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {details.map((detail, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-1">-</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
