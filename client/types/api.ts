// API Response Types
export interface ApiResponse<T> {
    data: T;
    message?: string;
}

export interface ApiError {
    detail: string;
    status?: number;
}

// Vision Types
export interface Project {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'inactive' | 'archived';
    created_at: string;
    updated_at?: string;
    cameras: string[];
    models: string[];
}

export interface Camera {
    id: string;
    name: string;
    protocol: 'GigE' | 'RTSP' | 'HTTP' | 'USB';
    connection_string: string;
    connectionString?: string; // Alias for frontend compatibility
    status: 'connected' | 'disconnected' | 'error';
    mode: 'auto' | 'manual' | 'snapshot';
    triggerSource?: 'software' | 'hardware' | 'timer' | 'external';
    triggerInterval?: number;
    settings: {
        resolution?: string;
        fps?: number;
        exposure?: number;
        gain?: number;
    };
    created_at: string;
}

export interface Model {
    id: string;
    name: string;
    filename: string;
    description?: string;
    model_type: string; // 'yolov8', 'yolov5', 'yolov7', 'yolov9', 'custom'
    file_path: string;
    file_size: number;
    fileSize?: number; // Alias for compatibility
    file_format: string; // '.pt', '.onnx', '.tflite', '.engine'
    framework?: string; // 'ultralytics', 'yolov7', 'custom'
    version?: string;
    classes: Array<{
        id: number;
        name: string;
        color: string;
    }>;
    confidence: number;
    roi?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    status: 'ready' | 'training' | 'error';
    created_at: string;
    updated_at?: string;
}

// Dashboard Types
export interface DashboardStats {
    total_projects: number;
    active_projects: number;
    total_cameras: number;
    connected_cameras: number;
    total_models: number;
    total_detections_today: number;
}

export interface ChartData {
    labels: string[];
    datasets: Array<{
        label: string;
        data: number[];
        borderColor?: string;
        backgroundColor?: string;
    }>;
}

// Auth Types
export interface User {
    id: string;
    username: string;
    email: string;
    role: 'admin' | 'user';
    is_active: boolean;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export interface Device {
    id: string;
    name: string;
    type: 'cpu' | 'gpu';
}
