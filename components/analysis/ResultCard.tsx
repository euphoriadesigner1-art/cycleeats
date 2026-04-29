"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "./ScoreRing";
import type { AnalysisResult } from "@/types";

interface ResultCardProps {
  result: AnalysisResult;
  mealLabel?: string;
}

export function ResultCard({ result, mealLabel }: ResultCardProps) {
  const [flaggedOpen, setFlaggedOpen] = useState(true);
  const [safeOpen, setSafeOpen] = useState(false);

  return (
    <Card className="flex flex-col gap-6">
      {mealLabel && <p className="text-sm text-stone-500 font-medium truncate">{mealLabel}</p>}

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <ScoreRing score={result.pcos_score} size={120} />
        <div className="flex flex-wrap gap-2">
          <Badge label="Insulin" level={result.insulin_impact} />
          <Badge label="Androgen" level={result.androgen_risk} />
          <Badge label="Inflammation" level={result.inflammation_level} />
          <Badge label="Fiber" level={result.fiber_rating} />
        </div>
      </div>

      <p className="text-stone-600 text-sm leading-relaxed bg-primary-soft/50 rounded-xl p-4">
        {result.summary}
      </p>

      {result.flagged_ingredients.length > 0 && (
        <div>
          <button
            onClick={() => setFlaggedOpen((o) => !o)}
            className="flex items-center justify-between w-full text-sm font-medium text-stone-700 mb-2"
          >
            <span className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500" />
              Flagged ingredients ({result.flagged_ingredients.length})
            </span>
            {flaggedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {flaggedOpen && (
            <ul className="flex flex-col gap-2">
              {result.flagged_ingredients.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm bg-red-50 rounded-lg p-3">
                  <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-stone-700">{item.name}</span>
                    <span className="text-stone-500"> — {item.reason}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result.safe_ingredients.length > 0 && (
        <div>
          <button
            onClick={() => setSafeOpen((o) => !o)}
            className="flex items-center justify-between w-full text-sm font-medium text-stone-700 mb-2"
          >
            <span className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              Safe ingredients ({result.safe_ingredients.length})
            </span>
            {safeOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {safeOpen && (
            <div className="flex flex-wrap gap-2">
              {result.safe_ingredients.map((item, i) => (
                <span key={i} className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full">{item}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {result.substitutions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-stone-700 mb-2 flex items-center gap-2">
            <ArrowRight size={16} className="text-primary" />
            Suggested substitutions
          </h4>
          <ul className="flex flex-col gap-1.5">
            {result.substitutions.map((sub, i) => (
              <li key={i} className="text-sm text-stone-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {sub}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
