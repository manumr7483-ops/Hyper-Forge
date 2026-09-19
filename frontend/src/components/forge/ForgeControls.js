import { motion } from "framer-motion";
import { Zap, Scissors, Type } from "lucide-react";
import MusicPicker from "./MusicPicker";

const ASPECTS = [
  { id: "9:16", label: "9:16 Vertical", w: 44, h: 78 },
  { id: "1:1", label: "1:1 Square", w: 62, h: 62 },
  { id: "16:9", label: "16:9 Horizontal", w: 84, h: 47 },
];

const CAPTION_STYLES = [
  { id: "dynamic_creator", label: "Dynamic Creator", preview: "BOLD · KARAOKE", accent: "text-hf-cyan" },
  { id: "clean_bold", label: "Clean Bold", preview: "BOLD WHITE", accent: "text-alabaster" },
  { id: "minimal_white", label: "Minimal", preview: "thin white", accent: "text-hf-slate" },
];

export default function ForgeControls({
  settings,
  onChange,
  onForge,
  disabled,
  silenceSeconds = 0,
  totalDuration = 0,
  hasSpeech = true,
}) {
  const patch = (partial) => onChange({ ...settings, ...partial });

  const trimSavings = settings.trim_silences && silenceSeconds > 0 && totalDuration > 0
    ? `Removes ${silenceSeconds.toFixed(1)}s of silence · ${Math.round((silenceSeconds / totalDuration) * 100)}% shorter`
    : "Trim disabled — output length matches source";

  return (
    <div
      className="glass rounded-2xl p-6 space-y-6"
      data-testid="forge-controls"
    >
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.24em] text-hf-cyan">
        <Zap className="h-3.5 w-3.5" />
        Forge controls
      </div>

      {/* Aspect ratio */}
      <div>
        <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate">
          Aspect ratio
        </div>
        <div className="flex flex-wrap gap-2" data-testid="aspect-picker">
          {ASPECTS.map((a) => {
            const active = settings.target_aspect_ratio === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => patch({ target_aspect_ratio: a.id })}
                data-testid={`aspect-${a.id.replace(":", "x")}`}
                className={
                  "flex flex-col items-center gap-1.5 rounded-2xl border px-4 py-2.5 transition-colors " +
                  (active
                    ? "border-hf-cyan/50 bg-hf-cyan/[0.06]"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]")
                }
              >
                <span
                  className={
                    "rounded-md border " +
                    (active ? "border-hf-cyan bg-hf-cyan/20" : "border-white/[0.15] bg-white/[0.02]")
                  }
                  style={{ width: a.w, height: a.h }}
                />
                <span className={`text-[10px] font-mono uppercase tracking-widest ${active ? "text-hf-cyan" : "text-hf-slate"}`}>
                  {a.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trim silence */}
      <ToggleRow
        testid="toggle-trim"
        icon={Scissors}
        label="Trim dead space"
        checked={settings.trim_silences}
        onChange={(v) => patch({ trim_silences: v })}
        subtitle={trimSavings}
      />

      {/* Burn captions */}
      <div>
        <ToggleRow
          testid="toggle-captions"
          icon={Type}
          label="Burn captions"
          checked={settings.burn_captions}
          onChange={(v) => patch({ burn_captions: v })}
          subtitle={hasSpeech ? "Word-level, synced to your voice" : "No speech detected — captions will be skipped"}
        />
        {settings.burn_captions && hasSpeech && (
          <div className="mt-3 grid grid-cols-3 gap-2" data-testid="caption-style-picker">
            {CAPTION_STYLES.map((s) => {
              const active = settings.caption_style === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => patch({ caption_style: s.id })}
                  data-testid={`caption-style-${s.id}`}
                  className={
                    "rounded-xl border p-3 text-left transition-colors " +
                    (active
                      ? "border-hf-cyan/50 bg-hf-cyan/[0.06]"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]")
                  }
                >
                  <div className={`text-[10px] font-mono uppercase tracking-widest ${s.accent}`}>
                    {s.preview}
                  </div>
                  <div className="mt-1 text-[11px] text-alabaster">{s.label}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Music */}
      <MusicPicker
        value={settings.music_id}
        onChange={(id) => patch({ music_id: id })}
      />

      {/* Forge button */}
      <motion.button
        type="button"
        onClick={onForge}
        disabled={disabled}
        data-testid="forge-button"
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        animate={disabled ? {} : {
          boxShadow: [
            "0 15px 45px -12px rgba(0,245,255,0.55)",
            "0 15px 60px -12px rgba(138,43,226,0.65)",
            "0 15px 45px -12px rgba(0,245,255,0.55)",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-full overflow-hidden rounded-full bg-gradient-to-r from-hf-cyan to-hf-violet px-6 py-3 text-sm font-semibold text-void disabled:opacity-50 disabled:animate-none"
      >
        <span className="relative flex items-center justify-center gap-2">
          <Zap className="h-4 w-4" />
          ⚡ Forge video
        </span>
      </motion.button>
    </div>
  );
}

function ToggleRow({ icon: Icon, label, checked, onChange, subtitle, testid }) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        data-testid={testid}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-left hover:border-white/[0.12] transition-colors"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-obsidian/70">
            <Icon className="h-4 w-4 text-hf-cyan" />
          </span>
          <span className="text-sm text-alabaster">{label}</span>
        </span>
        <span
          className={
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors " +
            (checked ? "bg-gradient-to-r from-hf-cyan to-hf-violet" : "bg-white/[0.08]")
          }
        >
          <motion.span
            layout
            className={
              "absolute h-4 w-4 rounded-full bg-alabaster shadow-lg " +
              (checked ? "left-6" : "left-1")
            }
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </span>
      </button>
      {subtitle && (
        <p className="mt-2 pl-11 text-[11px] text-hf-slate">{subtitle}</p>
      )}
    </div>
  );
}
