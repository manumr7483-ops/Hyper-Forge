import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Layers, Film, Sparkles, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";
import MeshBackground from "../components/MeshBackground";
import TopNav from "../components/TopNav";
import CreateProjectModal from "../components/CreateProjectModal";
import ForgeCoreOrb from "../components/canvas/ForgeCoreOrb";

const TONE_LABEL = {
  energetic: "Energetic",
  cinematic: "Cinematic",
  professional: "Professional",
  chill: "Chill",
  "aggressive-hype": "Aggressive Hype",
};

const PLATFORM_LABEL = {
  instagram_reels: "IG Reels",
  youtube_shorts: "YT Shorts",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x: "X",
};

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    total_projects: 0,
    total_videos: 0,
    avg_hyperforge_score: 0,
    total_watch_ready_minutes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.get("/projects"),
        api.get("/dashboard/stats"),
      ]);
      setProjects(pRes.data);
      setStats(sRes.data);
    } catch (e) {
      toast.error(formatApiError(e, "Could not load dashboard"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreated = (p) => {
    setProjects((prev) => [p, ...prev]);
    setStats((s) => ({ ...s, total_projects: s.total_projects + 1 }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this project and all its videos?")) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Project removed");
      load();
    } catch (e) {
      toast.error(formatApiError(e, "Delete failed"));
    }
  };

  return (
    <div className="relative min-h-screen grain">
      <MeshBackground />
      <TopNav />

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-10 lg:px-10">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 flex items-start justify-between gap-6"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.24em] text-hf-cyan/80">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Your Forge</span>
            </div>
            <h1
              data-testid="dashboard-heading"
              className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-alabaster"
            >
              Your{" "}
              <span className="relative inline-block">
                <span className="text-gradient-hf">Forge</span>
                <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full gradient-underline" />
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-hf-slate">
              Turn raw footage into scroll-stopping content. Upload once — forge for every platform.
            </p>
          </div>
          <div className="shrink-0 md:block" data-testid="dashboard-orb">
            <ForgeCoreOrb state="idle" size={180} />
          </div>
        </motion.section>

        {/* Stats strip */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
          className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4"
          data-testid="stats-strip"
        >
          <StatCard
            testid="stat-projects"
            label="Projects"
            value={stats.total_projects}
            hint="active forges"
            accent="cyan"
            icon={Layers}
          />
          <StatCard
            testid="stat-videos"
            label="Videos"
            value={stats.total_videos}
            hint="uploaded"
            accent="violet"
            icon={Film}
          />
          <StatCard
            testid="stat-score"
            label="Avg HF Score"
            value={stats.avg_hyperforge_score?.toFixed?.(1) ?? "0.0"}
            hint="across analysed videos"
            accent="emerald"
            icon={Sparkles}
          />
          <StatCard
            testid="stat-minutes"
            label="Watch-Ready"
            value={stats.total_watch_ready_minutes}
            unit="min"
            hint="total duration"
            accent="cyan"
            icon={Clock}
          />
        </motion.section>

        {/* Projects header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-alabaster">
              Projects
            </h2>
            <p className="text-sm text-hf-slate">
              {loading ? "Loading..." : `${projects.length} in your studio`}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowModal(true)}
            data-testid="open-create-project"
            className="hidden md:inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-hf-cyan to-hf-violet px-5 py-2.5 text-sm font-semibold text-void shadow-[0_10px_40px_-10px_rgba(0,245,255,0.5)]"
          >
            <Plus className="h-4 w-4" />
            Create project
          </motion.button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass h-52 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState onCreate={() => setShowModal(true)} />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.06 } },
            }}
            className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
            data-testid="projects-grid"
          >
            {projects.map((p) => (
              <ProjectCard key={p.id} p={p} onDelete={handleDelete} />
            ))}
            <NewProjectCard onClick={() => setShowModal(true)} />
          </motion.div>
        )}
      </main>

      <CreateProjectModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}

function StatCard({ testid, label, value, unit, hint, accent = "cyan", icon: Icon, dim }) {
  const accents = {
    cyan: "text-hf-cyan",
    violet: "text-hf-violet",
    emerald: "text-hf-emerald",
  };
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      data-testid={testid}
      className="glass relative overflow-hidden rounded-2xl p-5"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl"
        style={{
          background:
            accent === "violet"
              ? "radial-gradient(circle, #8A2BE2, transparent 60%)"
              : accent === "emerald"
              ? "radial-gradient(circle, #00FFA3, transparent 60%)"
              : "radial-gradient(circle, #00F5FF, transparent 60%)",
        }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-hf-slate">
          {label}
        </span>
        {Icon && <Icon className={`h-4 w-4 ${accents[accent]}`} />}
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className={`font-mono text-3xl font-semibold ${dim ? "text-hf-slate" : "text-alabaster"}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-hf-slate">{unit}</span>}
      </div>
      <div className="mt-1 text-xs text-hf-slate">{hint}</div>
    </motion.div>
  );
}

function ProjectCard({ p, onDelete }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group glass relative flex flex-col overflow-hidden rounded-2xl p-6"
      data-testid={`project-card-${p.id}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-hf-cyan/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-semibold tracking-tight text-alabaster">
            {p.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-hf-slate">{p.goal}</p>
        </div>
        <div className="flex items-center gap-2">
          {p.analyzed_count > 0 && p.avg_hyperforge_score != null ? (
            <div
              data-testid={`project-score-${p.id}`}
              title={`Average HyperForge Score across ${p.analyzed_count} analysed video${p.analyzed_count === 1 ? "" : "s"}`}
              className="flex flex-col items-center rounded-2xl border border-hf-cyan/25 bg-hf-cyan/[0.06] px-2.5 py-1 text-hf-cyan"
            >
              <span className="font-mono text-lg font-semibold leading-none">
                {p.avg_hyperforge_score.toFixed(1)}
              </span>
              <span className="mt-0.5 text-[9px] font-mono uppercase tracking-widest text-hf-cyan/80">
                HF Score
              </span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(p.id);
            }}
            data-testid={`delete-project-${p.id}`}
            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full border border-white/[0.08] bg-white/[0.03] p-2 text-hf-slate hover:text-hf-violet hover:border-hf-violet/40"
            aria-label="Delete project"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-auto space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {(p.target_platforms || []).slice(0, 4).map((pl) => (
            <span key={pl} className="hf-chip">
              {PLATFORM_LABEL[pl] || pl}
            </span>
          ))}
          {(p.target_platforms || []).length > 4 && (
            <span className="hf-chip">+{p.target_platforms.length - 4}</span>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.05] pt-3">
          <div className="flex items-center gap-4">
            <span className="text-xs text-hf-slate">
              <span className="font-mono text-alabaster">{p.video_count}</span>{" "}
              videos
            </span>
            <span className="text-xs text-hf-slate">
              {TONE_LABEL[p.brand_tone] || p.brand_tone}
            </span>
          </div>
          <Link
            to={`/project/${p.id}`}
            data-testid={`open-project-${p.id}`}
            className="text-xs font-medium text-hf-cyan hover:text-alabaster transition-colors"
          >
            Enter forge →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function NewProjectCard({ onClick }) {
  return (
    <motion.button
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      onClick={onClick}
      data-testid="create-project-card"
      className="group relative flex min-h-[190px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-6 text-center transition-colors hover:border-hf-cyan/40"
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-hf-cyan/40 to-hf-violet/40 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-obsidian/70">
          <Plus className="h-5 w-5 text-hf-cyan" />
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold tracking-wide text-alabaster">
          + CREATE PROJECT
        </div>
        <div className="mt-1 text-xs text-hf-slate">Start a new forge</div>
      </div>
    </motion.button>
  );
}

function EmptyState({ onCreate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass relative overflow-hidden rounded-2xl px-8 py-20 text-center"
      data-testid="empty-state"
    >
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{
        background:
          "radial-gradient(500px 200px at 50% 20%, rgba(0,245,255,0.15), transparent 60%)," +
          "radial-gradient(500px 200px at 50% 100%, rgba(138,43,226,0.18), transparent 60%)",
      }} />
      <div className="relative mx-auto max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.08] bg-obsidian/70">
          <Sparkles className="h-6 w-6 text-hf-cyan" />
        </div>
        <h3 className="text-2xl font-semibold tracking-tight text-alabaster">
          Forge your first project
        </h3>
        <p className="mt-2 text-sm text-hf-slate">
          Set a goal, pick the platforms, and start uploading footage. HyperForge does the rest.
        </p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onCreate}
          data-testid="empty-create-cta"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-hf-cyan to-hf-violet px-6 py-3 text-sm font-semibold text-void shadow-[0_15px_50px_-10px_rgba(0,245,255,0.55)]"
        >
          <Plus className="h-4 w-4" />
          Create project
        </motion.button>
      </div>
    </motion.div>
  );
}
