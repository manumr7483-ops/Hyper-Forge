import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

/**
 * Animated placeholder framing the target output aspect ratio while the user
 * configures forge settings. Rendered as a "device" outline with a soft glow.
 */
export default function ForgePreviewFrame({ aspect = "9:16", music, hasSpeech }) {
  const { w, h, label } = FRAMES[aspect] || FRAMES["9:16"];
  return (
    <div className="glass relative flex min-h-[520px] flex-col items-center justify-center overflow-hidden rounded-2xl p-10">
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{
        background:
          "radial-gradient(600px 240px at 50% 15%, rgba(0,245,255,0.16), transparent 60%)," +
          "radial-gradient(600px 240px at 50% 100%, rgba(138,43,226,0.20), transparent 60%)",
      }} />

      <motion.div
        key={aspect}
        initial={{ opacity: 0, y: 20, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative flex flex-col items-center"
      >
        <div
          className="relative rounded-[28px] border border-white/[0.14] bg-obsidian/60 shadow-[0_25px_120px_-30px_rgba(0,245,255,0.45)]"
          style={{ width: w, height: h }}
          data-testid={`preview-frame-${aspect.replace(":", "x")}`}
        >
          {/* Screen */}
          <div className="absolute inset-3 overflow-hidden rounded-[20px] bg-gradient-to-br from-obsidian to-void">
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  "linear-gradient(135deg, rgba(0,245,255,0.12), transparent 40%, rgba(138,43,226,0.20))",
                  "linear-gradient(135deg, rgba(138,43,226,0.20), transparent 40%, rgba(0,245,255,0.12))",
                  "linear-gradient(135deg, rgba(0,245,255,0.12), transparent 40%, rgba(138,43,226,0.20))",
                ],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-1">
              <span className="text-[9px] font-mono uppercase tracking-widest text-hf-cyan/70">
                {label}
              </span>
              {music && (
                <span className="rounded-full border border-hf-violet/25 bg-hf-violet/10 px-2 py-0.5 text-[9px] font-mono text-hf-violet">
                  {music.mood}
                </span>
              )}
            </div>
          </div>

          {/* Notch (only for 9:16) */}
          {aspect === "9:16" && (
            <div className="absolute left-1/2 top-1 h-3 w-16 -translate-x-1/2 rounded-full bg-void/80" />
          )}
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.24em] text-hf-slate">
          <Sparkles className="h-3.5 w-3.5 text-hf-cyan" />
          Configure and press ⚡ FORGE
        </div>
        {!hasSpeech && (
          <div className="mt-3 text-[11px] text-hf-slate">
            No speech detected — captions will auto-skip.
          </div>
        )}
      </motion.div>
    </div>
  );
}

const FRAMES = {
  "9:16": { w: 190, h: 340, label: "Vertical · 1080×1920" },
  "1:1": { w: 280, h: 280, label: "Square · 1080×1080" },
  "16:9": { w: 340, h: 190, label: "Horizontal · 1920×1080" },
};
