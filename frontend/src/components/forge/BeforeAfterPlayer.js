import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";

/**
 * Synchronized before/after dual player.
 *
 * The FORGED clip is a concatenation of KEEP segments from the ORIGINAL video
 * (see `applied_cuts`). We build two piecewise-linear maps:
 *   original_time  →  forged_time  (skipping removed silence)
 *   forged_time    →  original_time (jumping to the next kept segment)
 *
 * When either player emits a `timeupdate` we compute the corresponding position
 * on the other player and snap it whenever the drift exceeds 80ms. That keeps
 * both timelines within 100ms of each other regardless of which side scrubs.
 */
export default function BeforeAfterPlayer({
  originalUrl,
  forgedUrl,
  aspectAfter = "9:16",
  appliedCuts,
  sourceDuration,
  forgedDuration,
}) {
  const beforeRef = useRef(null);
  const afterRef = useRef(null);
  const syncingRef = useRef(false);
  const activeRef = useRef("before"); // which player owns the master clock
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(sourceDuration || 0);
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState({ before: false, after: false });

  // Build cumulative segment offsets for the piecewise mapping.
  const segments = useMemo(() => {
    if (Array.isArray(appliedCuts) && appliedCuts.length > 0) {
      let cum = 0;
      return appliedCuts
        .map((c) => ({ start: Number(c.start) || 0, end: Number(c.end) || 0 }))
        .filter((c) => c.end > c.start)
        .map((c) => {
          const seg = { start: c.start, end: c.end, offset: cum };
          cum += c.end - c.start;
          return seg;
        });
    }
    return null;
  }, [appliedCuts]);

  // Original time (source) → Forged time (edit).
  const origToForged = useCallback(
    (t) => {
      if (!segments || segments.length === 0) {
        if (sourceDuration && forgedDuration) return (t / sourceDuration) * forgedDuration;
        return t;
      }
      // Before first kept segment → snap to 0
      if (t <= segments[0].start) return 0;
      for (const s of segments) {
        if (t >= s.start && t <= s.end) return s.offset + (t - s.start);
        if (t < s.start) return s.offset; // inside a removed gap → jump to next segment start
      }
      const last = segments[segments.length - 1];
      return last.offset + (last.end - last.start);
    },
    [segments, sourceDuration, forgedDuration]
  );

  // Forged time → Original time.
  const forgedToOrig = useCallback(
    (f) => {
      if (!segments || segments.length === 0) {
        if (sourceDuration && forgedDuration) return (f / forgedDuration) * sourceDuration;
        return f;
      }
      for (const s of segments) {
        const segLen = s.end - s.start;
        if (f >= s.offset && f <= s.offset + segLen) return s.start + (f - s.offset);
      }
      const last = segments[segments.length - 1];
      return last.end;
    },
    [segments, sourceDuration, forgedDuration]
  );

  useEffect(() => {
    const b = beforeRef.current;
    const a = afterRef.current;
    if (!b || !a) return;

    const onLoadedB = () => {
      const d = sourceDuration || b.duration || 0;
      setDuration((prev) => Math.max(prev, d));
      setReady((r) => ({ ...r, before: true }));
    };
    const onLoadedA = () => {
      setReady((r) => ({ ...r, after: true }));
    };

    const snap = (target, expected) => {
      if (!Number.isFinite(expected) || !Number.isFinite(target.duration)) return;
      const clamped = Math.max(0, Math.min(expected, target.duration || expected));
      if (Math.abs(target.currentTime - clamped) > 0.08) {
        syncingRef.current = true;
        target.currentTime = clamped;
        // release the flag on the next tick so the peer's timeupdate does not bounce back
        setTimeout(() => { syncingRef.current = false; }, 30);
      }
    };

    const onTimeBefore = () => {
      if (syncingRef.current) return;
      if (activeRef.current !== "before") return;
      const t = b.currentTime;
      setCurrent(t);
      snap(a, origToForged(t));
    };

    const onTimeAfter = () => {
      if (syncingRef.current) return;
      if (activeRef.current !== "after") return;
      const f = a.currentTime;
      const t = forgedToOrig(f);
      setCurrent(t);
      snap(b, t);
    };

    const onEnded = () => {
      setPlaying(false);
      b.currentTime = 0;
      a.currentTime = 0;
      setCurrent(0);
    };

    const onPlayB = () => { activeRef.current = "before"; };
    const onPlayA = () => { activeRef.current = "after"; };
    const onSeekB = () => { activeRef.current = "before"; };
    const onSeekA = () => { activeRef.current = "after"; };

    b.addEventListener("loadedmetadata", onLoadedB);
    a.addEventListener("loadedmetadata", onLoadedA);
    b.addEventListener("timeupdate", onTimeBefore);
    a.addEventListener("timeupdate", onTimeAfter);
    b.addEventListener("play", onPlayB);
    a.addEventListener("play", onPlayA);
    b.addEventListener("seeking", onSeekB);
    a.addEventListener("seeking", onSeekA);
    b.addEventListener("ended", onEnded);
    a.addEventListener("ended", onEnded);

    return () => {
      b.removeEventListener("loadedmetadata", onLoadedB);
      a.removeEventListener("loadedmetadata", onLoadedA);
      b.removeEventListener("timeupdate", onTimeBefore);
      a.removeEventListener("timeupdate", onTimeAfter);
      b.removeEventListener("play", onPlayB);
      a.removeEventListener("play", onPlayA);
      b.removeEventListener("seeking", onSeekB);
      a.removeEventListener("seeking", onSeekA);
      b.removeEventListener("ended", onEnded);
      a.removeEventListener("ended", onEnded);
    };
  }, [originalUrl, forgedUrl, origToForged, forgedToOrig, sourceDuration]);

  const toggle = async () => {
    const b = beforeRef.current;
    const a = afterRef.current;
    if (!b || !a) return;
    if (playing) {
      b.pause();
      a.pause();
      setPlaying(false);
    } else {
      try {
        // Realign forged to whatever original is at right now.
        a.currentTime = origToForged(b.currentTime);
        activeRef.current = "before";
        await Promise.all([b.play(), a.play()]);
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  };

  const scrub = (e) => {
    const b = beforeRef.current;
    const a = afterRef.current;
    if (!b || !a) return;
    const pct = Number(e.target.value) / 1000;
    const target = pct * (duration || sourceDuration || b.duration || 0);
    activeRef.current = "before";
    syncingRef.current = true;
    b.currentTime = target;
    a.currentTime = origToForged(target);
    setCurrent(target);
    setTimeout(() => { syncingRef.current = false; }, 40);
  };

  const sliderPct = duration ? (current / duration) * 1000 : 0;

  return (
    <div data-testid="before-after-player" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PlayerPane label="ORIGINAL" accent="violet" testid="player-before">
          <video
            ref={beforeRef}
            src={originalUrl}
            playsInline
            preload="auto"
            muted={false}
            className="h-full w-full object-contain"
            data-testid="video-before"
          />
        </PlayerPane>
        <PlayerPane label="FORGED" accent="cyan" testid="player-after" aspect={aspectAfter}>
          <video
            ref={afterRef}
            src={forgedUrl}
            playsInline
            preload="auto"
            className="h-full w-full object-contain"
            data-testid="video-after"
          />
        </PlayerPane>
      </div>

      <div className="glass rounded-2xl px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            data-testid="ba-play"
            disabled={!ready.before || !ready.after}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-hf-cyan to-hf-violet text-void shadow-[0_6px_20px_-6px_rgba(0,245,255,0.6)] disabled:opacity-40"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
          </button>
          <div className="flex-1">
            <input
              type="range"
              min={0}
              max={1000}
              value={sliderPct}
              onChange={scrub}
              data-testid="ba-scrubber"
              className="w-full accent-[#00F5FF]"
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-hf-slate">
              <span>{current.toFixed(1)}s</span>
              <span>{(duration || 0).toFixed(1)}s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerPane({ children, label, accent = "cyan", aspect, testid }) {
  const badge = accent === "cyan"
    ? "border-hf-cyan/40 bg-gradient-to-r from-hf-cyan/20 to-hf-violet/20 text-hf-cyan"
    : "border-hf-violet/40 bg-hf-violet/10 text-hf-violet";
  return (
    <div className="glass overflow-hidden rounded-2xl" data-testid={testid}>
      <div className="flex items-center justify-between px-4 py-2">
        <span className={`rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-widest ${badge}`}>
          {label}
        </span>
        {aspect && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-hf-slate">{aspect}</span>
        )}
      </div>
      <div className="relative aspect-video overflow-hidden bg-void">
        {children}
      </div>
    </div>
  );
}
