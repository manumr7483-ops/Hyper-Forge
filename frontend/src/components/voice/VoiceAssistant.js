import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Loader2, Send, Volume2 } from "lucide-react";
import { toast } from "sonner";
import api, { API_BASE, formatApiError } from "../../lib/api";

const RECORD_MS_MAX = 8000;

/**
 * Floating voice assistant. Uses MediaRecorder + Whisper for input, GPT-4o intent
 * parsing on the backend, and Web Speech Synthesis for the reply. Applies the
 * parsed intent to the workspace via `onIntent(intent, params)`.
 */
export default function VoiceAssistant({ videoId, onIntent, analysisDiagnosis }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | recording | transcribing | processing | speaking
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [textInput, setTextInput] = useState("");
  const [amplitude, setAmplitude] = useState(new Array(24).fill(6));
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);
  const stopTimerRef = useRef(null);
  const chunksRef = useRef([]);

  const stopMic = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    streamRef.current = null;
    audioCtxRef.current = null;
  }, []);

  useEffect(() => () => stopMic(), [stopMic]);

  const speak = useCallback((text) => {
    if (!text || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) => /en-US/i.test(v.lang) && /Google|Microsoft|Samantha/i.test(v.name)) || voices.find((v) => /en/i.test(v.lang));
      if (preferred) u.voice = preferred;
      u.rate = 1.05;
      u.pitch = 1.0;
      u.onend = () => setPhase("idle");
      setPhase("speaking");
      window.speechSynthesis.speak(u);
    } catch {
      setPhase("idle");
    }
  }, []);

  const runIntent = useCallback(async (t) => {
    setPhase("processing");
    try {
      const { data } = await api.post("/voice/intent", {
        transcript: t,
        context: {
          video_id: videoId,
          current_page: "video",
        },
      });
      setReply(data.spoken_response || "");
      if (data.intent && data.intent !== "unknown") {
        onIntent?.(data.intent, data.params || {});
      }
      speak(data.spoken_response);
    } catch (e) {
      const msg = formatApiError(e, "Intent failed");
      setReply(msg);
      toast.error(msg);
      setPhase("idle");
    }
  }, [videoId, onIntent, speak]);

  const submitTranscript = async (t) => {
    setTranscript(t);
    await runIntent(t);
  };

  const startRecording = async () => {
    setTranscript("");
    setReply("");
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      return startFallbackSpeech();
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm" });
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        setPhase("transcribing");
        try {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
          const form = new FormData();
          form.append("audio", blob, "clip.webm");
          const token = localStorage.getItem("hf_token");
          const res = await fetch(`${API_BASE}/voice/transcribe`, {
            method: "POST",
            body: form,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          if (!data.transcript) {
            toast.message("Didn't catch anything");
            setPhase("idle");
            return;
          }
          setTranscript(data.transcript);
          await runIntent(data.transcript);
        } catch (e) {
          toast.error("Transcription failed");
          setPhase("idle");
        }
      };

      // amplitude viz
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
      audioCtxRef.current = ctx;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        const bins = new Array(24).fill(0);
        const step = Math.floor(buf.length / 24);
        for (let i = 0; i < 24; i += 1) {
          let s = 0;
          for (let j = 0; j < step; j += 1) s += buf[i * step + j] || 0;
          bins[i] = Math.max(6, Math.round((s / step) * 0.4));
        }
        setAmplitude(bins);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      rec.start();
      setPhase("recording");
      stopTimerRef.current = setTimeout(stopMic, RECORD_MS_MAX);
    } catch (e) {
      startFallbackSpeech();
    }
  };

  const startFallbackSpeech = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Microphone unavailable — type instead");
      setPhase("idle");
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = false;
    r.onresult = (e) => submitTranscript(e.results[0][0].transcript);
    r.onerror = () => setPhase("idle");
    r.onend = () => {
      if (phase === "recording") setPhase("idle");
    };
    r.start();
    setPhase("recording");
  };

  const stopAndSubmit = () => {
    stopMic();
  };

  const busy = phase !== "idle";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="voice-assistant-toggle"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-hf-cyan to-hf-violet text-void shadow-[0_20px_50px_-15px_rgba(0,245,255,0.7)] hover:scale-105 transition-transform"
        aria-label="Voice assistant"
      >
        <Mic className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-24 right-6 z-40 w-[min(92vw,380px)] glass-strong rounded-2xl p-5 shadow-[0_30px_80px_-20px_rgba(0,245,255,0.35)]"
            data-testid="voice-hud"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-mono uppercase tracking-[0.24em] text-hf-cyan">
                Voice assistant
              </div>
              <button
                type="button"
                onClick={() => { setOpen(false); stopMic(); window.speechSynthesis?.cancel(); setPhase("idle"); }}
                className="rounded-full border border-white/[0.08] bg-white/[0.02] p-1.5 text-hf-slate hover:text-alabaster"
                data-testid="voice-close"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* Waveform */}
            <div className="mb-3 flex h-16 items-end gap-1 rounded-xl border border-white/[0.06] bg-obsidian/50 px-3 py-2">
              {amplitude.map((h, i) => (
                <motion.span
                  key={i}
                  animate={{ height: phase === "recording" ? h : 6 }}
                  className="flex-1 rounded-full bg-gradient-to-t from-hf-cyan to-hf-violet"
                  style={{ minHeight: 4 }}
                />
              ))}
            </div>

            {/* Status */}
            <div className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-widest">
              {phase === "recording" && <span className="text-hf-cyan flex items-center gap-1"><Mic className="h-3 w-3" /> Listening…</span>}
              {phase === "transcribing" && <span className="text-hf-cyan flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Transcribing…</span>}
              {phase === "processing" && <span className="text-hf-violet flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Thinking…</span>}
              {phase === "speaking" && <span className="text-hf-emerald flex items-center gap-1"><Volume2 className="h-3 w-3" /> Speaking</span>}
              {phase === "idle" && <span className="text-hf-slate">Ready — hold the mic or type below</span>}
            </div>

            {transcript && (
              <div className="mb-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-alabaster" data-testid="voice-transcript">
                <span className="font-mono text-[10px] uppercase tracking-widest text-hf-slate mr-1">you</span>
                {transcript}
              </div>
            )}
            {reply && (
              <div className="mb-3 rounded-xl border border-hf-cyan/25 bg-hf-cyan/[0.05] px-3 py-2 text-sm text-alabaster" data-testid="voice-reply">
                <span className="font-mono text-[10px] uppercase tracking-widest text-hf-cyan mr-1">forge</span>
                {reply}
              </div>
            )}

            <div className="flex gap-2">
              {phase === "recording" ? (
                <button
                  type="button"
                  onClick={stopAndSubmit}
                  data-testid="voice-stop"
                  className="flex-1 rounded-full bg-hf-violet px-4 py-2 text-sm font-semibold text-alabaster"
                >
                  <MicOff className="mr-1 inline h-3.5 w-3.5" /> Stop
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={startRecording}
                  data-testid="voice-record"
                  className="flex-1 rounded-full bg-gradient-to-r from-hf-cyan to-hf-violet px-4 py-2 text-sm font-semibold text-void disabled:opacity-50"
                >
                  <Mic className="mr-1 inline h-3.5 w-3.5" /> Hold to talk
                </button>
              )}
            </div>

            <form
              className="mt-2 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!textInput.trim() || busy) return;
                const t = textInput.trim();
                setTextInput("");
                await submitTranscript(t);
              }}
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="or type your command…"
                data-testid="voice-text-input"
                className="hf-input flex-1 !py-2 !text-sm"
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy || !textInput.trim()}
                data-testid="voice-text-submit"
                className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-hf-slate hover:text-alabaster disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
