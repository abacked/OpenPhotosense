import type { FixJob, FixStrategy, ScanJob } from "./types";

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

export async function createFix(scanId: string, strategy: FixStrategy): Promise<string> {
  const response = await checked<{ fix_id: string }>(
    await fetch(`${API_URL}/api/v1/scans/${scanId}/fixes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategy }),
    }),
  );
  return response.fix_id;
}

export async function getFix(fixId: string): Promise<FixJob> {
  return checked<FixJob>(await fetch(`${API_URL}/api/v1/fixes/${fixId}`, { cache: "no-store" }));
}

export function fixDownloadUrl(fixId: string): string {
  return `${API_URL}/api/v1/fixes/${fixId}/download`;
}
