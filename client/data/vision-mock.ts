import type { Project, Camera, Model, InferenceResult } from "@/types/vision";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

async function safeFetch(url: string, opts: RequestInit = {}) {
  try {
    const res = await fetch(url, { cache: "no-store", ...opts });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  } catch (e) {
    console.warn("Vision API fetch failed:", url, e);
    return null;
  }
}

export async function fetchProjects(): Promise<Project[] | null> {
  return await safeFetch(`${API_BASE}/vision/projects`);
}

export async function fetchCameras(): Promise<Camera[] | null> {
  return await safeFetch(`${API_BASE}/vision/cameras`);
}

export async function fetchModels(): Promise<Model[] | null> {
  return await safeFetch(`${API_BASE}/vision/models`);
}

export async function fetchInferenceResults(): Promise<InferenceResult[] | null> {
  // There is no single endpoint for all inference results in the backend; this function
  // attempts to read from /vision/media as a best-effort fallback or can be wired to
  // a proper endpoint when available.
  return await safeFetch(`${API_BASE}/vision/media`);
}

// Fallback exports (empty data) to avoid breaking imports that expect arrays at build-time.
export const mockProjects: Project[] = [];
export const mockCameras: Camera[] = [];
export const mockModels: Model[] = [];
export const mockInferenceResults: InferenceResult[] = [];
