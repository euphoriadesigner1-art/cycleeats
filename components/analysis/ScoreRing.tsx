"use client";
import { useEffect, useState } from "react";

interface ScoreRingProps {
  score: number;
  size?: number;
}

function scoreColor(score: number) {
  if (score >= 7) return "#16A34A";
  if (score >= 4) return "#D97706";
  return "#DC2626";
}

function scoreLabel(score: number) {
  if (score >= 7) return "PCOS Friendly";
  if (score >= 4) return "Moderate";
  return "High Risk";
}

export function ScoreRing({ score, size = 120 }: ScoreRingProps) {
  const [animated, setAnimated] = useState(0);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animated / 10) * circumference;

  useEffect(() => {
    const timeout = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(timeout);
  }, [score]);

  const color = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F5F0EB" strokeWidth={8} />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={8}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold leading-none" style={{ color }}>{score}</span>
          <span className="text-xs text-stone-400">/10</span>
        </div>
      </div>
      <span className="text-xs font-medium" style={{ color }}>{scoreLabel(score)}</span>
    </div>
  );
}
