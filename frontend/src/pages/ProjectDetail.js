import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Film, HardDrive } from "lucide-react";
import { toast } from "sonner";
import api, { apiFileUrl, formatApiError } from "../lib/api";
import MeshBackground from "../components/MeshBackground";
import TopNav from "../components/TopNav";
import VideoUploader from "../components/VideoUploader";

const PLATFORM_LABEL = {
  instagram_reels: "IG Reels",
  youtube_shorts: "YT Shorts",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x: "X",
};

function formatDuration(seconds) {
  if (seconds == null) return "--";
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function formatBytes(n) {
  if (!n && n !== 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [project, setProject] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, vRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/videos`),
      ]);
      setProject(pRes.data);
      setVideos(vRes.data);
    } catch (e) {
      toast.error(formatApiError(e, "Project not found"));
      nav("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, nav]);

  useEffect(() => {
    load();
  }, [load]);

  const onUploaded = (v) => {
    setVideos((prev) => [v, ...prev]);
  };

  const totalMinutes = useMemo(() => {
    const s = videos.reduce((acc, v) => acc + (v.duration_seconds || 0), 0);
    return (s / 60).toFixed(1);
  }, [videos]);

  return (
    <div className="relative min-h-screen grain">
      <MeshBackground />
      <TopNav />

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-8 lg:px-10">
        <Link
          to="/dashboard"
          data-testid="back-to-dashboard"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-hf-slate hover:text-alabaster transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to studio
        </Link>

        {loading ? (
          <div className="mt-10 glass h-40 animate-pulse rounded-2xl" />
        ) : project ? (
          <>
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-6 glass relative overflow-hidden rounded-2xl p-8"
            >
              <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-hf-violet/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-hf-cyan/20 blur-3xl" />

              <div className="relative flex flex-wrap items-start justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono uppercase tracking-[0.24em] text-hf-cyan/80">
                    Project
                  </div>
                  <h1
                    data-testid="project-name"
                    className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight text-alabaster"
                  >
                    {project.name}
                  </h1>
                  <p className="mt-3 max-w-2xl text-base text-hf-slate">{project.goal}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {(project.target_platforms || []).map((p) => (
                      <span key={p} className="hf-chip">
                        {PLATFORM_LABEL[p] || p}
                      </span>
                    ))}
                    <span className="hf-chip text-hf-emerald border-hf-emerald/25 bg-hf-emerald/[0.06]">
                      {project.brand_tone}
                    </span>
                    {project.target_audience && (
                      <span className="hf-chip">👥 {project.target_audience}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-right">
                  <MiniStat label="Videos" value={videos.length} />
                  <MiniStat label="Minutes" value={totalMinutes} />
                  <MiniStat label="Status" value="Draft" mono={false} />
                </div>
              </div>
            </motion.section>

            {/* Uploader */}
            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight text-alabaster">
                  Upload footage
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const { data } = await api.post(`/dev/seed-sample-video/${project.id}?type=silent`);
                        setVideos((prev) => [data, ...prev]);
                        toast.success("Silent sample added");
                      } catch (e) {
                        toast.error(formatApiError(e, "Sample unavailable"));
                      }
                    }}
                    data-testid="seed-sample-silent"
                    className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.2em] text-hf-slate hover:text-alabaster hover:border-hf-cyan/40 transition-colors"
                    title="Silent 20s testsrc + sine (Phase 1/2 sanity)"
                  >
                    + Silent sample
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const { data } = await api.post(`/dev/seed-sample-video/${project.id}?type=talking`);
                        setVideos((prev) => [data, ...prev]);
                        toast.success("Talking sample added");
                      } catch (e) {
                        toast.error(formatApiError(e, "Sample unavailable"));
                      }
                    }}
                    data-testid="seed-sample-talking"
                    className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-hf-cyan/25 bg-hf-cyan/[0.06] px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.2em] text-hf-cyan hover:border-hf-cyan/40 transition-colors"
                    title="Scripted talking sample with speech + silence gaps (Phase 3 forge)"
                  >
                    + Talking sample
                  </button>
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-hf-slate">
                    Raw → Forged
                  </span>
                </div>
              </div>
              <VideoUploader projectId={project.id} onUploaded={onUploaded} />
            </section>

            {/* Videos */}
            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight text-alabaster">
                  Videos
                </h2>
                <span className="text-xs text-hf-slate">
                  {videos.length} clip{videos.length === 1 ? "" : "s"}
                </span>
              </div>

              {videos.length === 0 ? (
                <div
                  data-testid="videos-empty"
                  className="glass rounded-2xl px-6 py-12 text-center"
                >
                  <Film className="mx-auto h-6 w-6 text-hf-slate/60" />
                  <p className="mt-3 text-sm text-hf-slate">
                    No videos yet — drop a clip above to get started.
                  </p>
                </div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
                  }}
                  className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
                  data-testid="videos-grid"
                >
                  {videos.map((v) => (
                    <VideoCard key={v.id} v={v} />
                  ))}
                </motion.div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

function MiniStat({ label, value, mono = true }) {
  return (
    <div className="min-w-[80px]">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-hf-slate">
        {label}
      </div>
      <div className={`mt-1 ${mono ? "font-mono" : ""} text-xl font-semibold text-alabaster`}>
        {value}
      </div>
    </div>
  );
}

function VideoCard({ v }) {
  const thumb = apiFileUrl(v.thumbnail_url);
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group glass overflow-hidden rounded-2xl"
      data-testid={`video-card-${v.id}`}
    >
      <Link to={`/video/${v.id}`} className="block">
        <div className="relative aspect-video overflow-hidden bg-obsidian">
          {thumb ? (
            <img
              src={thumb}
              alt={v.title}
              className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-hf-slate/60">
              <Film className="h-8 w-8" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-void/80 via-transparent to-transparent" />

          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-white/[0.1] bg-void/70 px-2 py-1 font-mono text-[11px] text-hf-cyan backdrop-blur">
            <Clock className="h-3 w-3" />
            {formatDuration(v.duration_seconds)}
          </div>

          <div className="absolute left-3 bottom-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hf-emerald/25 bg-hf-emerald/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-hf-emerald">
              <span className="h-1.5 w-1.5 rounded-full bg-hf-emerald shadow-[0_0_8px_rgba(0,255,163,0.9)]" />
              {v.status}
            </span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-alabaster" title={v.title}>
              {v.title}
            </div>
            <div className="mt-1 flex items-center gap-3 text-[11px] font-mono text-hf-slate">
              <span className="inline-flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                {formatBytes(v.file_size_bytes)}
              </span>
              {v.aspect_ratio && <span>{v.aspect_ratio}</span>}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
