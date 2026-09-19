import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, RefreshCw, ArrowRight, Zap } from "lucide-react";
import { toast } from "sonner";
import api, { apiFileUrl, formatApiError } from "../../lib/api";
import ForgeControls from "./ForgeControls";
import ForgePreviewFrame from "./ForgePreviewFrame";
import ForgeProgress from "./ForgeProgress";
import BeforeAfterPlayer from "./BeforeAfterPlayer";

const DEFAULT_SETTINGS = {
  target_aspect_ratio: "9:16",
  trim_silences: true,
  silence_padding_ms: 150,
  burn_captions: true,
  caption_style: "dynamic_creator",
  music_id: null,
  music_volume_db: -14,
  ducking_db: -18,
};

const CAPTION_STYLE_LABEL = {
  dynamic_creator: "Dynamic Creator",
  clean_bold: "Clean Bold",
  minimal_white: "Minimal",
};

export default function ForgeStudio({ video, analysis, onEditChange, controlRef }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [edit, setEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forging, setForging] = useState(false);

  // Expose imperative controls (used by VoiceAssistant on the parent page).
  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = {
      getSettings: () => settings,
      setSettings,
      start: () => start(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const analysisReady = analysis?.status === "ready";
  const silenceSeconds = useMemo(
    () => (analysis?.silence_intervals || []).reduce((a, s) => a + (s.duration || 0), 0),
    [analysis]
  );
  const hasSpeech = (analysis?.transcript?.words || []).length > 0;
  const duration = analysis?.probe?.duration || video?.duration_seconds || 0;

  const loadEdit = useCallback(async () => {
    try {
      const { data } = await api.get(`/videos/${video.id}/edit`);
      if (data && data.forged_url) {
        setEdit(data);
        onEditChange?.(data);
      } else if (data?.job?.status === "running" || data?.job?.status === "queued") {
        setForging(true);
      }
    } catch (e) {
      if (e?.response?.status !== 404) {
        toast.error(formatApiError(e, "Failed to load edit"));
      }
      setEdit(null);
    }
  }, [video?.id, onEditChange]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadEdit();
      setLoading(false);
    })();
  }, [loadEdit]);

  const start = async () => {
    if (!analysisReady) return;
    try {
      await api.post(`/videos/${video.id}/forge`, settings);
      setForging(true);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 409) {
        setForging(true);
        return;
      }
      toast.error(formatApiError(e, "Could not start forge"));
    }
  };

  const onDone = async () => {
    setForging(false);
    await loadEdit();
    toast.success("Forge complete");
  };

  const forgedUrl = edit ? apiFileUrl(edit.forged_url) : null;
  const originalUrl = video ? apiFileUrl(video.original_url) : null;

  return (
    <section className="mt-16" data-testid="forge-studio">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.24em] text-hf-cyan">
            <Zap className="h-3.5 w-3.5" />
            The Forge
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-alabaster">
            Turn intelligence into an actual clip.
          </h2>
          <p className="mt-1 text-sm text-hf-slate">
            Real FFmpeg — silence trim, face-tracked reframe, burned captions, ducked audio.
          </p>
        </div>
      </div>

      {!analysisReady ? (
        <div
          data-testid="forge-locked"
          className="glass rounded-2xl px-8 py-14 text-center text-hf-slate"
        >
          Analyse the video first — the Forge uses those silence intervals and word timings to
          build a real edit.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <ForgeControls
              settings={settings}
              onChange={setSettings}
              onForge={start}
              disabled={forging}
              silenceSeconds={silenceSeconds}
              totalDuration={duration}
              hasSpeech={hasSpeech}
            />
          </div>

          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {forging ? (
                <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ForgeProgress
                    videoId={video.id}
                    onDone={onDone}
                    onError={(msg) => {
                      setForging(false);
                      toast.error(`Forge failed: ${msg}`);
                    }}
                  />
                </motion.div>
              ) : edit && edit.forged_url ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                  data-testid="forge-result"
                >
                  <BeforeAfterPlayer
                    originalUrl={originalUrl}
                    forgedUrl={forgedUrl}
                    aspectAfter={edit.target_aspect_ratio}
                    appliedCuts={edit.applied_cuts}
                    sourceDuration={edit.source_duration_seconds}
                    forgedDuration={edit.forged_duration_seconds}
                  />

                  <div className="glass rounded-2xl px-5 py-4" data-testid="forge-metrics">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <Metric
                        label="Duration"
                        value={`${edit.source_duration_seconds?.toFixed(1)}s → ${edit.forged_duration_seconds?.toFixed(1)}s`}
                        delta={`${edit.duration_reduction_percent > 0 ? "-" : "+"}${Math.abs(edit.duration_reduction_percent)}%`}
                        deltaAccent={edit.duration_reduction_percent > 0 ? "text-hf-emerald" : "text-hf-violet"}
                      />
                      <Metric
                        label="Aspect"
                        value={`${video.aspect_ratio || "src"} → ${edit.target_aspect_ratio}`}
                      />
                      <Metric
                        label="Silence removed"
                        value={`${edit.silence_removed_seconds?.toFixed(1)}s`}
                      />
                      <Metric
                        label="Captions"
                        value={edit.captions_burned
                          ? `${edit.caption_word_count} words · ${CAPTION_STYLE_LABEL[edit.caption_style] || edit.caption_style}`
                          : (edit.caption_skip_reason || "skipped")}
                        deltaAccent={edit.captions_burned ? "text-hf-cyan" : "text-hf-slate"}
                      />
                      <Metric
                        label="Music"
                        value={edit.selected_music_track?.mood
                          ? `'${edit.selected_music_track.mood}'`
                          : "none"}
                      />
                    </div>
                    {edit.selected_music_track?.credit_text && (
                      <p className="mt-3 text-[11px] text-hf-slate/80">
                        <span className="font-mono uppercase tracking-widest text-hf-slate/60 mr-1">
                          credit
                        </span>
                        {edit.selected_music_track.credit_text}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <motion.a
                      href={forgedUrl}
                      download={`hyperforge_${video.id}.mp4`}
                      target="_blank"
                      rel="noreferrer"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      data-testid="download-forged"
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-hf-cyan to-hf-violet px-5 py-2.5 text-sm font-semibold text-void shadow-[0_15px_45px_-10px_rgba(0,245,255,0.5)]"
                    >
                      <Download className="h-4 w-4" />
                      Download MP4
                    </motion.a>
                    <button
                      type="button"
                      onClick={start}
                      data-testid="reforge-button"
                      className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-5 py-2.5 text-sm text-hf-slate hover:text-alabaster hover:border-hf-cyan/40 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Re-forge with different settings
                    </button>
                    <span
                      data-testid="continue-marketing"
                      className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] px-5 py-2.5 text-sm text-hf-slate/60"
                      title="Phase 4"
                    >
                      Continue to Marketing
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  data-testid="forge-placeholder"
                >
                  <ForgePreviewFrame
                    aspect={settings.target_aspect_ratio}
                    hasSpeech={hasSpeech}
                    music={null}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, delta, deltaAccent }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-hf-slate">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-mono text-sm text-alabaster tabular-nums">{value}</span>
        {delta && <span className={`font-mono text-[11px] ${deltaAccent || "text-hf-slate"}`}>{delta}</span>}
      </div>
    </div>
  );
}
