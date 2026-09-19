import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";

const PLATFORMS = [
  { id: "instagram_reels", label: "Instagram Reels" },
  { id: "youtube_shorts", label: "YouTube Shorts" },
  { id: "tiktok", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "x", label: "X (Twitter)" },
];

const TONES = [
  { id: "energetic", label: "Energetic" },
  { id: "cinematic", label: "Cinematic" },
  { id: "professional", label: "Professional" },
  { id: "chill", label: "Chill" },
  { id: "aggressive-hype", label: "Aggressive Hype" },
];

export default function CreateProjectModal({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [platforms, setPlatforms] = useState([]);
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("cinematic");
  const [submitting, setSubmitting] = useState(false);

  const togglePlatform = (id) => {
    setPlatforms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const reset = () => {
    setName("");
    setGoal("");
    setPlatforms([]);
    setAudience("");
    setTone("cinematic");
    setSubmitting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !goal.trim()) {
      toast.error("Name and goal are required");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/projects", {
        name: name.trim(),
        goal: goal.trim(),
        target_platforms: platforms,
        target_audience: audience.trim(),
        brand_tone: tone,
      });
      toast.success(`Project "${data.name}" forged`);
      reset();
      onCreated?.(data);
      onClose?.();
    } catch (err) {
      toast.error(formatApiError(err, "Could not create project"));
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid="create-project-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-void/70 backdrop-blur-md"
            onClick={() => !submitting && onClose?.()}
            data-testid="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            className="glass-strong relative z-10 w-full max-w-2xl rounded-2xl border border-white/[0.08] p-8 shadow-[0_30px_80px_-20px_rgba(0,245,255,0.25)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-hf-cyan text-xs font-mono uppercase tracking-[0.24em]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>New Forge</span>
                </div>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-alabaster">
                  Create a project
                </h2>
                <p className="mt-1 text-sm text-hf-slate">
                  Define the mission — HyperForge will do the rest.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !submitting && onClose?.()}
                data-testid="modal-close"
                className="rounded-full border border-white/[0.08] bg-white/[0.03] p-2 text-hf-slate hover:text-alabaster hover:border-hf-cyan/40 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 space-y-5">
              <Field label="Project name" required>
                <input
                  data-testid="project-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Q1 launch teasers"
                  className="hf-input hf-focus"
                  maxLength={120}
                />
              </Field>

              <Field label="Goal" required>
                <textarea
                  data-testid="project-goal-input"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="What outcome are we forging toward?"
                  rows={3}
                  className="hf-input hf-focus resize-none"
                  maxLength={2000}
                />
              </Field>

              <Field label="Target platforms">
                <div className="flex flex-wrap gap-2" data-testid="platform-chips">
                  {PLATFORMS.map((p) => {
                    const active = platforms.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        data-testid={`platform-chip-${p.id}`}
                        onClick={() => togglePlatform(p.id)}
                        className={
                          "rounded-full border px-4 py-1.5 text-xs font-medium tracking-wide transition-colors " +
                          (active
                            ? "border-hf-cyan/50 bg-hf-cyan/10 text-hf-cyan shadow-[inset_0_0_0_1px_rgba(0,245,255,0.15)]"
                            : "border-white/[0.08] bg-white/[0.02] text-hf-slate hover:text-alabaster hover:border-white/[0.15]")
                        }
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Target audience">
                  <input
                    data-testid="project-audience-input"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="Gen-Z founders, 18-28"
                    className="hf-input hf-focus"
                    maxLength={500}
                  />
                </Field>

                <Field label="Brand tone">
                  <div className="relative">
                    <select
                      data-testid="project-tone-select"
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="hf-input hf-focus appearance-none pr-10"
                    >
                      {TONES.map((t) => (
                        <option key={t.id} value={t.id} className="bg-obsidian text-alabaster">
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-hf-slate">
                      ▾
                    </span>
                  </div>
                </Field>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => !submitting && onClose?.()}
                data-testid="modal-cancel"
                className="rounded-full border border-white/[0.08] bg-white/[0.02] px-5 py-2 text-sm text-hf-slate hover:text-alabaster hover:border-white/[0.15] transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                data-testid="submit-create-project"
                whileHover={{ scale: submitting ? 1 : 1.02 }}
                whileTap={{ scale: submitting ? 1 : 0.98 }}
                disabled={submitting}
                className="relative rounded-full bg-gradient-to-r from-hf-cyan to-hf-violet px-6 py-2 text-sm font-semibold text-void shadow-[0_10px_40px_-8px_rgba(0,245,255,0.55)] hover:shadow-[0_10px_50px_-8px_rgba(138,43,226,0.65)] disabled:opacity-60 transition-shadow"
              >
                {submitting ? "Forging..." : "Forge project"}
              </motion.button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-hf-slate">
        {label}
        {required && <span className="text-hf-cyan">*</span>}
      </span>
      {children}
    </label>
  );
}
