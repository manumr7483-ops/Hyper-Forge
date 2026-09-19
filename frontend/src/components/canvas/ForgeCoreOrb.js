import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Icosahedron, Points, PointMaterial } from "@react-three/drei";
import { EffectComposer, Bloom, ChromaticAberration } from "@react-three/postprocessing";
import * as THREE from "three";

const STATE_PARAMS = {
  idle:      { rot: 0.15, cyanBoost: 0.8, violetBoost: 0.6, plasma: 0.0, converge: 0.0, chroma: 0.0006, wire: 0.15 },
  analyzing: { rot: 0.55, cyanBoost: 1.1, violetBoost: 0.8, plasma: 0.0, converge: 0.55, chroma: 0.0009, wire: 0.35 },
  forging:   { rot: 0.75, cyanBoost: 0.9, violetBoost: 1.6, plasma: 1.0, converge: 0.25, chroma: 0.0018, wire: 0.6 },
  complete:  { rot: 0.20, cyanBoost: 1.2, violetBoost: 1.2, plasma: 0.3, converge: 0.0, chroma: 0.0025, wire: 0.05 },
};

function hasWebGL2() {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch {
    return false;
  }
}

function OrbCore({ state = "idle" }) {
  const meshRef = useRef();
  const wireRef = useRef();
  const p = STATE_PARAMS[state] || STATE_PARAMS.idle;

  useFrame((_, dt) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += dt * p.rot;
      meshRef.current.rotation.x += dt * p.rot * 0.4;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y -= dt * p.rot * 0.6;
    }
  });

  const scale = state === "complete" ? 1.08 : 1;

  return (
    <group>
      {/* Core sphere */}
      <mesh ref={meshRef} scale={scale}>
        <icosahedronGeometry args={[1.55, 3]} />
        <meshPhysicalMaterial
          color={new THREE.Color(0x0d1b2a)}
          transmission={0.85}
          thickness={1.2}
          roughness={0.15}
          metalness={0.15}
          iridescence={1}
          iridescenceIOR={1.35}
          iridescenceThicknessRange={[100, 900]}
          clearcoat={1}
          clearcoatRoughness={0.15}
          envMapIntensity={1.2}
          emissive={new THREE.Color(0x1a3a5a)}
          emissiveIntensity={0.35 + p.violetBoost * 0.3}
        />
      </mesh>
      {/* Wireframe halo */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[state === "complete" ? 1.75 : 1.85, 1]} />
        <meshBasicMaterial color={new THREE.Color(0x00F5FF)} wireframe transparent opacity={p.wire} />
      </mesh>
      {/* Plasma streams (forging) */}
      {p.plasma > 0 && <PlasmaStreams intensity={p.plasma} />}
    </group>
  );
}

function PlasmaStreams({ intensity }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * 0.7;
  });
  const lines = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 18; i += 1) {
      const angle = (i / 18) * Math.PI * 2;
      arr.push({ angle });
    }
    return arr;
  }, []);
  return (
    <group ref={ref}>
      {lines.map((l, i) => (
        <mesh key={i} rotation={[0, 0, l.angle]}>
          <planeGeometry args={[3.8, 0.03 + intensity * 0.02]} />
          <meshBasicMaterial
            color={i % 2 ? new THREE.Color(0x8A2BE2) : new THREE.Color(0x00F5FF)}
            transparent
            opacity={0.25 * intensity}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function ParticleField({ state = "idle" }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i += 1) {
      const r = 2.6 + Math.random() * 1.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);
  const converge = STATE_PARAMS[state]?.converge ?? 0;

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.12;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) {
      const dx = arr[i], dy = arr[i + 1], dz = arr[i + 2];
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      // Slight breathing + converge pull
      const target = 3.2 - converge * 1.2;
      const pull = (target - len) * 0.0015;
      arr[i] += dx * pull;
      arr[i + 1] += dy * pull;
      arr[i + 2] += dz * pull;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={new THREE.Color(0x00F5FF)}
        size={0.02}
        transparent
        opacity={0.85}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

export default function ForgeCoreOrb({ state = "idle", size = 320, className = "" }) {
  const webglOk = useMemo(() => (typeof window !== "undefined" ? hasWebGL2() : false), []);
  if (!webglOk) {
    if (typeof window !== "undefined") console.info("[HF] WebGL2 unavailable — using CSS fallback orb");
    return (
      <div className={"relative " + className} style={{ width: size, height: size }} data-testid="forge-core-fallback">
        <div className="absolute inset-0 rounded-full" style={{
          background: "radial-gradient(closest-side, rgba(0,245,255,0.42), rgba(138,43,226,0.28) 55%, rgba(0,0,0,0) 80%)",
          filter: "blur(24px)",
        }} />
      </div>
    );
  }

  const chroma = STATE_PARAMS[state]?.chroma ?? 0.0006;

  return (
    <div className={"relative " + className} style={{ width: size, height: size }} data-testid={`forge-core-orb-${state}`}>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={[0x000000, 0]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[3, 2, 3]} intensity={2.0} color="#00F5FF" />
        <pointLight position={[-3, -2, -2]} intensity={1.6} color="#8A2BE2" />
        <Suspense fallback={null}>
          <OrbCore state={state} />
          <ParticleField state={state} />
        </Suspense>
        <EffectComposer>
          <Bloom intensity={0.9} luminanceThreshold={0.15} luminanceSmoothing={0.4} mipmapBlur />
          <ChromaticAberration offset={[chroma, chroma]} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
