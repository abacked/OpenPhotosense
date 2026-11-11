import { Glass } from "glisse";
import { AutoFix } from "@/components/auto-fix";
import { VideoPreview } from "@/components/video-preview";
import type { AnalysisReport } from "@/lib/types";

const tones = { low: "text-emerald-700 dark:text-emerald-400", medium: "text-amber-700 dark:text-amber-400", high: "text-red-700 dark:text-red-400" };

export function Results({ report, file, videoUrl }: { report: AnalysisReport; file: File; videoUrl: string }) {
  const frequency = Object.entries(report.flashes_per_second);
  return (
    <section className="mt-4 space-y-4" aria-live="polite">
      <Glass className="panel">
        <p className="eyebrow">Accessibility report</p>
        <h2 className="mt-4 flex flex-wrap items-baseline gap-x-4 text-[34px] font-[620] leading-[1.05] tracking-[-.05em] sm:text-[40px]">
          <span className={tones[report.risk_level]}>{report.risk_level[0].toUpperCase() + report.risk_level.slice(1)} risk</span>
          <span className="text-xl font-normal tracking-[-.02em] text-muted">{report.risk_score} / 100</span>
        </h2>
        <p className="mt-4 text-[17px] leading-[1.65] text-muted">{report.recommendation}</p>
        <dl className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[["Flash events", report.total_flash_events], ["Red flashes", report.red_flash_events], ["Contrast changes", report.high_contrast_events], ["Frames scanned", report.frames_analyzed]].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-line/[.04] px-4 py-3">
              <dd className="text-2xl font-medium tabular-nums tracking-[-.03em]">{value}</dd>
              <dt className="mt-1 text-[13px] text-muted">{label}</dt>
            </div>
          ))}
        </dl>
        {report.red_flash_events > 0 && <p className="mt-6 text-sm leading-6"><span className="mr-2 inline-block size-2 rounded-full bg-red-500" /><strong className="font-medium">Red flash warning.</strong> <span className="text-muted">Saturated-red opposing transitions were detected and should be reviewed carefully.</span></p>}
      </Glass>

      <Glass className="panel"><VideoPreview src={videoUrl} events={report.events} duration={report.duration_seconds} /></Glass>

      <div className="grid gap-4 sm:grid-cols-2">
        <Glass className="panel">
          <h3 className="text-base font-medium">Flagged timestamps</h3>
          <ul className="rule mt-4 max-h-80 overflow-auto border-t">
            {report.events.length ? report.events.map((event, index) => (
              <li key={`${event.timestamp}-${index}`} className="rule border-b py-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="tabular-nums">{event.timestamp}</span>
                  <span className={event.is_red_flash ? "text-red-700 dark:text-red-400" : "tabular-nums text-muted"}>{event.is_red_flash ? "Red flash" : `Δ ${event.brightness_delta}`}</span>
                </div>
                {event.affected_area_ratio !== undefined && (
                  <div className="mt-1 flex items-baseline justify-between gap-3 text-[12px] text-muted">
                    <span>Affected area</span>
                    <span className={event.exceeds_area_threshold ? "text-red-700 dark:text-red-400" : ""}>{(event.affected_area_ratio * 100).toFixed(1)}%{event.exceeds_area_threshold ? " · above threshold" : ""}</span>
                  </div>
                )}
              </li>
            )) : <li className="py-3 text-sm text-muted">No risky transitions detected.</li>}
          </ul>
        </Glass>

        <Glass className="panel">
          <h3 className="text-base font-medium">Rolling flash frequency</h3>
          <p className="mt-1 text-[13px] text-muted">Each flash counted against the second before it.</p>
          <ul className="rule mt-4 max-h-80 overflow-auto border-t">
            {frequency.length ? frequency.map(([time, count]) => (
              <li key={time} className="rule border-b py-3 text-sm">
                <div className="flex justify-between"><span className="tabular-nums">{time}</span><span className={`tabular-nums ${count > 3 ? "text-red-700 dark:text-red-400" : "text-muted"}`}>{count}/sec</span></div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-line/[.08]"><div className={`h-1 rounded-full ${count > 3 ? "bg-red-500" : "bg-[var(--lg-fill)]"}`} style={{ width: `${Math.min(count / 8 * 100, 100)}%` }} /></div>
              </li>
            )) : <li className="py-3 text-sm text-muted">No frequency data to display.</li>}
          </ul>
        </Glass>
      </div>

      <Glass className="panel"><AutoFix file={file} report={report} /></Glass>
    </section>
  );
}
