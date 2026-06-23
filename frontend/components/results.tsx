import { AutoFix } from "@/components/auto-fix";
import { VideoPreview } from "@/components/video-preview";
import type { AnalysisReport } from "@/lib/types";

const tones = { low: "bg-emerald-100 text-emerald-800", medium: "bg-amber-100 text-amber-800", high: "bg-red-100 text-red-800" };

export function Results({ report, file, videoUrl }: { report: AnalysisReport; file: File; videoUrl: string }) {
  const frequency = Object.entries(report.flashes_per_second);
  return (
    <section className="animate-rise mt-8 space-y-5" aria-live="polite">
      <div className="lift-card rounded-[2rem] bg-ink p-7 text-white shadow-soft dark:bg-white dark:text-ink sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] opacity-50">Analysis complete</p><h2 className="mt-2 font-display text-3xl font-bold">Accessibility report</h2></div>
          <span className={`rounded-full px-4 py-2 text-sm font-extrabold uppercase tracking-wider ${tones[report.risk_level]}`}>{report.risk_level} risk · {report.risk_score}/100</span>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[["Flash events", report.total_flash_events], ["Red flashes", report.red_flash_events], ["Contrast changes", report.high_contrast_events], ["Frames scanned", report.frames_analyzed]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white/10 p-4 dark:bg-black/5"><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-xs opacity-60">{label}</p></div>)}
        </div>
      </div>

      {report.red_flash_events > 0 && <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-red-900"><strong>Red flash warning.</strong> Saturated-red opposing transitions were detected and should be reviewed carefully.</div>}
      <VideoPreview src={videoUrl} events={report.events} duration={report.duration_seconds} />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="lift-card rounded-[2rem] bg-white p-7 shadow-soft dark:bg-white/[.05]">
          <h3 className="font-display text-lg font-bold">Flagged timestamps</h3>
          <div className="mt-4 max-h-72 space-y-2 overflow-auto">
            {report.events.length ? report.events.map((event, index) => (
              <div key={`${event.timestamp}-${index}`} className="rounded-xl bg-mist p-3 text-sm dark:bg-black/20">
                <div className="flex items-center justify-between gap-3"><code>{event.timestamp}</code><span className={event.is_red_flash ? "font-semibold text-red-600" : "opacity-55"}>{event.is_red_flash ? "Red flash" : `Δ ${event.brightness_delta}`}</span></div>
                {event.affected_area_ratio !== undefined && <div className="mt-2 flex items-center justify-between text-[11px] opacity-55"><span>Affected frame area</span><span className={event.exceeds_area_threshold ? "font-bold text-red-600 opacity-100" : ""}>{(event.affected_area_ratio * 100).toFixed(1)}%{event.exceeds_area_threshold ? " · above area threshold" : ""}</span></div>}
              </div>
            )) : <p className="text-sm opacity-55">No risky transitions detected.</p>}
          </div>
        </div>

        <div className="lift-card rounded-[2rem] bg-white p-7 shadow-soft dark:bg-white/[.05]">
          <h3 className="font-display text-lg font-bold">Rolling flash frequency</h3>
          <p className="mt-1 text-sm opacity-55">Every event is checked against the preceding one-second window.</p>
          <div className="mt-5 max-h-72 space-y-3 overflow-auto">
            {frequency.length ? frequency.map(([time, count]) => <div key={time}><div className="mb-1 flex justify-between text-xs"><span>{time}</span><b className={count > 3 ? "text-red-600" : ""}>{count}/sec</b></div><div className="h-2 rounded-full bg-black/5 dark:bg-white/10"><div className={`h-2 rounded-full ${count > 3 ? "bg-red-500" : "bg-signal"}`} style={{ width: `${Math.min(count / 8 * 100, 100)}%` }} /></div></div>) : <p className="text-sm opacity-55">No frequency data to display.</p>}
          </div>
        </div>
      </div>

      <p className="rounded-2xl bg-signal/10 p-5 text-sm"><strong>Recommendation:</strong> {report.recommendation}</p>
      <AutoFix file={file} report={report} />
    </section>
  );
}
