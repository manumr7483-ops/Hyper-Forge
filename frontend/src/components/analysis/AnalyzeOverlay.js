import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Circle } from "lucide-react";
import { API_BASE } from "../../lib/api";
import ForgeCoreOrb from "../../components/canvas/ForgeCoreOrb";

const PHASE_LABEL = {
  probe: "Probing metadata",
  audio_extract: "Extracting audio",
  transcribe: "Transcribing (Whisper)",
  silence_detect: "Detecting silence",
  scene_detect: "Detecting scene cuts",
  visual_sample: "Sampling keyframes",
  score: "Computing scores",
  explain: "Writing diagnostic",
  done: "Finalising",
};

/**
 * Fullscreen "Forging Intelligence" overlay. Consumes the SSE stream at
 * /api/videos/{id}/analyze/stream and shows a live checklist of phases.
 */
export default function AnalyzeOverlay({ open, videoId, onDone, onError }) {
  const [phases, setPhases] = useState([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("running");
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef(null);
  const esRef = useRef(null);

  useEffect(() => {
    if (!open || !videoId) return;
    startedRef.current = Date.now();
    setPhases([]);
    setProgress(0);
    setStatus("running");
    setElapsed(0);

    const token = localStorage.getItem("hf_token");
    const url = `${API_BASE}/videos/${videoId}/analyze/stream?token=${encodeURIComponent(token || "")}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("progress", (evt) => {
      try {
        const data = JSON.parse(evt.data);
        setPhases(data.phases || []);
        setProgress(data.progress ?? 0);
        setStatus(data.status || "running");
        if (data.status === "done") {
          es.close();
          setTimeout(() => onDone?.(), 400);
        }
        if (data.status === "failed") {
          es.close();
          onError?.(data.error || "Analysis failed");
        }
      } catch {
        /* ignore */
      }
    });

    es.onerror = () => {
      // Server closed the stream (normal on completion). Fall back to poll.
      es.close();
    };

    const interval = setInterval(() => {
      setElapsed(((Date.now() - startedRef.current) / 1000) | 0);
    }, 500);

    return () => {
      clearInterval(interval);
      es.close();
    };
  }, [open, videoId, onDone, onError]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="analyze-overlay"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-void/85 backdrop-blur-xl" />

          {/* Forge-core 3D orb */}
          <div
            id="forge-core-mount"
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
            data-testid="forge-core-mount"
          >
            <ForgeCoreOrb state={status === "done" ? "complete" : "analyzing"} size={560} />
          </div>

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="glass-strong relative z-10 w-full max-w-lg rounded-2xl p-8"
          >
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.24em] text-hf-cyan">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Forging Intelligence
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-alabaster">
              Analysing your clip
            </h2>
            <p className="mt-1 text-sm text-hf-slate">
              Running the full pipeline — real ffmpeg + Whisper + GPT-4o. Usually ~30s.
            </p>

            <ol className="mt-6 space-y-2" data-testid="phase-checklist">
              {phases.map((p) => {
                const label = PHASE_LABEL[p.name] || p.name;
                const state = p.status; // pending | running | done
                return (
                  <li
                    key={p.name}
                    data-testid={`phase-${p.name}`}
                    className={
                      "flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-colors " +
                      (state === "done"
                        ? "border-hf-emerald/25 bg-hf-emerald/[0.05]"
                        : state === "running"
                        ? "border-hf-cyan/30 bg-hf-cyan/[0.06]"
                        : "border-white/[0.05] bg-white/[0.02]")
                    }
                  >
                    <div className="flex h-6 w-6 items-center justify-center">
                      {state === "done" && (
                        <CheckCircle2 className="h-4 w-4 text-hf-emerald" />
                      )}
                      {state === "running" && (
                        <Loader2 className="h-4 w-4 animate-spin text-hf-cyan" />
                      )}
                      {state === "pending" && (
                        <Circle className="h-3 w-3 text-hf-slate/50" />
                      )}
                    </div>
                    <span
                      className={
                        "text-sm " +
                        (state === "pending"
                          ? "text-hf-slate/70"
                          : "text-alabaster")
                      }
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
              {phases.length === 0 && (
                <li className="text-sm text-hf-slate">Warming up…</li>
              )}
            </ol>

            <div className="mt-6 flex items-center justify-between text-xs font-mono text-hf-slate">
              <span data-testid="analyze-elapsed">{elapsed}s elapsed</span>
              <span data-testid="analyze-progress">{progress}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-hf-cyan to-hf-violet shadow-[0_0_10px_rgba(0,245,255,0.5)]"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
