import type { Project, Camera, Model, InferenceResult } from "@/types/vision";

// Using Next.js Proxy (rewrites in next.config.ts)
// - SSR: Next.js must call itself at 127.0.0.1:3000, mapping through the proxy to the backend.
// - CSR: Browser uses relative path "/api" to call Next.js directly on whatever IP the user typed.
const isServer = typeof window === "undefined";
const API_BASE = isServer ? "http://127.0.0.1:3000/api" : "/api";

export const CAMERA_HTTP_STATUS_STORAGE_KEY = "vision:camera-http-reachability";

const warnedUrls = new Set<string>();

async function safeFetch(url: string, opts: RequestInit = {}) {
  try {
    const res = await fetch(url, { cache: "no-store", ...opts });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  } catch (e) {
    if (!warnedUrls.has(url)) {
      warnedUrls.add(url);
      const message = e instanceof Error ? e.message : String(e);
      console.warn(`Vision API unavailable: ${url} (${message})`);
    }
    return null;
  }
}

type ApiProject = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  status: "active" | "inactive" | "archived";
  cameras: string[];
  models: string[];
};

type ApiCamera = {
  id: string;
  name: string;
  protocol: "RTSP" | "GigE" | "HTTP" | "USB";
  connection_string: string;
  status: "connected" | "disconnected" | "error";
  mode: "auto" | "snapshot";
  settings?: Camera["settings"];
  created_at: string;
};

type ApiModel = {
  id: string;
  name: string;
  filename: string;
  file_size: number;
  classes: Array<{ id?: number; name?: string; color?: string }>;
  confidence: number;
  roi?: Model["roi"];
  created_at: string;
  status: "ready" | "loading" | "error";
};

type ApiModelInfo = {
  id: string;
  name: string;
  model_type: string;
  file_format: string;
  framework: string | null;
  status: string;
  inference?: {
    classes?: Record<string, string>;
    num_classes?: number;
  };
};

type ApiMediaResult = {
  id: string;
  type?: "image" | "video";
  created_at: string;
  input_url: string;
  output_url?: string | null;
  model_name?: string;
};

type ApiInferenceDevice = {
  id: string;
  name: string;
  type: "cpu" | "gpu" | "auto";
};

export type MediaRecord = {
  id: string;
  type: "image" | "video";
  createdAt: string;
  inputUrl: string;
  outputUrl: string | null;
  modelName: string;
};

export type InferenceDevice = {
  id: string;
  name: string;
  type: "cpu" | "gpu" | "auto";
};

export type WebRTCOfferPayload = {
  sdp: string;
  type: "offer";
  confidence?: number;
  iou_threshold?: number;
  fps?: number;
  device?: string;
};

export type WebRTCAnswerPayload = {
  peer_id: string;
  sdp: string;
  type: "answer";
};

const defaultClassColors = [
  "#22c55e",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#8b5cf6",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
];

function mapProject(p: ApiProject): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    status: p.status,
    cameras: [],
    models: [],
  };
}

function mapCamera(c: ApiCamera): Camera {
  const settings = {
    resolution: {
      width: c.settings?.resolution?.width ?? 1920,
      height: c.settings?.resolution?.height ?? 1080,
    },
    frameRate: c.settings?.frameRate ?? 30,
    exposure: c.settings?.exposure ?? 10000,
    gain: c.settings?.gain ?? 1,
    brightness: c.settings?.brightness ?? 50,
    contrast: c.settings?.contrast ?? 50,
    saturation: c.settings?.saturation ?? 50,
  };

  return {
    id: c.id,
    name: c.name,
    protocol: c.protocol,
    connectionString: c.connection_string,
    status: c.status,
    mode: c.mode,
    settings,
    createdAt: c.created_at,
  };
}

function mapModel(m: ApiModel): Model {
  return {
    id: m.id,
    name: m.name,
    filename: m.filename,
    fileSize: m.file_size,
    classes: (m.classes || []).map((cls, i) => ({
      id: cls.id ?? i,
      name: cls.name ?? `class_${i}`,
      color: cls.color ?? defaultClassColors[i % defaultClassColors.length],
    })),
    confidence: m.confidence ?? 0.5,
    roi: m.roi,
    createdAt: m.created_at,
    status: m.status,
  };
}

export async function fetchProjects(): Promise<Project[] | null> {
  const res = (await safeFetch(`${API_BASE}/vision/projects`)) as ApiProject[] | null;
  return res ? res.map(mapProject) : null;
}

export async function createProject(data: {
  name: string;
  description: string;
  status?: Project["status"];
}): Promise<Project | null> {
  const body = new FormData();
  body.append("name", data.name);
  body.append("description", data.description);
  body.append("status", data.status || "active");

  const res = (await safeFetch(`${API_BASE}/vision/projects`, {
    method: "POST",
    body,
  })) as ApiProject | null;

  return res ? mapProject(res) : null;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const res = await safeFetch(`${API_BASE}/vision/projects/${projectId}`, {
    method: "DELETE",
  });
  return !!res;
}

export async function fetchCameras(): Promise<Camera[] | null> {
  const res = (await safeFetch(`${API_BASE}/vision/cameras`)) as ApiCamera[] | null;
  return res ? res.map(mapCamera) : null;
}

export async function fetchModels(): Promise<Model[] | null> {
  const res = (await safeFetch(`${API_BASE}/vision/models`)) as ApiModel[] | null;
  return res ? res.map(mapModel) : null;
}

export async function fetchModelClasses(modelId: string): Promise<Model["classes"] | null> {
  const res = (await safeFetch(`${API_BASE}/vision/models/${modelId}/info`)) as ApiModelInfo | null;
  const classes = res?.inference?.classes;
  if (!classes || typeof classes !== "object") return null;

  const ordered = Object.entries(classes)
    .map(([id, name]) => ({ id: Number(id), name: String(name) }))
    .sort((a, b) => a.id - b.id);

  if (ordered.length === 0) return null;

  return ordered.map((cls, i) => ({
    id: Number.isFinite(cls.id) ? cls.id : i,
    name: cls.name,
    color: defaultClassColors[i % defaultClassColors.length],
  }));
}

export async function fetchInferenceResults(): Promise<InferenceResult[] | null> {
  const res = (await safeFetch(`${API_BASE}/vision/media`)) as ApiMediaResult[] | null;
  if (!res) return null;

  return res.map((item) => ({
    id: item.id,
    timestamp: item.created_at,
    cameraId: "",
    modelId: item.model_name || "",
    imageUrl: item.input_url,
    detections: [],
    processingTime: 0,
  }));
}

export function resolveMediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const backendBase = API_BASE.replace(/\/api\/?$/, "");
  return `${backendBase}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function saveCameraHttpReachability(cameras: Camera[]): void {
  if (typeof window === "undefined") return;

  const map = cameras.reduce<Record<string, boolean>>((acc, camera) => {
    if (camera.protocol === "HTTP") {
      acc[camera.id] = camera.status === "connected";
    }
    return acc;
  }, {});

  window.localStorage.setItem(CAMERA_HTTP_STATUS_STORAGE_KEY, JSON.stringify(map));
}

export function loadCameraHttpReachabilityMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(CAMERA_HTTP_STATUS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function fetchMediaRecords(): Promise<MediaRecord[] | null> {
  const res = (await safeFetch(`${API_BASE}/vision/media`)) as ApiMediaResult[] | null;
  if (!res) return null;

  return res.map((item) => ({
    id: item.id,
    type: item.type || "image",
    createdAt: item.created_at,
    inputUrl: resolveMediaUrl(item.input_url),
    outputUrl: item.output_url ? resolveMediaUrl(item.output_url) : null,
    modelName: item.model_name || "Unknown Model",
  }));
}

export async function deleteMediaRecord(recordId: string): Promise<boolean> {
  const res = await safeFetch(`${API_BASE}/vision/media/${recordId}`, {
    method: "DELETE",
  });

  return !!res;
}

export async function createCamera(data: {
  name: string;
  protocol: Camera["protocol"];
  connectionString: string;
  mode: Camera["mode"];
}): Promise<Camera | null> {
  const body = new FormData();
  body.append("name", data.name);
  body.append("protocol", data.protocol);
  body.append("connection_string", data.connectionString);
  body.append("mode", data.mode);

  const res = (await safeFetch(`${API_BASE}/vision/cameras`, {
    method: "POST",
    body,
  })) as ApiCamera | null;

  return res ? mapCamera(res) : null;
}

export async function updateCamera(
  cameraId: string,
  data: Partial<{
    name: string;
    protocol: Camera["protocol"];
    connectionString: string;
    mode: Camera["mode"];
  }>
): Promise<Camera | null> {
  const body = new FormData();
  if (data.name) body.append("name", data.name);
  if (data.protocol) body.append("protocol", data.protocol);
  if (data.connectionString) body.append("connection_string", data.connectionString);
  if (data.mode) body.append("mode", data.mode);

  const res = (await safeFetch(`${API_BASE}/vision/cameras/${cameraId}`, {
    method: "PUT",
    body,
  })) as ApiCamera | null;

  return res ? mapCamera(res) : null;
}

export async function deleteCamera(cameraId: string): Promise<boolean> {
  const res = await safeFetch(`${API_BASE}/vision/cameras/${cameraId}`, {
    method: "DELETE",
  });
  return !!res;
}

export async function uploadModel(data: {
  file: File;
  name: string;
  modelType?: string;
  description?: string;
  confidence?: number;
}): Promise<Model | null> {
  const body = new FormData();
  body.append("file", data.file);
  body.append("name", data.name);
  body.append("model_type", data.modelType || "yolov8");
  if (data.description) body.append("description", data.description);
  body.append("confidence", String(data.confidence ?? 0.5));

  const res = (await safeFetch(`${API_BASE}/vision/models/upload`, {
    method: "POST",
    body,
  })) as ApiModel | null;

  return res ? mapModel(res) : null;
}

export async function removeModel(modelId: string): Promise<boolean> {
  const res = await safeFetch(`${API_BASE}/vision/models/${modelId}`, {
    method: "DELETE",
  });
  return !!res;
}

export async function testModel(modelId: string, file: File, confidence = 0.5) {
  const body = new FormData();
  body.append("image", file);
  body.append("confidence", String(confidence));

  return await safeFetch(`${API_BASE}/vision/models/${modelId}/test`, {
    method: "POST",
    body,
  });
}

export async function fetchInferenceDevices(): Promise<InferenceDevice[] | null> {
  const res = (await safeFetch(`${API_BASE}/vision/devices`)) as ApiInferenceDevice[] | null;
  if (!res) return null;

  return res.map((device) => ({
    id: device.id,
    name: device.name,
    type: device.type,
  }));
}

export async function uploadInputMedia(file: File): Promise<{
  filename: string;
  media_path: string;
  url: string;
  content_type: string;
  size: number;
} | null> {
  const body = new FormData();
  body.append("file", file);

  return (await safeFetch(`${API_BASE}/vision/media/upload`, {
    method: "POST",
    body,
  })) as {
    filename: string;
    media_path: string;
    url: string;
    content_type: string;
    size: number;
  } | null;
}

export async function testModelFromMediaPath(
  modelId: string,
  mediaPath: string,
  confidence = 0.5,
  device?: string
) {
  const body = new FormData();
  body.append("media_path", mediaPath);
  body.append("confidence", String(confidence));
  if (device) body.append("device", device);

  return await safeFetch(`${API_BASE}/vision/models/${modelId}/test`, {
    method: "POST",
    body,
  });
}

export async function testModelFromCameraId(
  modelId: string,
  cameraId: string,
  confidence = 0.5,
  device?: string
) {
  const body = new FormData();
  body.append("camera_id", cameraId);
  body.append("confidence", String(confidence));
  if (device) body.append("device", device);

  return await safeFetch(`${API_BASE}/vision/models/${modelId}/test`, {
    method: "POST",
    body,
  });
}

export function getLiveInferenceStreamUrl(
  cameraId: string,
  modelId: string,
  opts?: { confidence?: number; iouThreshold?: number; fps?: number; device?: string }
): string {
  const backendBase = API_BASE.replace(/\/api\/?$/, "");
  const confidence = opts?.confidence ?? 0.5;
  const iouThreshold = opts?.iouThreshold ?? 0.45;
  const fps = opts?.fps ?? 10;
  const device = opts?.device;
  const deviceQuery = device ? `&device=${encodeURIComponent(device)}` : "";
  return `${backendBase}/api/vision/inference/live/stream/${cameraId}/${modelId}?confidence=${confidence}&iou_threshold=${iouThreshold}&fps=${fps}${deviceQuery}`;
}

export function getModelTestLiveInferenceStreamUrl(
  cameraId: string,
  modelId: string,
  opts?: { confidence?: number; iouThreshold?: number; fps?: number }
): string {
  const backendBase = API_BASE.replace(/\/api\/?$/, "");
  const confidence = opts?.confidence ?? 0.5;
  const iouThreshold = opts?.iouThreshold ?? 0.45;
  const fps = opts?.fps ?? 10;
  return `${backendBase}/api/vision/models/${modelId}/test/live/${cameraId}?confidence=${confidence}&iou_threshold=${iouThreshold}&fps=${fps}`;
}

export async function stopLiveInferenceStream(
  cameraId: string,
  modelId: string
): Promise<boolean> {
  const res = await safeFetch(`${API_BASE}/vision/inference/live/stop/${cameraId}/${modelId}`, {
    method: "POST",
  });
  return !!res;
}

export async function createLiveInferenceWebRTCOffer(
  cameraId: string,
  modelId: string,
  payload: WebRTCOfferPayload
): Promise<WebRTCAnswerPayload | null> {
  return await safeFetch(
    `${API_BASE}/vision/inference/live/webrtc/offer/${cameraId}/${modelId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export async function closeLiveInferenceWebRTCPeer(peerId: string): Promise<boolean> {
  const res = await safeFetch(`${API_BASE}/vision/inference/live/webrtc/close/${peerId}`, {
    method: "POST",
  });
  return !!res;
}

export function getCameraSnapshotUrl(cameraId: string): string {
  const backendBase = API_BASE.replace(/\/api\/?$/, "");
  return `${backendBase}/api/vision/cameras/${cameraId}/snapshot?t=${Date.now()}`;
}

