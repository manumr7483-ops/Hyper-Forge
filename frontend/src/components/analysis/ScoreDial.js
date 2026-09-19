import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * Animated SVG score dial 0-100.
 * Cyan → violet gradient stroke, monospaced number that counts up on mount.
 */
export default function ScoreDial({ value = 0, size = 220, label = "HYPERFORGE SCORE" }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = performance.now();
    const dur = 1200;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(clamped * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clamped]);

  const radius = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;
  // Arc from -135deg to +135deg (270° sweep)
  const startAngle = -135;
  const endAngle = 135;
  const toRad = (a) => (a * Math.PI) / 180;
  const arcPoint = (angle, r = radius) => ({
    x: cx + Math.cos(toRad(angle)) * r,
    y: cy + Math.sin(toRad(angle)) * r,
  });

  const sweep = ((endAngle - startAngle) * clamped) / 100;
  const startPt = arcPoint(startAngle);
  const activeEndPt = arcPoint(startAngle + sweep);
  const fullEndPt = arcPoint(endAngle);
  const largeActive = sweep > 180 ? 1 : 0;

  const grade =
    clamped >= 80 ? "elite"
    : clamped >= 65 ? "strong"
    : clamped >= 45 ? "average"
    : "needs work";

  return (
    <div className="relative flex flex-col items-center" data-testid="score-dial">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="dialArcGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00F5FF" />
            <stop offset="100%" stopColor="#8A2BE2" />
          </linearGradient>
          <filter id="dialGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path
          d={`M ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 1 1 ${fullEndPt.x} ${fullEndPt.y}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Active arc */}
        {clamped > 0 && (
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            d={`M ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 ${largeActive} 1 ${activeEndPt.x} ${activeEndPt.y}`}
            fill="none"
            stroke="url(#dialArcGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            filter="url(#dialGlow)"
          />
        )}

        {/* Tick marks (every 10) */}
        {[...Array(11)].map((_, i) => {
          const angle = startAngle + (i / 10) * (endAngle - startAngle);
          const inner = arcPoint(angle, radius - 16);
          const outer = arcPoint(angle, radius - 8);
          return (
            <line
              key={i}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div
          data-testid="score-value"
          className="font-mono text-5xl font-semibold text-alabaster tabular-nums"
        >
          {display.toFixed(1)}
        </div>
        <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.28em] text-hf-slate">
          {label}
        </div>
        <div className="mt-3 rounded-full border border-hf-cyan/25 bg-hf-cyan/[0.06] px-3 py-0.5 font-mono text-[10px] uppercase tracking-widest text-hf-cyan">
          {grade}
        </div>
      </div>
    </div>
  );
}
