import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const SECTIONS = [
  { key: "hook_diagnosis", title: "Hook diagnosis", accent: "text-hf-cyan" },
  { key: "retention_diagnosis", title: "Retention diagnosis", accent: "text-hf-emerald" },
  { key: "pacing_diagnosis", title: "Pacing diagnosis", accent: "text-hf-violet" },
];

export default function DiagnosisAccordion({ explanation }) {
  const [openKey, setOpenKey] = useState("hook_diagnosis");
  if (!explanation) return null;
  return (
    <div className="space-y-3" data-testid="diagnosis-accordion">
      {SECTIONS.map((s) => {
        const open = openKey === s.key;
        const text = explanation[s.key] || "Unavailable.";
        return (
          <div
            key={s.key}
            className={
              "glass overflow-hidden rounded-2xl border border-white/[0.06] transition-colors " +
              (open ? "bg-white/[0.05]" : "")
            }
            data-testid={`diagnosis-${s.key}`}
          >
            <button
              type="button"
              onClick={() => setOpenKey(open ? null : s.key)}
              className="flex w-full items-center justify-between px-5 py-3 text-left"
            >
              <span className={`text-xs font-mono uppercase tracking-[0.22em] ${s.accent}`}>
                {s.title}
              </span>
              <ChevronDown
                className={
                  "h-4 w-4 text-hf-slate transition-transform " +
                  (open ? "rotate-180" : "")
                }
              />
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <p className="px-5 pb-4 text-sm leading-relaxed text-alabaster/85">
                    {text}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
