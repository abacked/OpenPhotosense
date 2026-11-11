import { AutoFix } from "@/components/auto-fix";
import { VideoPreview } from "@/components/video-preview";
import type { AnalysisReport } from "@/lib/types";

const tones = { low: "text-ok", medium: "text-warn", high: "text-danger" };

export function Results({ report, file, videoUrl }: { report: AnalysisReport; file: File; videoUrl: string }) {
  const frequency = Object.entries(report.flashes_per_second);
  return (
    <section className="mt-10 space-y-10" aria-live="polite">
      <div>
        <h2 className="section-title">Accessibility report</h2>
        <div className="card p-5 sm:p-6">
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className={`text-[34px] font-bold leading-tight tracking-[-.025em] ${tones[report.risk_level]}`}>{report.risk_level[0].toUpperCase() + report.risk_level.slice(1)} Risk</span>
            <span className="text-[17px] tabular-nums text-muted">{report.risk_score} of 100</span>
          </p>
          <p className="mt-1 text-[15px] text-muted">{report.recommendation}</p>
          <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[["Flash events", report.total_flash_events], ["Red flashes", report.red_flash_events], ["Contrast changes", report.high_contrast_events], ["Frames scanned", report.frames_analyzed]].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-fill/[.12] px-4 py-3">
                <dd className="text-[22px] font-semibold tabular-nums">{value}</dd>
                <dt className="text-[13px] text-muted">{label}</dt>
              </div>
            ))}
          </dl>
          {report.red_flash_events > 0 && <p className="mt-4 text-[15px] leading-6"><span className="font-semibold text-danger">Red flash warning.</span> <span className="text-muted">Saturated-red opposing transitions were detected and should be reviewed carefully.</span></p>}
        </div>
      </div>

      <div>
        <h2 className="section-title">Review flagged moments</h2>
        <div className="card p-5 sm:p-6"><VideoPreview src={videoUrl} events={report.events} duration={report.duration_seconds} /></div>
      </div>

      <div className="grid gap-10 sm:grid-cols-2 sm:gap-4">
        <div>
          <h2 className="section-title">Flagged timestamps</h2>
          <ul className="card max-h-80 overflow-auto">
            {report.events.length ? report.events.map((event, index) => (
              <li key={`${event.timestamp}-${index}`} className="row">
                <div className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span className="tabular-nums">{event.timestamp}</span>
                  <span className={event.is_red_flash ? "text-danger" : "tabular-nums text-muted"}>{event.is_red_flash ? "Red flash" : `Δ ${event.brightness_delta}`}</span>
                </div>
                {event.affected_area_ratio !== undefined && (
                  <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[13px] text-muted">
                    <span>Affected area</span>
                    <span className={event.exceeds_area_threshold ? "text-danger" : ""}>{(event.affected_area_ratio * 100).toFixed(1)}%{event.exceeds_area_threshold ? " · above threshold" : ""}</span>
                  </div>
                )}
              </li>
            )) : <li className="row text-[15px] text-muted">No risky transitions detected.</li>}
          </ul>
        </div>

        <div>
          <h2 className="section-title">Flashes per second</h2>
          <ul className="card max-h-80 overflow-auto">
            {frequency.length ? frequency.map(([time, count]) => (
              <li key={time} className="row">
                <div className="flex justify-between text-[15px]"><span className="tabular-nums">{time}</span><span className={`tabular-nums ${count > 3 ? "font-semibold text-danger" : "text-muted"}`}>{count}/sec</span></div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-fill/20"><div className={`h-1 rounded-full ${count > 3 ? "bg-danger" : "bg-accent"}`} style={{ width: `${Math.min(count / 8 * 100, 100)}%` }} /></div>
              </li>
            )) : <li className="row text-[15px] text-muted">No frequency data to display.</li>}
          </ul>
          <p className="mt-2 px-4 text-[13px] text-muted">Each flash is counted against the second before it.</p>
        </div>
      </div>

      <AutoFix file={file} report={report} />
    </section>
  );
}
