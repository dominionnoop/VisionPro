// Project Types
export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "inactive" | "archived";
  cameras: Camera[];
  models: Model[];
}

// Camera Types
export type CameraProtocol = "RTSP" | "GigE" | "HTTP" | "USB";
export type CameraMode = "auto" | "snapshot";
export type TriggerSource = "software" | "hardware" | "timer" | "external";

export interface CameraSettings {
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  exposure: number;
  gain: number;
  brightness: number;
  contrast: number;
  saturation: number;
}

export interface Camera {
  id: string;
  name: string;
  protocol: CameraProtocol;
  connectionString: string; // RTSP URL, GigE IP, HTTP URL
  status: "connected" | "disconnected" | "error";
  mode: CameraMode;
  triggerSource?: TriggerSource;
  triggerInterval?: number; // for timer trigger (ms)
  settings: CameraSettings;
  lastFrame?: string; // base64 or URL
  createdAt: string;
}

// GigE specific settings
export interface GigESettings extends CameraSettings {
  packetSize: number;
  interPacketDelay: number;
  acquisitionMode: "continuous" | "singleFrame" | "multiFrame";
}

// Model Types
export interface ModelClass {
  id: number;
  name: string;
  color: string;
}

export interface ROI {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Model {
  id: string;
  name: string;
  filename: string;
  fileSize: number;
  classes: ModelClass[];
  confidence: number; // 0-1
  roi?: ROI;
  createdAt: string;
  status: "ready" | "loading" | "error";
}

// Detection Results
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  classId: number;
  className: string;
  confidence: number;
  boundingBox: BoundingBox;
  color: string;
}

export interface InferenceResult {
  id: string;
  timestamp: string;
  cameraId: string;
  modelId: string;
  imageUrl: string;
  detections: Detection[];
  processingTime: number; // ms
}

// Action Types
export type ActionType = "database" | "modbus" | "mqtt";

export interface DatabaseAction {
  type: "database";
  enabled: boolean;
  tableName: string;
  saveImage: boolean;
  saveDetections: boolean;
}

export interface ModbusAction {
  type: "modbus";
  enabled: boolean;
  host: string;
  port: number;
  unitId: number;
  registerAddress: number;
  registerType: "coil" | "holding";
  mapping: {
    classId: number;
    value: number;
  }[];
}

export interface MQTTAction {
  type: "mqtt";
  enabled: boolean;
  broker: string;
  port: number;
  topic: string;
  username?: string;
  password?: string;
  qos: 0 | 1 | 2;
  retain: boolean;
}

export type Action = DatabaseAction | ModbusAction | MQTTAction;

// Integration Settings
export interface IntegrationSettings {
  actions: Action[];
}
