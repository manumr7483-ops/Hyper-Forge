import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, CheckCircle2, XCircle, ShieldCheck, ShieldAlert, Zap, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";
import MeshBackground from "../components/MeshBackground";
import TopNav from "../components/TopNav";

const SERVICE_META = {
  mongo:    { label: "MongoDB",        note: "Primary datastore" },
  storage:  { label: "Local Storage",  note: "raw · forged · audio · thumbs" },
  ffmpeg:   { label: "FFmpeg",         note: "Video pipeline" },
  ffprobe:  { label: "FFprobe",        note: "Metadata & probing" },
  openai:   { label: "OpenAI / LLM",   note: "Scoring · captions · marketing" },
  whisper:  { label: "Whisper",        note: "Speech-to-text (Emergent LLM key)" },
};

export default function Health() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/health/integrations");
      setHealth(data);
    } catch (e) {
      toast.error(formatApiError(e, "Health fetch failed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const healthy = health?.status === "healthy";

  return (
    <div className="relative min-h-screen grain">
      <MeshBackground />
      <TopNav />

      <main className="relative z-10 mx-auto max-w-4xl px-6 pb-20 pt-10 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.24em] text-hf-emerald">
              <Activity className="h-3.5 w-3.5" />
              <span>System</span>
            </div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-alabaster">
              Integrations
            </h1>
            <p className="mt-2 max-w-xl text-sm text-hf-slate">
              Live status of every service the forge depends on. Nothing is polled to third parties —
              this only verifies local wiring and configuration.
            </p>
          </div>

          <button
            type="button"
            onClick={() => { setRefreshing(true); load(); }}
            disabled={refreshing || loading}
            data-testid="refresh-health"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs text-hf-slate hover:text-alabaster hover:border-hf-cyan/40 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={"h-3.5 w-3.5 " + (refreshing ? "animate-spin" : "")} />
            Refresh
          </button>
        </div>

        {/* Overall status hero */}
        {!loading && health ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass relative mt-8 overflow-hidden rounded-2xl px-6 py-6"
            data-testid="health-overall"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40 blur-3xl"
              style={{
                background: healthy
                  ? "radial-gradient(circle, rgba(0,255,163,0.35), transparent 60%)"
                  : "radial-gradient(circle, rgba(138,43,226,0.35), transparent 60%)",
              }}
            />
            <div className="relative flex flex-wrap items-center gap-4">
              <div className={"flex h-12 w-12 items-center justify-center rounded-2xl border " + (healthy ? "border-hf-emerald/30 bg-hf-emerald/10" : "border-hf-violet/30 bg-hf-violet/10")}>
                {healthy ? <ShieldCheck className="h-5 w-5 text-hf-emerald" /> : <ShieldAlert className="h-5 w-5 text-hf-violet" />}
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate">Overall status</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={"font-mono text-2xl font-semibold uppercase tracking-widest " + (healthy ? "text-hf-emerald" : "text-hf-violet")}>
                    {health.status}
                  </span>
                  <PulseDot healthy={healthy} />
                </div>
                <div className="mt-1 font-mono text-[11px] text-hf-slate">
                  {Object.keys(health.services || {}).length} integrations monitored
                </div>
              </div>
              <div className="rounded-full border border-hf-cyan/25 bg-hf-cyan/[0.06] px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-hf-cyan flex items-center gap-1.5">
                <Zap className="h-3 w-3" /> live
              </div>
            </div>
          </motion.div>
        ) : null}

        {loading ? (
          <div className="mt-8 glass h-64 animate-pulse rounded-2xl" />
        ) : health ? (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.05 } },
            }}
            className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
            data-testid="integrations-list"
          >
            <ServiceCard
              testid="svc-mongo"
              meta={SERVICE_META.mongo}
              ok={health.services.mongo?.connected}
              detail={
                health.services.mongo?.connected
                  ? `${health.services.mongo.latency_ms} ms`
                  : health.services.mongo?.error || "disconnected"
              }
            />
            <ServiceCard
              testid="svc-storage"
              meta={SERVICE_META.storage}
              ok={health.services.storage?.connected}
              detail={(health.services.storage?.buckets || []).join(" · ")}
            />
            <ServiceCard
              testid="svc-ffmpeg"
              meta={SERVICE_META.ffmpeg}
              ok={health.services.ffmpeg?.connected}
              detail={health.services.ffmpeg?.version || "--"}
            />
            <ServiceCard
              testid="svc-ffprobe"
              meta={SERVICE_META.ffprobe}
              ok={health.services.ffprobe?.connected}
              detail={health.services.ffprobe?.version || "--"}
            />
            <ServiceCard
              testid="svc-openai"
              meta={SERVICE_META.openai}
              ok={health.services.openai?.configured}
              detail={health.services.openai?.configured ? "key configured" : "not configured"}
            />
            <ServiceCard
              testid="svc-whisper"
              meta={SERVICE_META.whisper}
              ok={health.services.whisper?.configured ?? health.services.whisper?.connected}
              detail={
                (health.services.whisper?.configured || health.services.whisper?.connected)
                  ? (health.services.whisper?.note || "speech-to-text ready")
                  : "not configured"
              }
            />
          </motion.div>
        ) : null}
      </main>
    </div>
  );
}

function PulseDot({ healthy }) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      <span className={"absolute inset-0 rounded-full " + (healthy ? "bg-hf-emerald" : "bg-hf-violet")} />
      <span className={"absolute inset-0 animate-ping rounded-full opacity-60 " + (healthy ? "bg-hf-emerald" : "bg-hf-violet")} />
    </span>
  );
}

function ServiceCard({ meta, ok, detail, testid }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className="glass rounded-2xl p-5"
      data-testid={testid}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-hf-slate">
            {meta.label}
          </div>
          <div className="mt-0.5 text-[11px] text-hf-slate/80">{meta.note}</div>
        </div>
        {ok ? (
          <span className="flex items-center gap-1.5 rounded-full border border-hf-emerald/25 bg-hf-emerald/[0.06] px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-hf-emerald">
            <CheckCircle2 className="h-3 w-3" /> online
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-hf-violet/25 bg-hf-violet/[0.06] px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-hf-violet">
            <XCircle className="h-3 w-3" /> offline
          </span>
        )}
      </div>
      <div className="mt-4 truncate font-mono text-sm text-alabaster" title={detail}>{detail || "--"}</div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: ok ? "100%" : "20%" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={"h-full " + (ok ? "bg-gradient-to-r from-hf-emerald to-hf-cyan" : "bg-hf-violet/60")}
        />
      </div>
    </motion.div>
  );
}
