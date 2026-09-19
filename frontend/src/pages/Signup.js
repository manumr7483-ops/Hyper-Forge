import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import MeshBackground from "../components/MeshBackground";

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    const res = await signup(email.trim(), password, fullName.trim());
    setSubmitting(false);
    if (res.ok) {
      toast.success("Welcome to HyperForge");
      nav("/dashboard", { replace: true });
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="relative min-h-screen grain">
      <MeshBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight text-gradient-hf">
                HYPERFORGE
              </span>
            </Link>
            <div className="mt-6">
              <h1 className="text-4xl font-bold tracking-tight text-alabaster">
                Claim your forge
              </h1>
              <p className="mt-2 text-sm text-hf-slate">
                Turn raw footage into scroll-stopping content.
              </p>
            </div>
          </div>

          <form
            onSubmit={submit}
            data-testid="signup-form"
            className="glass-strong rounded-2xl p-8 shadow-[0_30px_100px_-30px_rgba(138,43,226,0.4)]"
          >
            <label className="block">
              <span className="mb-2 block text-xs font-mono uppercase tracking-[0.2em] text-hf-slate">
                Full name
              </span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="hf-input hf-focus"
                data-testid="signup-name"
                placeholder="Ada Lovelace"
              />
            </label>

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-mono uppercase tracking-[0.2em] text-hf-slate">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="hf-input hf-focus"
                data-testid="signup-email"
                placeholder="you@studio.com"
              />
            </label>

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-mono uppercase tracking-[0.2em] text-hf-slate">
                Password
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="hf-input hf-focus"
                data-testid="signup-password"
                placeholder="min 6 characters"
              />
            </label>

            <motion.button
              type="submit"
              whileHover={{ scale: submitting ? 1 : 1.02 }}
              whileTap={{ scale: submitting ? 1 : 0.98 }}
              disabled={submitting}
              data-testid="signup-submit"
              className="mt-8 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-hf-cyan to-hf-violet px-6 py-3 text-sm font-semibold text-void shadow-[0_15px_50px_-10px_rgba(138,43,226,0.55)] disabled:opacity-60"
            >
              {submitting ? "Creating account..." : "Create account"}
            </motion.button>

            <p className="mt-6 text-center text-sm text-hf-slate">
              Already have one?{" "}
              <Link
                to="/login"
                data-testid="link-to-login"
                className="text-hf-cyan hover:text-alabaster transition-colors"
              >
                Sign in
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
