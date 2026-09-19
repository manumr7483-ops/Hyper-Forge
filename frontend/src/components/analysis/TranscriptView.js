import { useEffect, useMemo, useRef } from "react";

/**
 * Word-level transcript viewer. Highlights the current word based on
 * `currentTime` and lets the user click any word to seek.
 */
export default function TranscriptView({ words = [], text = "", currentTime = 0, onSeek }) {
  const containerRef = useRef(null);
  const activeIdx = useMemo(() => {
    if (!Array.isArray(words) || !words.length) return -1;
    // Find the last word whose start <= currentTime <= end
    let idx = -1;
    for (let i = 0; i < words.length; i += 1) {
      const w = words[i];
      if (currentTime >= (w.start ?? 0) && currentTime <= (w.end ?? 0) + 0.01) {
        idx = i;
        break;
      }
      if ((w.start ?? 0) > currentTime) {
        break;
      }
      idx = i;
    }
    return idx;
  }, [words, currentTime]);

  useEffect(() => {
    if (activeIdx < 0 || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-widx="${activeIdx}"]`);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeIdx]);

  if (!words.length && !text) {
    return (
      <div
        data-testid="transcript-empty"
        className="glass rounded-2xl p-5 text-center text-sm text-hf-slate"
      >
        No speech detected in this clip.
      </div>
    );
  }

  if (!words.length && text) {
    return (
      <div className="glass rounded-2xl p-5" data-testid="transcript-plain">
        <div className="mb-3 text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate">
          Transcript
        </div>
        <p className="text-sm leading-relaxed text-alabaster/90">{text}</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5" data-testid="transcript-view">
      <div className="mb-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate">
        <span>Transcript · word-synced</span>
        <span>{words.length} words</span>
      </div>
      <div
        ref={containerRef}
        className="max-h-[420px] overflow-y-auto pr-2 text-[15px] leading-[1.85] text-alabaster/85"
      >
        {words.map((w, i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={`${w.word}-${i}`}
              data-widx={i}
              data-testid={isActive ? "transcript-word-active" : undefined}
              onClick={() => onSeek?.(w.start ?? 0)}
              className={
                "mr-1 rounded px-0.5 py-0.5 font-medium transition-colors " +
                (isActive
                  ? "bg-hf-cyan/25 text-hf-cyan"
                  : "text-alabaster/80 hover:text-alabaster hover:bg-white/[0.04]")
              }
            >
              {w.word}
            </button>
          );
        })}
      </div>
    </div>
  );
}
