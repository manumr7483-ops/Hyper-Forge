import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Sparkles, RefreshCw, Instagram, Youtube, Linkedin, Twitter, Music } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../../lib/api";

const CAPTION_LABEL = {
  provocateur: "Provocateur",
  storyteller: "Storyteller",
  direct_value: "Direct Value",
  minimalist: "Minimalist",
};

const PLATFORM_ICONS = {
  instagram_reels: Instagram,
  youtube_shorts: Youtube,
  linkedin: Linkedin,
  x: Twitter,
  tiktok: Music,
};

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch { toast.error("Copy failed"); }
}

export default function MarketingPanel({ videoId, analysisReady, controlRef }) {
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [performance, setPerformance] = useState([]);
  const [showPerfForm, setShowPerfForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/videos/${videoId}/marketing`);
      setStrategy(data);
    } catch (e) {
      if (e?.response?.status !== 404) toast.error(formatApiError(e, "Failed"));
      setStrategy(null);
    }
    try {
      const { data } = await api.get(`/videos/${videoId}/performance`);
      const entries = Array.isArray(data)
        ? data
        : (data && Array.isArray(data.entries) ? data.entries : []);
      setPerformance(entries);
    } catch { /* ignore */ }
  }, [videoId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post(`/videos/${videoId}/marketing/generate`);
      setStrategy(data);
      toast.success("Marketing strategy ready");
    } catch (e) {
      toast.error(formatApiError(e, "Marketing failed"));
    } finally { setGenerating(false); }
  };

  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = { generate };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const s = strategy?.strategy && typeof strategy.strategy === "object" ? strategy.strategy : null;

  return (
    <section className="mt-16 scroll-mt-24" data-testid="marketing-panel" id="marketing">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.24em] text-hf-violet">
            <Sparkles className="h-3.5 w-3.5" />
            Marketing
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-alabaster">
            Ready-to-post distribution kit.
          </h2>
          <p className="mt-1 text-sm text-hf-slate">One GPT-4o call — captions, hooks, hashtags, cadence, series plan.</p>
        </div>
        {strategy ? (
          <button type="button" onClick={generate} disabled={generating} data-testid="marketing-regen"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs text-hf-slate hover:text-alabaster hover:border-hf-cyan/40 disabled:opacity-50">
            <RefreshCw className={"h-3.5 w-3.5 " + (generating ? "animate-spin" : "")} /> Regenerate
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="glass h-48 animate-pulse rounded-2xl" />
      ) : !analysisReady ? (
        <div className="glass rounded-2xl px-8 py-14 text-center text-hf-slate" data-testid="marketing-locked">
          Analyse the video first — the marketing generator uses transcript, niche, and scores.
        </div>
      ) : !s ? (
        <div className="glass relative overflow-hidden rounded-2xl px-8 py-16 text-center" data-testid="marketing-empty">
          <div className="pointer-events-none absolute inset-0 opacity-70" style={{
            background: "radial-gradient(500px 200px at 50% 20%, rgba(138,43,226,0.18), transparent 60%),radial-gradient(500px 200px at 50% 100%, rgba(0,245,255,0.15), transparent 60%)",
          }} />
          <div className="relative mx-auto max-w-md">
            <h3 className="text-2xl font-semibold text-alabaster">Turn insight into distribution.</h3>
            <p className="mt-2 text-sm text-hf-slate">Personas, captions per style, hashtags, and a 3-episode series plan — from your analysis.</p>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={generate} disabled={generating} data-testid="marketing-generate"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-hf-cyan to-hf-violet px-6 py-3 text-sm font-semibold text-void shadow-[0_15px_50px_-10px_rgba(138,43,226,0.55)] disabled:opacity-60">
              <Sparkles className="h-4 w-4" /> {generating ? "Thinking…" : "⚡ Generate Marketing"}
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12" data-testid="marketing-content">
          {/* LEFT: Persona + Series plan */}
          <div className="lg:col-span-4 space-y-5">
            <div className="glass rounded-2xl p-5" data-testid="mkt-persona">
              <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate">Persona</div>
              <div className="mt-2 text-lg font-semibold text-alabaster">{s.target_audience_persona?.primary}</div>
              <div className="text-xs text-hf-slate">{s.target_audience_persona?.secondary}</div>
              <div className="mt-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-hf-slate mb-1">Psychographics</div>
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(s.target_audience_persona?.psychographics) ? s.target_audience_persona.psychographics : []).map((p, i) => (
                    <span key={i} className="hf-chip !text-hf-cyan !border-hf-cyan/25 !bg-hf-cyan/[0.06]">{p}</span>
                  ))}
                </div>
              </div>
              <div className="mt-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-hf-slate mb-1">Friction points</div>
                <ul className="space-y-1 text-xs text-alabaster/80">
                  {(Array.isArray(s.target_audience_persona?.friction_points) ? s.target_audience_persona.friction_points : []).map((f, i) => (
                    <li key={i} className="flex gap-2"><span className="text-hf-violet">·</span>{f}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="glass rounded-2xl p-5" data-testid="mkt-series">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate">Series plan</div>
                <span className="text-[11px] text-hf-cyan">{s.series_plan?.theme}</span>
              </div>
              <div className="mt-3 space-y-2">
                {(Array.isArray(s.series_plan?.episodes) ? s.series_plan.episodes : []).map((ep, i) => (
                  <div key={ep?.n ?? i} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-hf-violet">Ep {ep?.n ?? i + 1}</div>
                    <div className="mt-0.5 text-sm text-alabaster">{ep?.hook}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER: Captions + CTAs */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              <div className="mb-3 text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate">Post captions</div>
              <div className="grid gap-3 sm:grid-cols-2" data-testid="mkt-captions">
                {(Array.isArray(s.post_captions) ? s.post_captions : []).map((c, i) => (
                  <div key={c?.style ?? i} data-testid={`mkt-caption-${c?.style ?? i}`}
                    className="glass rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-hf-cyan/25 bg-hf-cyan/[0.06] px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-widest text-hf-cyan">
                        {CAPTION_LABEL[c?.style] || c?.style}
                      </span>
                      <button type="button" onClick={() => copy(c?.text)} data-testid={`copy-caption-${c?.style ?? i}`}
                        className="rounded-full border border-white/[0.08] bg-white/[0.02] p-1.5 text-hf-slate hover:text-alabaster"><Copy className="h-3 w-3" /></button>
                    </div>
                    <p className="text-sm leading-snug text-alabaster">{c?.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate">CTAs per platform</div>
              <div className="flex flex-wrap gap-2" data-testid="mkt-ctas">
                {(Array.isArray(s.ctas) ? s.ctas : []).map((c, i) => {
                  const Icon = PLATFORM_ICONS[c?.platform] || Music;
                  return (
                    <button key={c?.platform ?? i} type="button" onClick={() => copy(c?.text)} data-testid={`mkt-cta-${c?.platform ?? i}`}
                      className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-alabaster hover:bg-white/[0.05]">
                      <Icon className="h-3.5 w-3.5 text-hf-cyan" />
                      <span className="max-w-[200px] truncate">{c?.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-3 text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate">Hook variants</div>
              <div className="space-y-2" data-testid="mkt-hooks">
                {(Array.isArray(s.hook_variants) ? s.hook_variants : []).map((h, i) => (
                  <button key={i} type="button" onClick={() => copy(h)}
                    className="glass block w-full rounded-xl p-3 text-left text-sm text-alabaster hover:bg-white/[0.04]">
                    "{h}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Hashtags + Keywords + Cadence + Repurposing */}
          <div className="lg:col-span-3 space-y-5">
            <div className="glass rounded-2xl p-5" data-testid="mkt-hashtags">
              <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate mb-3">Hashtags</div>
              {["broad", "niche", "branded"].map((grp) => {
                const raw = s.hashtags?.[grp];
                const list = Array.isArray(raw)
                  ? raw
                  : typeof raw === "string"
                  ? raw.split(/[\s,]+/).map((t) => t.replace(/^#/, "")).filter(Boolean)
                  : [];
                return (
                  <div key={grp} className="mb-3">
                    <div className="text-[9px] font-mono uppercase tracking-widest text-hf-slate mb-1">{grp}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((h, idx) => (
                        <button key={idx} type="button" onClick={() => copy(`#${h}`)} data-testid={`hashtag-${grp}-${h}`}
                          className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[11px] text-alabaster hover:border-hf-cyan/40 hover:text-hf-cyan">
                          #{h}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="glass rounded-2xl p-5" data-testid="mkt-keywords">
              <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate mb-2">Keywords</div>
              <div className="flex flex-wrap gap-1.5">
                {(Array.isArray(s.recommended_keywords) ? s.recommended_keywords : []).map((k, i) => (
                  <span key={i} className="hf-chip">{k}</span>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-5" data-testid="mkt-cadence">
              <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate mb-2">Posting cadence</div>
              <ul className="space-y-1 text-xs">
                {Object.entries(
                  s.posting_cadence && typeof s.posting_cadence === "object" && !Array.isArray(s.posting_cadence)
                    ? s.posting_cadence
                    : {}
                ).map(([p, v]) => (
                  <li key={p} className="flex items-start justify-between gap-3 border-t border-white/[0.05] pt-1 first:border-0 first:pt-0">
                    <span className="text-hf-slate font-mono uppercase tracking-widest text-[10px] flex-none">{String(p).replace("_", " ")}</span>
                    <span className="text-alabaster text-right">{String(v)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass rounded-2xl p-5" data-testid="mkt-repurpose">
              <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate mb-2">Repurposing angles</div>
              <div className="space-y-2">
                {(Array.isArray(s.repurposing_angles) ? s.repurposing_angles : []).map((r, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-hf-cyan">{r?.platform}</div>
                    <div className="mt-0.5 text-xs text-alabaster">{r?.angle}</div>
                    <div className="mt-0.5 text-[11px] text-hf-slate">{r?.reformat_notes}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full-width performance logger */}
          <div className="lg:col-span-12">
            <PerformanceLogger
              videoId={videoId}
              entries={performance}
              onAdd={(e) => setPerformance((prev) => [e, ...(Array.isArray(prev) ? prev : [])])}
              open={showPerfForm}
              onToggle={() => setShowPerfForm((v) => !v)}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function PerformanceLogger({ videoId, entries = [], onAdd, open, onToggle }) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const [platform, setPlatform] = useState("instagram_reels");
  const [postedAt, setPostedAt] = useState(new Date().toISOString().slice(0, 10));
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [shares, setShares] = useState("");
  const [saves, setSaves] = useState("");
  const [wt, setWt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post(`/videos/${videoId}/performance`, {
        platform,
        posted_at: new Date(postedAt).toISOString(),
        views: Number(views) || 0,
        likes: Number(likes) || 0,
        comments: Number(comments) || 0,
        shares: Number(shares) || 0,
        saves: Number(saves) || 0,
        watch_time_avg_seconds: Number(wt) || 0,
      });
      toast.success("Performance logged");
      onAdd?.(data);
      setViews(""); setLikes(""); setComments(""); setShares(""); setSaves(""); setWt("");
    } catch (e) {
      toast.error(formatApiError(e, "Log failed"));
    } finally { setSubmitting(false); }
  };

  return (
    <div className="glass rounded-2xl p-5" data-testid="perf-logger">
      <button type="button" onClick={onToggle} data-testid="perf-toggle"
        className="flex w-full items-center justify-between text-left">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-hf-slate">Feedback loop</div>
          <div className="mt-1 text-sm text-alabaster">Log post performance ({safeEntries.length} entries)</div>
        </div>
        <span className="text-hf-slate text-xs">{open ? "−" : "+"}</span>
      </button>
      <div className="mt-1 text-[11px] text-hf-slate">
        Manually reported. Used to calibrate future score weights in a later release.
      </div>
      <AnimatePresence>
        {open && (
          <motion.form onSubmit={submit} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="mt-4 grid gap-3 sm:grid-cols-4">
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="hf-input !py-2 !text-sm" data-testid="perf-platform">
              {["instagram_reels","youtube_shorts","tiktok","linkedin","x"].map((p) => <option key={p} value={p} className="bg-obsidian">{p}</option>)}
            </select>
            <input type="date" value={postedAt} onChange={(e) => setPostedAt(e.target.value)} className="hf-input !py-2 !text-sm" data-testid="perf-date" />
            <input type="number" placeholder="Views" value={views} onChange={(e) => setViews(e.target.value)} className="hf-input !py-2 !text-sm" data-testid="perf-views" />
            <input type="number" placeholder="Likes" value={likes} onChange={(e) => setLikes(e.target.value)} className="hf-input !py-2 !text-sm" data-testid="perf-likes" />
            <input type="number" placeholder="Comments" value={comments} onChange={(e) => setComments(e.target.value)} className="hf-input !py-2 !text-sm" />
            <input type="number" placeholder="Shares" value={shares} onChange={(e) => setShares(e.target.value)} className="hf-input !py-2 !text-sm" />
            <input type="number" placeholder="Saves" value={saves} onChange={(e) => setSaves(e.target.value)} className="hf-input !py-2 !text-sm" />
            <input type="number" step="0.1" placeholder="Avg watch time (s)" value={wt} onChange={(e) => setWt(e.target.value)} className="hf-input !py-2 !text-sm" />
            <button type="submit" disabled={submitting || !views} data-testid="perf-submit"
              className="col-span-full rounded-full bg-gradient-to-r from-hf-cyan to-hf-violet px-4 py-2 text-sm font-semibold text-void disabled:opacity-50">
              {submitting ? "Logging…" : "Log post"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
      {safeEntries.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.05]">
          <table className="w-full text-left text-xs" data-testid="perf-table">
            <thead className="bg-white/[0.03] font-mono uppercase tracking-widest text-[10px] text-hf-slate">
              <tr>
                <th className="px-3 py-2">Platform</th><th className="px-3 py-2">Posted</th><th className="px-3 py-2">Views</th><th className="px-3 py-2">Likes</th><th className="px-3 py-2">Comments</th><th className="px-3 py-2">Saves</th>
              </tr>
            </thead>
            <tbody>
              {safeEntries.map((e, idx) => (
                <tr key={e?.id ?? idx} className="border-t border-white/[0.05]">
                  <td className="px-3 py-2 text-hf-cyan">{e?.platform}</td>
                  <td className="px-3 py-2 font-mono text-hf-slate">{(e?.posted_at || "").slice(0, 10)}</td>
                  <td className="px-3 py-2 font-mono text-alabaster">{e?.views}</td>
                  <td className="px-3 py-2 font-mono text-alabaster">{e?.likes}</td>
                  <td className="px-3 py-2 font-mono text-alabaster">{e?.comments}</td>
                  <td className="px-3 py-2 font-mono text-alabaster">{e?.saves}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
