import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Film, X } from "lucide-react";
import { toast } from "sonner";
import { API_BASE, formatApiError } from "../lib/api";

const ACCEPT = ".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm";
const MAX_BYTES = 200 * 1024 * 1024;
const MAX_DURATION = 90;

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

export default function VideoUploader({ projectId, onUploaded }) {
  const inputRef = useRef(null);
  const xhrRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [bytes, setBytes] = useState({ sent: 0, total: 0 });

  const validate = (file) => {
    const nameLower = file.name.toLowerCase();
    const okExt =
      nameLower.endsWith(".mp4") ||
      nameLower.endsWith(".mov") ||
      nameLower.endsWith(".webm");
    if (!okExt) return "Only MP4, MOV, or WebM files are allowed";
    if (file.size > MAX_BYTES) return "File exceeds the 200MB limit";
    return null;
  };

  const probeDurationClient = (file) =>
    new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve(video.duration || 0);
        };
        video.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(0);
        };
        video.src = url;
      } catch {
        resolve(0);
      }
    });

  const startUpload = useCallback(
    async (file) => {
      const err = validate(file);
      if (err) {
        toast.error(err);
        return;
      }

      // Optional client-side duration guard (best-effort — backend re-checks with ffprobe)
      const clientDuration = await probeDurationClient(file);
      if (clientDuration && clientDuration > MAX_DURATION + 0.5) {
        toast.error(
          `That clip is ${clientDuration.toFixed(1)}s. Phase 1 caps at ${MAX_DURATION}s.`
        );
        return;
      }

      setUploading(true);
      setFileName(file.name);
      setProgress(0);
      setBytes({ sent: 0, total: file.size });

      const form = new FormData();
      form.append("project_id", projectId);
      form.append("file", file);

      const token = localStorage.getItem("hf_token");

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("POST", `${API_BASE}/videos`, true);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          setProgress(pct);
          setBytes({ sent: evt.loaded, total: evt.total });
        }
      };

      xhr.onerror = () => {
        toast.error("Upload failed — network error");
        setUploading(false);
        xhrRef.current = null;
      };

      xhr.onabort = () => {
        toast.message("Upload cancelled");
        setUploading(false);
        xhrRef.current = null;
      };

      xhr.onload = () => {
        xhrRef.current = null;
        setUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            toast.success(`Uploaded "${data.title}"`);
            onUploaded?.(data);
          } catch {
            toast.error("Server returned invalid response");
          }
        } else {
          let detail = "Upload failed";
          try {
            const body = JSON.parse(xhr.responseText);
            detail = formatApiError({ response: { data: body } }, "Upload failed");
          } catch {
            /* ignore */
          }
          toast.error(detail);
        }
      };

      xhr.send(form);
    },
    [projectId, onUploaded]
  );

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) startUpload(f);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    const f = e.dataTransfer.files?.[0];
    if (f) startUpload(f);
  };

  const cancelUpload = () => {
    xhrRef.current?.abort();
  };

  return (
    <div
      data-testid="video-uploader"
      onDragOver={(e) => {
        e.preventDefault();
        if (!uploading) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={
        "group relative overflow-hidden rounded-2xl border border-dashed transition-colors " +
        (dragging
          ? "border-hf-cyan/60 bg-hf-cyan/[0.04]"
          : "border-white/[0.12] bg-white/[0.02] hover:border-hf-cyan/30")
      }
    >
      {/* glow accent */}
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{
        background:
          "radial-gradient(600px 200px at 50% 0%, rgba(0,245,255,0.10), transparent 70%)," +
          "radial-gradient(400px 200px at 50% 100%, rgba(138,43,226,0.12), transparent 70%)",
      }} />

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={onFileChange}
        data-testid="file-input"
      />

      <div className="relative flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-hf-cyan/30 to-hf-violet/30 blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-obsidian/70">
            <UploadCloud className="h-7 w-7 text-hf-cyan" />
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-semibold text-alabaster tracking-tight">
            Drop raw footage
          </h3>
          <p className="mt-1 text-sm text-hf-slate">
            MP4 · MOV · WebM &nbsp;·&nbsp; up to 200MB &nbsp;·&nbsp; ≤ 90 seconds
          </p>
        </div>

        {!uploading && (
          <motion.button
            type="button"
            data-testid="pick-file-button"
            onClick={() => inputRef.current?.click()}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="mt-2 rounded-full bg-gradient-to-r from-hf-cyan to-hf-violet px-6 py-2 text-sm font-semibold text-void shadow-[0_10px_30px_-6px_rgba(0,245,255,0.55)]"
          >
            Select a clip
          </motion.button>
        )}

        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-4 w-full max-w-md"
              data-testid="upload-progress"
            >
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 truncate text-alabaster">
                  <Film className="h-3.5 w-3.5 text-hf-cyan" />
                  <span className="truncate">{fileName}</span>
                </span>
                <button
                  type="button"
                  onClick={cancelUpload}
                  data-testid="cancel-upload"
                  className="rounded-full border border-white/[0.08] p-1 text-hf-slate hover:text-alabaster"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-hf-cyan to-hf-violet shadow-[0_0_16px_rgba(0,245,255,0.55)]"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut", duration: 0.2 }}
                  data-testid="upload-progress-bar"
                />
              </div>

              <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-hf-slate">
                <span data-testid="upload-progress-percent">{progress}%</span>
                <span>
                  {formatBytes(bytes.sent)} / {formatBytes(bytes.total)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
