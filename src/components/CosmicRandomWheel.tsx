"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

interface WheelProps {
  names: string[];
  highlightNames?: string[];
  spinning: boolean;
  onDone?: () => void;
}

const PALETTE = [
  "#8B5CF6", // violet
  "#0891B2", // deep cyan (อ่านชื่อขาวชัด)
  "#DB2777", // pink
  "#B45309", // deep gold (อ่านชื่อขาวชัด)
  "#4F46E5", // indigo
  "#0D9488", // teal
  "#7C3AED", // purple
  "#2563EB", // blue
];

const CX = 200;
const CY = 200;
const R = 188;

function polar(angleDeg: number, radius: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}

function slicePath(i: number, n: number): string {
  const step = 360 / n;
  const a0 = i * step;
  const a1 = (i + 1) * step;
  const [x0, y0] = polar(a0, R);
  const [x1, y1] = polar(a1, R);
  const large = step > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
}

/** Cosmic random wheel: SVG pie slices, distinct colors, readable names. */
export default function CosmicRandomWheel({ names, highlightNames = [], spinning, onDone }: WheelProps) {
  const [rotation, setRotation] = useState(0);

  const step = names.length > 0 ? 360 / names.length : 360;
  const fontSize = names.length <= 8 ? 15 : names.length <= 14 ? 12 : 10;

  const shortName = (n: string) => {
    const max = names.length <= 8 ? 12 : names.length <= 14 ? 10 : 8;
    return n.length > max ? n.slice(0, max - 1) + "…" : n;
  };

  const bulbs = useMemo(() => Array.from({ length: 24 }, (_, i) => polar(i * 15, R + 12)), []);

  useEffect(() => {
    if (!spinning) return;
    const turns = 5 + Math.random() * 2;
    setRotation((r) => r + turns * 360);
    const t = setTimeout(() => onDone?.(), 3600);
    return () => clearTimeout(t);
  }, [spinning, onDone]);

  if (names.length === 0) {
    return (
      <div className="w-72 h-72 md:w-96 md:h-96 mx-auto rounded-full glass-panel border-2 border-cosmic-violet/40 flex items-center justify-center text-slate-500 text-sm">
        รอรายชื่อ...
      </div>
    );
  }

  return (
    <div className="relative w-72 h-72 md:w-96 md:h-96 mx-auto">
      {/* Pointer */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-cosmic-gold drop-shadow-[0_0_10px_rgba(255,209,102,0.9)]" />
      <motion.div
        className="w-full h-full"
        animate={{ rotate: rotation }}
        transition={spinning ? { duration: 3.5, ease: [0.15, 0.9, 0.25, 1] } : { duration: 0.3 }}
      >
        <svg viewBox="-14 -14 428 428" className="w-full h-full drop-shadow-[0_0_25px_rgba(139,92,246,0.35)]">
          {/* Rim bulbs */}
          {bulbs.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={4} fill={i % 2 === 0 ? "#FFD166" : "#00F5D4"} opacity={0.9} />
          ))}
          {/* Outer rim */}
          <circle cx={CX} cy={CY} r={R + 6} fill="none" stroke="#8B5CF6" strokeWidth={5} opacity={0.8} />
          {/* Slices */}
          {names.map((n, i) => {
            const highlighted = highlightNames.includes(n);
            return (
              <g key={`${n}-${i}`}>
                <path
                  d={slicePath(i, names.length)}
                  fill={PALETTE[i % PALETTE.length]}
                  stroke={highlighted ? "#FFD166" : "rgba(255,255,255,0.65)"}
                  strokeWidth={highlighted ? 4 : 1.5}
                />
              </g>
            );
          })}
          {/* Names */}
          {names.map((n, i) => {
            const mid = i * step + step / 2;
            const [tx, ty] = polar(mid, R * 0.62);
            // ข้อความวางตามแนวรัศมี (อ่านจากในออกนอก) ฝั่งซ้ายกลับหัวให้อ่านง่าย
            const flip = mid > 90 && mid < 270;
            const textAngle = flip ? mid + 90 : mid - 90;
            return (
              <text
                key={`t-${n}-${i}`}
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fontWeight={700}
                fill="#FFFFFF"
                stroke="rgba(0,0,0,0.55)"
                strokeWidth={0.6}
                transform={`rotate(${textAngle} ${tx} ${ty})`}
              >
                {shortName(n)}
              </text>
            );
          })}
          {/* Hub */}
          <circle cx={CX} cy={CY} r={30} fill="#05070F" stroke="#00F5D4" strokeWidth={3} />
          <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize={26}>
            🛸
          </text>
        </svg>
      </motion.div>
    </div>
  );
}
