import type { ScanJob } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function checked<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function createScan(file: File): Promise<string> {
  const data = new FormData();
  data.append("video", file);
  const response = await checked<{ job_id: string }>(
    await fetch(`${API_URL}/api/v1/scans`, { method: "POST", body: data }),
  );
  return response.job_id;
}

export async function getScan(jobId: string): Promise<ScanJob> {
  return checked<ScanJob>(await fetch(`${API_URL}/api/v1/scans/${jobId}`, { cache: "no-store" }));
}

