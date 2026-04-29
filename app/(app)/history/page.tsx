"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { ResultCard } from "@/components/analysis/ResultCard";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { MealLog } from "@/types";

export default function HistoryPage() {
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("meal_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setLogs(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-sm text-stone-400 py-12 text-center">Loading…</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-heading text-2xl font-semibold text-stone-800">Meal History</h1>
        <Card className="text-center py-12 text-stone-400 text-sm">
          No analyses yet. Go to{" "}
          <a href="/analyze" className="text-primary hover:underline">Analyze</a> to get started.
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold text-stone-800">Meal History</h1>
      <ul className="flex flex-col gap-3">
        {logs.map((log) => (
          <li key={log.id}>
            <Card className="p-4 cursor-pointer" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">
                    {log.product_name ?? log.meal_description ?? "Manual entry"}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {new Date(log.created_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    {" · "}
                    <span className="capitalize">{log.input_method}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-lg font-bold"
                    style={{ color: log.pcos_score >= 7 ? "#16A34A" : log.pcos_score >= 4 ? "#D97706" : "#DC2626" }}
                  >
                    {log.pcos_score}/10
                  </span>
                  {expanded === log.id ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
                </div>
              </div>
            </Card>
            {expanded === log.id && (
              <div className="mt-2">
                <ResultCard result={log.analysis_result} mealLabel={log.product_name ?? log.meal_description ?? undefined} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
