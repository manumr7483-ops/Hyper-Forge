import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const WEIGHTS = [
  ["Hook", "30%"],
  ["Retention", "30%"],
  ["Engagement", "15%"],
  ["Shareability", "15%"],
  ["Follower potential", "10%"],
];

export default function FormulaModal({ open, onClose, scores }) {
  const breakdown = scores?.breakdown || {};
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="formula-modal"
        >
          <motion.div
            className="absolute inset-0 bg-void/70 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            className="glass-strong relative z-10 w-full max-w-lg rounded-2xl p-8"
          >
            <button
              type="button"
              onClick={onClose}
              data-testid="close-formula-modal"
              className="absolute right-4 top-4 rounded-full border border-white/[0.08] bg-white/[0.03] p-2 text-hf-slate hover:text-alabaster"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-xs font-mono uppercase tracking-[0.24em] text-hf-cyan">
              Transparency
            </div>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-alabaster">
              How is this computed?
            </h3>
            <p className="mt-2 text-sm text-hf-slate">
              Every number is derived from a real ffmpeg / Whisper measurement.
              The LLM only writes the explanation strings — never the scores.
            </p>

            <div className="mt-5 space-y-2">
              {WEIGHTS.map(([label, weight]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-2 text-sm"
                >
                  <span className="text-alabaster/90">{label}</span>
                  <span className="font-mono text-hf-cyan">{weight}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-white/[0.05] bg-obsidian/70 p-4 font-mono text-[11px] leading-relaxed text-hf-slate">
              overall = 0.30·hook + 0.30·retention + 0.15·engagement + 0.15·shareability + 0.10·follower
            </div>

            {breakdown.retention?.components && (
              <div className="mt-5 text-xs text-hf-slate">
                <span className="font-mono uppercase tracking-widest text-hf-slate/70">
                  This clip
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Row label="silence ratio" value={breakdown.retention.components.silence_ratio} />
                  <Row label="word density (wps)" value={breakdown.engagement?.components?.word_density_wps} />
                  <Row label="scenes / min" value={breakdown.engagement?.components?.scene_density_per_min} />
                  <Row label="hook words (<3.5s)" value={breakdown.hook?.components?.hook_word_count} />
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value }) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-obsidian/70 px-3 py-2">
      <div className="text-[10px] font-mono uppercase tracking-widest text-hf-slate/60">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-sm text-alabaster">
        {value ?? "--"}
      </div>
    </div>
  );
}
