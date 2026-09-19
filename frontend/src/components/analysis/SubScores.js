import { motion } from "framer-motion";

const LABELS = {
  hook_score: "Hook",
  retention_score: "Retention",
  engagement_score: "Engagement",
  shareability_score: "Shareability",
  follower_potential_score: "Follower Potential",
};

const ORDER = [
  "hook_score",
  "retention_score",
  "engagement_score",
  "shareability_score",
  "follower_potential_score",
];

const ACCENT = {
  hook_score: "from-hf-cyan to-hf-cyan/60",
  retention_score: "from-hf-emerald to-hf-cyan/60",
  engagement_score: "from-hf-cyan to-hf-violet",
  shareability_score: "from-hf-violet to-hf-cyan/60",
  follower_potential_score: "from-hf-violet to-hf-emerald",
};

export default function SubScores({ scores }) {
  return (
    <div className="space-y-3" data-testid="sub-scores">
      {ORDER.map((key) => {
        const v = Math.max(0, Math.min(100, Number(scores?.[key] ?? 0)));
        return (
          <div key={key} data-testid={`subscore-${key}`}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-alabaster/90">
                {LABELS[key]}
              </span>
              <span className="font-mono text-xs text-alabaster tabular-nums">
                {v.toFixed(1)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${v}%` }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
                className={`h-full rounded-full bg-gradient-to-r ${ACCENT[key]} shadow-[0_0_10px_rgba(0,245,255,0.35)]`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
