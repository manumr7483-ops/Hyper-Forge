import { motion } from "framer-motion";

/**
 * Animated dark mesh glow background — layered blurred blobs of
 * HyperForge Cyan + Plasma Violet drifting slowly.
 */
export default function MeshBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      data-testid="mesh-background"
      aria-hidden="true"
    >
      {/* base void */}
      <div className="absolute inset-0 bg-[#050507]" />

      {/* radial vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 700px at 15% -10%, rgba(0,245,255,0.14), transparent 60%)," +
            "radial-gradient(900px 700px at 90% 10%, rgba(138,43,226,0.18), transparent 60%)," +
            "radial-gradient(700px 500px at 60% 110%, rgba(0,255,163,0.08), transparent 60%)",
        }}
      />

      {/* drifting cyan blob */}
      <motion.div
        className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(0,245,255,0.35), rgba(0,245,255,0) 70%)",
          filter: "blur(60px)",
        }}
        animate={{ x: [0, 60, -20, 0], y: [0, 30, -40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* drifting violet blob */}
      <motion.div
        className="absolute -bottom-32 -right-24 h-[560px] w-[560px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(138,43,226,0.42), rgba(138,43,226,0) 70%)",
          filter: "blur(70px)",
        }}
        animate={{ x: [0, -40, 30, 0], y: [0, -50, 20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* subtle emerald signal */}
      <motion.div
        className="absolute top-1/2 left-1/3 h-[320px] w-[320px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(0,255,163,0.12), rgba(0,255,163,0) 70%)",
          filter: "blur(70px)",
        }}
        animate={{ x: [0, -30, 40, 0], y: [0, 30, -30, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />
    </div>
  );
}
