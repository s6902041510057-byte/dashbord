"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

interface WheelProps {
  names: string[];
  highlightNames?: string[];
  spinning: boolean;
  onDone?: () => void;
}

/** Cosmic random wheel: conic-gradient segments + rotation animation. */
export default function CosmicRandomWheel({ names, highlightNames = [], spinning, onDone }: WheelProps) {
  const [rotation, setRotation] = useState(0);

  const segments = useMemo(() => {
    if (names.length === 0) return "rgba(139,92,246,0.2)";
    const step = 360 / names.length;
    const colors = names.map((n, i) => {
      const base = highlightNames.includes(n) ? "#00F5D4" : i % 2 === 0 ? "#8B5CF6" : "#161F38";
      return `${base} ${i * step}deg ${(i + 1) * step}deg`;
    });
    return `conic-gradient(${colors.join(",")})`;
  }, [names, highlightNames]);

  useEffect(() => {
    if (!spinning) return;
    // Spin 5-7 full turns with ease-out over 3.5s
    const turns = 5 + Math.random() * 2;
    setRotation((r) => r + turns * 360);
    const t = setTimeout(() => onDone?.(), 3600);
    return () => clearTimeout(t);
  }, [spinning, onDone]);

  return (
    <div className="relative w-72 h-72 md:w-96 md:h-96 mx-auto">
      {/* Pointer */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-cosmic-gold drop-shadow-[0_0_10px_rgba(255,209,102,0.8)]" />
      <motion.div
        className="w-full h-full rounded-full border-4 border-cosmic-violet/40 shadow-starlight-violet relative overflow-hidden"
        style={{ background: segments }}
        animate={{ rotate: rotation }}
        transition={spinning ? { duration: 3.5, ease: [0.15, 0.9, 0.25, 1] } : { duration: 0.3 }}
      >
        {names.slice(0, 20).map((n, i) => {
          const angle = (360 / Math.max(names.length, 1)) * i;
          return (
            <div
              key={`${n}-${i}`}
              className="absolute top-1/2 left-1/2 text-[10px] md:text-xs font-medium text-white/90 whitespace-nowrap"
              style={{
                transform: `rotate(${angle}deg) translate(90px, -50%) rotate(90deg)`,
                transformOrigin: "0 0",
              }}
            >
              {n}
            </div>
          );
        })}
        {/* Hub */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-cosmic-void border-2 border-cosmic-cyan/60 flex items-center justify-center text-2xl shadow-nebula-cyan">
          🛸
        </div>
      </motion.div>
    </div>
  );
}
