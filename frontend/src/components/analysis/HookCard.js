import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

const TYPE_ACCENT = {
  curiosity: "text-hf-cyan border-hf-cyan/30 bg-hf-cyan/[0.06]",
  contrarian: "text-hf-violet border-hf-violet/30 bg-hf-violet/[0.06]",
  value: "text-hf-emerald border-hf-emerald/30 bg-hf-emerald/[0.06]",
  story: "text-alabaster border-white/20 bg-white/[0.04]",
  callout: "text-hf-cyan border-hf-cyan/30 bg-hf-cyan/[0.06]",
};

export default function HookCard({ hook, index }) {
  const [copied, setCopied] = useState(false);
  const type = (hook?.type || "curiosity").toLowerCase();
  const accent = TYPE_ACCENT[type] || TYPE_ACCENT.curiosity;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hook.hookText || "");
      setCopied(true);
      toast.success("Hook copied");
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="glass rounded-2xl border border-white/[0.06] p-4"
      data-testid={`hook-card-${index}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={
            "rounded-full border px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-widest " +
            accent
          }
        >
          {type}
        </span>
        <button
          type="button"
          onClick={copy}
          data-testid={`copy-hook-${index}`}
          className="rounded-full border border-white/[0.08] bg-white/[0.02] p-1.5 text-hf-slate hover:text-alabaster hover:border-hf-cyan/40 transition-colors"
          aria-label="Copy hook"
        >
          {copied ? <Check className="h-3 w-3 text-hf-emerald" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      <p className="mt-3 text-[15px] font-medium leading-snug text-alabaster">
        “{hook?.hookText}”
      </p>
      {hook?.estimatedImpact && (
        <p className="mt-2 text-xs text-hf-slate">
          <span className="font-mono uppercase tracking-widest text-hf-slate/70 mr-1">
            impact
          </span>
          {hook.estimatedImpact}
        </p>
      )}
    </motion.div>
  );
}
