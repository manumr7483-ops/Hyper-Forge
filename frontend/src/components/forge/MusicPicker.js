import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Music4, Check } from "lucide-react";
import api, { apiFileUrl, formatApiError } from "../../lib/api";
import { toast } from "sonner";

const CATEGORIES = ["energetic", "cinematic", "chill", "hype"];
const CATEGORY_LABEL = {
  energetic: "Energetic",
  cinematic: "Cinematic",
  chill: "Chill",
  hype: "Hype",
};

export default function MusicPicker({ value, onChange }) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCat, setOpenCat] = useState("energetic");
  const [playing, setPlaying] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/music");
        setTracks(data.tracks || []);
      } catch (e) {
        toast.error(formatApiError(e, "Music library unavailable"));
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const selected = tracks.find((t) => t.id === value) || null;

  const preview = async (track) => {
    if (playing === track.id) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    const token = localStorage.getItem("hf_token");
    const url = apiFileUrl(`/api/music/${track.id}/preview?token=${encodeURIComponent(token || "")}`);
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.pause();
    audioRef.current.src = url;
    try {
      await audioRef.current.play();
      setPlaying(track.id);
      audioRef.current.onended = () => setPlaying(null);
    } catch {
      setPlaying(null);
    }
  };

  return (
    <div data-testid="music-picker" className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate">
          Music
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          data-testid="music-none-button"
          className={
            "text-[10px] font-mono uppercase tracking-widest transition-colors " +
            (value ? "text-hf-slate hover:text-hf-cyan" : "text-hf-cyan")
          }
        >
          none
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setOpenCat(c)}
            data-testid={`music-cat-${c}`}
            className={
              "rounded-full border px-3 py-1 text-[11px] font-mono uppercase tracking-widest transition-colors " +
              (openCat === c
                ? "border-hf-cyan/50 bg-hf-cyan/10 text-hf-cyan"
                : "border-white/[0.08] bg-white/[0.02] text-hf-slate hover:text-alabaster")
            }
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl border border-white/[0.06] p-2">
        {loading ? (
          <div className="p-3 text-xs text-hf-slate">Loading…</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.ul
              key={openCat}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="space-y-1"
              data-testid={`music-list-${openCat}`}
            >
              {tracks
                .filter((t) => t.category === openCat)
                .map((t) => {
                  const active = value === t.id;
                  return (
                    <li
                      key={t.id}
                      data-testid={`music-track-${t.id}`}
                      className={
                        "group flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors " +
                        (active
                          ? "border-hf-cyan/40 bg-hf-cyan/[0.06]"
                          : "border-white/[0.04] hover:border-white/[0.12] hover:bg-white/[0.02]")
                      }
                    >
                      <button
                        type="button"
                        onClick={() => preview(t)}
                        data-testid={`preview-track-${t.id}`}
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-white/[0.08] bg-obsidian/70 text-hf-cyan hover:text-alabaster hover:border-hf-cyan/40 transition-colors"
                      >
                        {playing === t.id ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-alabaster">{t.mood}</div>
                        <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-hf-slate">
                          <span>{t.bpm} BPM</span>
                          <span>·</span>
                          <span>{t.duration}s</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onChange(t.id)}
                        data-testid={`select-track-${t.id}`}
                        className={
                          "rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-widest transition-colors " +
                          (active
                            ? "border-hf-cyan/40 bg-hf-cyan text-void"
                            : "border-white/[0.08] bg-white/[0.02] text-hf-slate hover:text-alabaster")
                        }
                      >
                        {active ? (
                          <span className="inline-flex items-center gap-1">
                            <Check className="h-3 w-3" /> Picked
                          </span>
                        ) : (
                          "Pick"
                        )}
                      </button>
                    </li>
                  );
                })}
            </motion.ul>
          </AnimatePresence>
        )}
      </div>

      {selected && (
        <div
          data-testid="music-credit"
          className="flex items-start gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-[11px] text-hf-slate"
        >
          <Music4 className="mt-0.5 h-3.5 w-3.5 text-hf-cyan flex-none" />
          <span>{selected.credit_text}</span>
        </div>
      )}
    </div>
  );
}
