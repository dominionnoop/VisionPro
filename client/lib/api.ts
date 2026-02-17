import type {
    ApiResponse,
    ApiError,
    Project,
    Camera,
    Model,
    DashboardStats,
    ChartData,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    User,
    Device
} from '@/types/api';

class ApiClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const config: RequestInit = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const error: ApiError = await response.json();
                throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unknown error occurred');
        }
    }

    // Projects namespace
    projects = {
        list: () => this.request<Project[]>('/vision/projects'),
        get: (id: string) => this.request<Project>(`/vision/projects/${id}`),
        create: (data: Partial<Project>) => this.request<Project>('/vision/projects', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        update: (id: string, data: Partial<Project>) => this.request<Project>(`/vision/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => this.request<void>(`/vision/projects/${id}`, {
            method: 'DELETE',
        }),
    };

    // Cameras namespace
    cameras = {
        list: () => this.request<Camera[]>('/vision/cameras'),
        get: (id: string) => this.request<Camera>(`/vision/cameras/${id}`),
        create: (data: Partial<Camera>) => this.request<Camera>('/vision/cameras', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        update: (id: string, data: Partial<Camera>) => this.request<Camera>(`/vision/cameras/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => this.request<void>(`/vision/cameras/${id}`, {
            method: 'DELETE',
        }),
    };

    // Models namespace
    models = {
        list: (type?: string) => this.request<Model[]>(`/vision/models${type ? `?model_type=${type}` : ''}`),
        get: (id: string) => this.request<Model>(`/vision/models/${id}`),
        create: (data: Partial<Model>) => this.request<Model>('/vision/models', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        update: (id: string, data: Partial<Model>) => this.request<Model>(`/vision/models/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => this.request<void>(`/vision/models/${id}`, {
            method: 'DELETE',
        }),
        types: () => this.request<any[]>('/vision/models/types'),
    };

    // Dashboard namespace
    dashboard = {
        stats: () => this.request<DashboardStats>('/dashboard/stats'),
        detectionChart: () => this.request<ChartData>('/dashboard/detection-chart'),
        performanceChart: () => this.request<ChartData>('/dashboard/performance-chart'),
    };

    // Auth namespace
    auth = {
        login: (credentials: LoginRequest) => this.request<TokenResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        }),
        register: (data: RegisterRequest) => this.request<User>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        getCurrentUser: (token: string) => this.request<User>('/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        }),
        logout: (token: string) => this.request<void>('/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        }),
        refreshToken: (refreshToken: string) => this.request<TokenResponse>('/auth/refresh', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshToken}`,
            },
        }),
    };
    // Media Library namespace
    media = {
        list: () => this.request<any[]>('/vision/media'),
        delete: (id: string) => this.request<void>(`/vision/media/${id}`, {
            method: 'DELETE',
        }),
    };

    // Devices namespace
    devices = {
        list: () => this.request<Device[]>('/vision/devices'),
    };
}

// Export singleton instance
export const api = new ApiClient();
export default api;
