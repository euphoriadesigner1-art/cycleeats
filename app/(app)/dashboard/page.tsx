import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { TrendChart } from "@/components/dashboard/TrendChart";
import Link from "next/link";
import { ScanLine, TrendingUp, AlertCircle } from "lucide-react";
import type { MealLog } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [logsRes, profileRes, flaggedRes] = await Promise.all([
    supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("profiles")
      .select("primary_concern")
      .eq("user_id", user!.id)
      .single(),
    supabase
      .from("flagged_ingredients")
      .select("ingredient")
      .eq("user_id", user!.id),
  ]);

  const logs: MealLog[] = logsRes.data ?? [];
  const concern = profileRes.data?.primary_concern ?? "general";

  const weekLogs = logs.filter(
    (l) => new Date(l.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  const weekAvg = weekLogs.length
    ? (weekLogs.reduce((s, l) => s + l.pcos_score, 0) / weekLogs.length).toFixed(1)
    : null;

  const trendMap: Record<string, number[]> = {};
  logs.forEach((l) => {
    const date = new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!trendMap[date]) trendMap[date] = [];
    trendMap[date].push(l.pcos_score);
  });
  const trendData = Object.entries(trendMap)
    .slice(-7)
    .map(([date, scores]) => ({
      date,
      avg_score: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));

  const ingredientCount: Record<string, number> = {};
  (flaggedRes.data ?? []).forEach(({ ingredient }) => {
    ingredientCount[ingredient] = (ingredientCount[ingredient] ?? 0) + 1;
  });
  const topFlagged = Object.entries(ingredientCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-stone-800">Dashboard</h1>
          {concern !== "general" && (
            <span className="text-xs bg-primary-soft text-primary px-2.5 py-1 rounded-full font-medium">
              Focus: {concern.replace("_", " ")}
            </span>
          )}
        </div>
        <Link
          href="/analyze"
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <ScanLine size={16} />
          Analyze
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs text-stone-500 mb-1">Weekly Avg Score</p>
          <p className="text-3xl font-bold text-primary">{weekAvg ?? "—"}</p>
          <p className="text-xs text-stone-400">{weekLogs.length} meals this week</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-stone-500 mb-1">Total Logs</p>
          <p className="text-3xl font-bold text-stone-700">{logs.length}</p>
          <p className="text-xs text-stone-400">all time</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-stone-700">PCOS Score Trend</h2>
        </div>
        <TrendChart data={trendData} />
      </Card>

      {topFlagged.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-red-400" />
            <h2 className="text-sm font-semibold text-stone-700">Most Flagged Ingredients</h2>
          </div>
          <ul className="flex flex-col gap-2">
            {topFlagged.map(([ingredient, count]) => (
              <li key={ingredient} className="flex items-center justify-between text-sm">
                <span className="text-stone-700">{ingredient}</span>
                <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{count}×</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {logs.slice(0, 3).length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-stone-700 mb-3">Recent Analyses</h2>
          <ul className="flex flex-col gap-3">
            {logs.slice(0, 3).map((log) => (
              <li key={log.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-700 truncate max-w-[200px]">
                    {log.product_name ?? log.meal_description ?? "Manual entry"}
                  </p>
                  <p className="text-xs text-stone-400">{new Date(log.created_at).toLocaleDateString()}</p>
                </div>
                <span
                  className="text-sm font-bold"
                  style={{ color: log.pcos_score >= 7 ? "#16A34A" : log.pcos_score >= 4 ? "#D97706" : "#DC2626" }}
                >
                  {log.pcos_score}/10
                </span>
              </li>
            ))}
          </ul>
          <Link href="/history" className="text-xs text-primary hover:underline mt-3 block">View all →</Link>
        </Card>
      )}
    </div>
  );
}
