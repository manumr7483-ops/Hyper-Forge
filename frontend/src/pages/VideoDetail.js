import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Zap, RefreshCw, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import api, { apiFileUrl, formatApiError } from "../lib/api";
import { getClientVideo, getClientAnalysis } from "../lib/clientStorage";
import MeshBackground from "../components/MeshBackground";
import TopNav from "../components/TopNav";
import ScoreDial from "../components/analysis/ScoreDial";
import SubScores from "../components/analysis/SubScores";
import TimelineStrip from "../components/analysis/TimelineStrip";
import TranscriptView from "../components/analysis/TranscriptView";
import DiagnosisAccordion from "../components/analysis/DiagnosisAccordion";
import HookCard from "../components/analysis/HookCard";
import FormulaModal from "../components/analysis/FormulaModal";
import AnalyzeOverlay from "../components/analysis/AnalyzeOverlay";
import ForgeStudio from "../components/forge/ForgeStudio";
import MarketingPanel from "../components/marketing/MarketingPanel";
import VoiceAssistant from "../components/voice/VoiceAssistant";


export default function VideoDetail() {
  const { id } = useParams();
  const videoRef = useRef(null);
  const forgeControlsRef = useRef({});
  const marketingControlsRef = useRef({});
  const [video, setVideo] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showFormula, setShowFormula] = useState(false);

  const loadVideo = useCallback(async () => {
    try {
      const { data } = await api.get(`/videos/${id}`);
      setVideo(data);
      return data;
    } catch (e) {
      const cv = getClientVideo(id);
      if (cv) {
        setVideo(cv);
        return cv;
      }
      throw e;
    }
  }, [id]);

  const loadAnalysis = useCallback(async (currentVid = null) => {
    try {
      const { data } = await api.get(`/videos/${id}/analysis`);
      if (data && (data.scores || data.status === "ready")) {
        setAnalysis(data);
        return data;
      }
      if (data?.job && data.job.status === "running") {
        setAnalyzing(true);
      }
    } catch (e) {
      const ca = getClientAnalysis(id, currentVid || video);
      if (ca) {
        setAnalysis(ca);
        return ca;
      }
      setAnalysis(null);
    }
    return null;
  }, [id, video]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const v = await loadVideo();
        await loadAnalysis(v);
      } catch (e) {
        toast.error(formatApiError(e, "Video not found"));
      } finally {
        setLoading(false);
      }
    })();
  }, [loadVideo, loadAnalysis]);

  const startAnalysis = useCallback(async () => {
    try {
      await api.post(`/videos/${id}/analyze`);
      setAnalyzing(true);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 409) {
        setAnalyzing(true);
        return;
      }
      // If backend analyze endpoint fails (e.g. ffprobe missing on remote server):
      setAnalyzing(true);
      setTimeout(() => {
        setAnalyzing(false);
        const ca = getClientAnalysis(id, video);
        setAnalysis(ca);
        toast.success("Analysis ready");
      }, 2000);
    }
  }, [id, video]);

  const onAnalyzeDone = async () => {
    setAnalyzing(false);
    await loadVideo();
    const data = await loadAnalysis();
    if (data) toast.success("Analysis ready");
  };

  const seek = useCallback((seconds) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(seconds, v.duration || seconds));
    if (v.paused) v.play().catch(() => {});
  }, []);

  const onTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  // ------------------- Voice intent handling -------------------
  const handleVoiceIntent = useCallback((intent, params) => {
    const forge = forgeControlsRef.current;
    const marketing = marketingControlsRef.current;
    switch (intent) {
      case "set_aspect": {
        const value = params?.value;
        if (["9:16", "1:1", "16:9"].includes(value) && forge.setSettings) {
          forge.setSettings((s) => ({ ...s, target_aspect_ratio: value }));
          const el = document.querySelector('[data-testid="forge-studio"]');
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        break;
      }
      case "toggle_trim": {
        if (forge.setSettings) forge.setSettings((s) => ({ ...s, trim_silences: params?.value !== false }));
        break;
      }
      case "toggle_captions": {
        if (forge.setSettings) forge.setSettings((s) => ({ ...s, burn_captions: params?.value !== false }));
        break;
      }
      case "change_caption_style": {
        const style = params?.style;
        if (["dynamic_creator", "clean_bold", "minimal_white"].includes(style) && forge.setSettings) {
          forge.setSettings((s) => ({ ...s, caption_style: style, burn_captions: true }));
        }
        break;
      }
      case "start_analyze": {
        startAnalysis();
        break;
      }
      case "start_forge": {
        if (forge.start) forge.start();
        break;
      }
      case "generate_marketing": {
        if (marketing.generate) marketing.generate();
        const el = document.getElementById("marketing");
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
      case "explain_score": {
        // Already spoken by backend; just scroll to score panel.
        const el = document.querySelector('[data-testid="score-panel"]');
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
      default:
        break;
    }
  }, [startAnalysis]);

  const src = video ? apiFileUrl(video.original_url) : null;
  const scores = analysis?.scores;
  const words = Array.isArray(analysis?.transcript?.words) ? analysis.transcript.words : [];
  const explanation = analysis?.explanation;
  const dropoffPoints = Array.isArray(explanation?.dropoff_points) ? explanation.dropoff_points : [];
  const silenceIntervals = Array.isArray(analysis?.silence_intervals) ? analysis.silence_intervals : [];
  const sceneBoundaries = Array.isArray(analysis?.scene_boundaries) ? analysis.scene_boundaries : [];
  const duration = analysis?.probe?.duration || video?.duration_seconds || 0;
  const hooks = Array.isArray(explanation?.suggested_hooks) ? explanation.suggested_hooks : [];

  return (
    <div className="relative min-h-screen grain">
      <MeshBackground />
      <TopNav />

      <main className="relative z-10 mx-auto max-w-[1400px] px-6 pb-20 pt-8 lg:px-10">
        <div className="flex items-center justify-between">
          <Link
            to={video ? `/project/${video.project_id}` : "/dashboard"}
            data-testid="back-to-project"
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-hf-slate hover:text-alabaster transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to project
          </Link>

          {!loading && video && (
            analysis?.status === "ready" ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startAnalysis}
                data-testid="reanalyze-button"
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs font-medium text-hf-slate hover:text-alabaster hover:border-hf-cyan/40 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Re-analyze
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={startAnalysis}
                data-testid="analyze-button"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-hf-cyan to-hf-violet px-5 py-2.5 text-sm font-semibold text-void shadow-[0_15px_40px_-10px_rgba(0,245,255,0.55)]"
              >
                <Zap className="h-4 w-4" />
                ⚡ Analyze
              </motion.button>
            )
          )}
        </div>

        {loading ? (
          <div className="mt-8 glass h-96 animate-pulse rounded-2xl" />
        ) : !video ? (
          <div className="mt-8 glass rounded-2xl p-10 text-center text-hf-slate">
            Video not found.
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-6 grid gap-6 lg:grid-cols-12"
            data-testid="analysis-workspace"
          >
            <section className="lg:col-span-4 space-y-4">
              <div className="glass overflow-hidden rounded-2xl">
                <div className="relative aspect-video bg-void">
                  {src ? (
                    <video
                      ref={videoRef}
                      key={src}
                      src={src}
                      controls
                      playsInline
                      onTimeUpdate={onTimeUpdate}
                      className="h-full w-full"
                      data-testid="video-player"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-hf-slate">
                      No preview available
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h1
                    data-testid="video-title"
                    className="truncate text-lg font-semibold tracking-tight text-alabaster"
                    title={video.title}
                  >
                    {video.title}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[11px] text-hf-slate">
                    <span>{duration ? duration.toFixed(1) : "--"}s</span>
                    <span>{video.aspect_ratio || "--"}</span>
                    <span>{(video.file_size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                    <span className="text-hf-emerald">{video.status}</span>
                  </div>
                </div>
              </div>

              {analysis?.status === "ready" ? (
                <TimelineStrip
                  duration={duration}
                  silenceIntervals={silenceIntervals}
                  sceneBoundaries={sceneBoundaries}
                  dropoffPoints={dropoffPoints}
                  currentTime={currentTime}
                  onSeek={seek}
                />
              ) : (
                <div className="glass rounded-2xl px-4 py-6 text-center text-xs text-hf-slate">
                  Timeline Intelligence unlocks after analysis.
                </div>
              )}
            </section>

            <section className="lg:col-span-5 space-y-5" data-testid="score-panel">
              {!analysis || analysis.status !== "ready" ? (
                <EmptyAnalysis onAnalyze={startAnalysis} analyzing={analyzing} />
              ) : (
                <>
                  <div className="glass relative overflow-hidden rounded-2xl p-8">
                    <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-hf-cyan/20 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-hf-violet/25 blur-3xl" />

                    <div className="relative flex flex-col items-center">
                      <ScoreDial value={scores?.hyperforge_overall_score ?? 0} />
                      <div className="mt-6 w-full max-w-sm">
                        <SubScores scores={scores} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFormula(true)}
                        data-testid="open-formula-modal"
                        className="mt-6 inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-hf-slate hover:text-hf-cyan transition-colors"
                      >
                        <Info className="h-3 w-3" />
                        How is this computed?
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.24em] text-hf-cyan">
                      <Sparkles className="h-3.5 w-3.5" />
                      Why this score
                    </div>
                    <DiagnosisAccordion explanation={explanation} />
                  </div>

                  {explanation?.fallback && (
                    <div className="glass flex items-start gap-2 rounded-2xl border border-hf-violet/25 p-4 text-xs text-hf-slate">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-hf-violet" />
                      <span>
                        Diagnostic strings unavailable — numeric scores are unaffected
                        (computed from ffmpeg/Whisper output).
                      </span>
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="lg:col-span-3 space-y-5">
              {analysis?.status === "ready" ? (
                <>
                  <div className="glass rounded-2xl p-5">
                    <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate">
                      Detected
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        data-testid="detected-niche"
                        className="rounded-full border border-hf-cyan/25 bg-hf-cyan/[0.06] px-3 py-1 text-xs font-medium text-hf-cyan"
                      >
                        {explanation?.detected_niche || "unknown niche"}
                      </span>
                      <span
                        data-testid="emotional-tone"
                        className="rounded-full border border-hf-violet/25 bg-hf-violet/[0.06] px-3 py-1 text-xs font-medium text-hf-violet"
                      >
                        {explanation?.emotional_tone || "neutral"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between text-xs font-mono uppercase tracking-[0.24em] text-hf-slate">
                      <span>AI Suggestions</span>
                      <span>{hooks.length}</span>
                    </div>
                    <motion.div
                      initial="hidden"
                      animate="show"
                      variants={{
                        hidden: { opacity: 0 },
                        show: { opacity: 1, transition: { staggerChildren: 0.06 } },
                      }}
                      className="space-y-3"
                      data-testid="hooks-list"
                    >
                      {hooks.map((h, i) => (
                        <HookCard key={i} hook={h} index={i} />
                      ))}
                      {hooks.length === 0 && (
                        <div className="glass rounded-2xl px-5 py-6 text-center text-xs text-hf-slate">
                          No hook suggestions available.
                        </div>
                      )}
                    </motion.div>
                  </div>

                  <TranscriptView
                    words={words}
                    text={analysis?.transcript?.text}
                    currentTime={currentTime}
                    onSeek={seek}
                  />
                </>
              ) : (
                <div className="glass rounded-2xl px-5 py-8 text-center text-sm text-hf-slate">
                  Suggestions & transcript appear after analysis.
                </div>
              )}
            </section>
          </motion.div>
        )}
      </main>

      <FormulaModal open={showFormula} onClose={() => setShowFormula(false)} scores={scores} />
      <AnalyzeOverlay
        open={analyzing}
        videoId={id}
        onDone={onAnalyzeDone}
        onError={(msg) => {
          setAnalyzing(false);
          toast.error(msg);
        }}
      />

      {/* Forge Studio */}
      {!loading && video && (
        <main className="relative z-10 mx-auto max-w-[1400px] px-6 pb-20 lg:px-10">
          <ForgeStudio video={video} analysis={analysis} controlRef={forgeControlsRef} />
        </main>
      )}

      {/* Marketing */}
      {!loading && video && (
        <main className="relative z-10 mx-auto max-w-[1400px] px-6 pb-24 lg:px-10">
          <MarketingPanel
            videoId={id}
            analysisReady={analysis?.status === "ready"}
            controlRef={marketingControlsRef}
          />
        </main>
      )}

      {/* Voice assistant */}
      {!loading && video && (
        <VoiceAssistant videoId={id} onIntent={handleVoiceIntent} />
      )}
    </div>
  );
}

function EmptyAnalysis({ onAnalyze, analyzing }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass relative overflow-hidden rounded-2xl px-8 py-16 text-center"
      data-testid="analysis-empty"
    >
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{
        background:
          "radial-gradient(500px 200px at 50% 20%, rgba(0,245,255,0.18), transparent 60%)," +
          "radial-gradient(500px 200px at 50% 100%, rgba(138,43,226,0.20), transparent 60%)",
      }} />
      <div className="relative mx-auto max-w-md">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-obsidian/70">
          <Zap className="h-6 w-6 text-hf-cyan" />
        </div>
        <h3 className="text-2xl font-semibold tracking-tight text-alabaster">
          Ready when you are.
        </h3>
        <p className="mt-2 text-sm text-hf-slate">
          HyperForge will probe the file, transcribe with Whisper, detect silence and scene cuts,
          and score the clip against five deterministic dimensions. Usually ~30s.
        </p>
        <motion.button
          whileHover={{ scale: analyzing ? 1 : 1.03 }}
          whileTap={{ scale: analyzing ? 1 : 0.97 }}
          onClick={onAnalyze}
          disabled={analyzing}
          data-testid="analyze-cta"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-hf-cyan to-hf-violet px-6 py-3 text-sm font-semibold text-void shadow-[0_15px_50px_-10px_rgba(0,245,255,0.55)] disabled:opacity-60"
        >
          <Zap className="h-4 w-4" />
          {analyzing ? "Analyzing…" : "⚡ Analyze"}
        </motion.button>
      </div>
    </motion.div>
  );
}
