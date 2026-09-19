import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, CheckCircle2, Circle } from "lucide-react";
import { API_BASE } from "../../lib/api";
import ForgeCoreOrb from "../../components/canvas/ForgeCoreOrb";

const PHASE_LABEL = {
  plan_cuts: "Planning cuts",
  extract_segments: "Extracting segments",
  concat: "Concatenating",
  reframe: "Reframing (face tracking)",
  render_captions: "Rendering captions",
  mix_audio: "Mixing music (ducking)",
  mux: "Muxing final",
  thumbnail: "Generating thumbnail",
  done: "Finalising",
};

export default function ForgeProgress({ videoId, onDone, onError }) {
  const [phases, setPhases] = useState([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("running");
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const esRef = useRef(null);

  useEffect(() => {
    if (!videoId) return;
    startRef.current = Date.now();
    const token = localStorage.getItem("hf_token");
    const url = `${API_BASE}/videos/${videoId}/forge/stream?token=${encodeURIComponent(token || "")}`;
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
          setTimeout(() => onDone?.(), 500);
        }
        if (data.status === "failed") {
          es.close();
          onError?.(data.error || "Forge failed");
        }
      } catch { /* ignore */ }
    });
    es.onerror = () => es.close();
    const interval = setInterval(() => {
      setElapsed(((Date.now() - startRef.current) / 1000) | 0);
    }, 500);
    return () => {
      clearInterval(interval);
      es.close();
    };
  }, [videoId, onDone, onError]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="glass-strong relative min-h-[520px] overflow-hidden rounded-2xl p-8"
      data-testid="forge-progress"
    >
      {/* Forge-core 3D orb */}
      <div
        id="forge-core-mount"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        data-testid="forge-core-mount"
      >
        <ForgeCoreOrb state={status === "done" ? "complete" : "forging"} size={480} />
      </div>

      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.24em] text-hf-cyan">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Forging in progress
        </div>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-alabaster">
          Building your forged clip
        </h3>
        <p className="mt-1 text-sm text-hf-slate">
          Real FFmpeg — trim, reframe, captions, and ducked audio. Usually 30-60s.
        </p>

        <ol className="mt-6 space-y-2" data-testid="forge-phase-checklist">
          {phases.map((p) => {
            const state = p.status;
            return (
              <li
                key={p.name}
                data-testid={`forge-phase-${p.name}`}
                className={
                  "flex items-center gap-3 rounded-xl border px-4 py-2 transition-colors " +
                  (state === "done"
                    ? "border-hf-emerald/25 bg-hf-emerald/[0.05]"
                    : state === "running"
                    ? "border-hf-cyan/30 bg-hf-cyan/[0.06]"
                    : "border-white/[0.05] bg-white/[0.02]")
                }
              >
                <span className="flex h-6 w-6 items-center justify-center">
                  {state === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-hf-emerald" />
                  ) : state === "running" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-hf-cyan" />
                  ) : (
                    <Circle className="h-3 w-3 text-hf-slate/50" />
                  )}
                </span>
                <span className={"text-sm " + (state === "pending" ? "text-hf-slate/70" : "text-alabaster")}>
                  {PHASE_LABEL[p.name] || p.name}
                </span>
              </li>
            );
          })}
          {phases.length === 0 && (
            <li className="text-sm text-hf-slate">Warming up the forge…</li>
          )}
        </ol>

        <div className="mt-6 flex items-center justify-between text-xs font-mono text-hf-slate">
          <span data-testid="forge-elapsed">{elapsed}s elapsed</span>
          <span data-testid="forge-progress-pct">{progress}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-hf-cyan to-hf-violet"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
