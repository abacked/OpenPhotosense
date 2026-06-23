export type RiskLevel = "low" | "medium" | "high";

export interface FlashEvent {
  timestamp_seconds: number;
  timestamp: string;
  brightness_delta: number;
  contrast_delta: number;
  is_red_flash: boolean;
  affected_area_ratio?: number;
  red_area_ratio?: number;
  exceeds_area_threshold?: boolean;
}

export interface AnalysisReport {
  risk_level: RiskLevel;
  risk_score: number;
  total_flash_events: number;
  red_flash_events: number;
  high_contrast_events: number;
  flagged_timestamps: string[];
  events: FlashEvent[];
  flashes_per_second: Record<string, number>;
  duration_seconds: number;
  frames_analyzed: number;
  recommendation: string;
}

export interface ScanJob {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  filename: string;
  report: AnalysisReport | null;
  error: string | null;
}

export type FixStrategy = "smooth" | "dim" | "remove";

export interface FixJob {
  fix_id: string;
  scan_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  strategy: FixStrategy;
  download_url: string | null;
  error: string | null;
}
