// Re-export API types for backward compatibility
export type {
    Project,
    Camera,
    Model,
    ApiResponse,
    ApiError,
    DashboardStats,
    ChartData,
    User,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
} from './api';

// Additional Vision-specific types not in API
export type CameraProtocol = "RTSP" | "GigE" | "HTTP" | "USB";
export type CameraMode = "auto" | "snapshot" | "manual";
export type TriggerSource = "software" | "hardware" | "timer" | "external";

export interface CameraSettings {
    resolution?: string; // e.g., "1920x1080"
    fps?: number;
    exposure?: number;
    gain?: number;
}

export interface GigESettings extends CameraSettings {
    packetSize?: number;
    interPacketDelay?: number;
    acquisitionMode?: "continuous" | "singleFrame" | "multiFrame";
}

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

export interface IntegrationSettings {
    actions: Action[];
}
