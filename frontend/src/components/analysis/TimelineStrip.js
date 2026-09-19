import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";

/**
 * Horizontal timeline showing silence blocks, scene ticks, and dropoff dots.
 * Clicking any marker seeks the video via onSeek(seconds).
 */
export default function TimelineStrip({
  duration = 0,
  silenceIntervals = [],
  sceneBoundaries = [],
  dropoffPoints = [],
  currentTime = 0,
  onSeek,
}) {
  const dur = Math.max(0.001, Number(duration) || 0);
  const pct = (t) => `${Math.max(0, Math.min(100, (t / dur) * 100))}%`;

  return (
    <TooltipProvider delayDuration={80}>
      <div
        data-testid="timeline-strip"
        className="glass relative rounded-2xl px-4 py-4"
      >
        <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate">
          <span>Timeline Intelligence</span>
          <span>{dur.toFixed(1)}s</span>
        </div>

        <div className="relative h-14 w-full overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/70">
          {/* silence blocks */}
          {silenceIntervals.map((s, i) => {
            const left = pct(s.start);
            const width = `${Math.max(0.5, ((s.end - s.start) / dur) * 100)}%`;
            return (
              <Tooltip key={`sil-${i}`}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onSeek?.(s.start)}
                    data-testid={`timeline-silence-${i}`}
                    className="absolute top-0 h-full cursor-pointer bg-red-500/25 backdrop-blur-[1px] transition-colors hover:bg-red-500/40 focus:outline-none"
                    style={{ left, width }}
                    aria-label={`silence ${s.start.toFixed(1)}s to ${s.end.toFixed(1)}s`}
                  />
                </TooltipTrigger>
                <TooltipContent className="glass-strong border-white/[0.08] text-xs">
                  <span className="font-mono">
                    Silence {s.start.toFixed(2)}s → {s.end.toFixed(2)}s ({s.duration.toFixed(1)}s dead)
                  </span>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* scene tick marks */}
          {sceneBoundaries.map((t, i) => (
            <Tooltip key={`sc-${i}`}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSeek?.(t)}
                  data-testid={`timeline-scene-${i}`}
                  className="absolute top-1 h-[calc(100%-8px)] w-[2px] cursor-pointer bg-hf-cyan/70 shadow-[0_0_6px_rgba(0,245,255,0.6)] hover:bg-hf-cyan focus:outline-none"
                  style={{ left: pct(t) }}
                  aria-label={`scene cut at ${t.toFixed(2)}s`}
                />
              </TooltipTrigger>
              <TooltipContent className="glass-strong border-white/[0.08] text-xs">
                <span className="font-mono">Scene cut · {t.toFixed(2)}s</span>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* dropoff dots */}
          {dropoffPoints.map((d, i) => (
            <Tooltip key={`dr-${i}`}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSeek?.(d.timestamp)}
                  data-testid={`timeline-dropoff-${i}`}
                  className="absolute top-1/2 -mt-2 h-4 w-4 -translate-x-1/2 cursor-pointer rounded-full border border-hf-violet bg-hf-violet/40 shadow-[0_0_10px_rgba(138,43,226,0.9)] hover:bg-hf-violet/70 focus:outline-none"
                  style={{ left: pct(d.timestamp) }}
                  aria-label={`dropoff at ${Number(d.timestamp).toFixed(2)}s`}
                >
                  <motion.span
                    className="absolute inset-0 rounded-full bg-hf-violet/50"
                    animate={{ scale: [1, 1.7, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent className="glass-strong border-white/[0.08] text-xs max-w-xs">
                <span className="font-mono text-hf-violet">
                  Dropoff · {Number(d.timestamp).toFixed(1)}s
                </span>
                <div className="mt-1 text-alabaster/90 text-[11px] leading-snug">
                  {d.reason || "predicted drop-off"}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Playhead */}
          <div
            className="absolute top-0 h-full w-[2px] bg-alabaster/80 shadow-[0_0_10px_rgba(248,250,252,0.6)]"
            style={{ left: pct(currentTime) }}
            data-testid="timeline-playhead"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] font-mono uppercase tracking-[0.2em] text-hf-slate">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-red-500/40" /> silence
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-[2px] bg-hf-cyan" /> scene cut
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-hf-violet" /> dropoff
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
