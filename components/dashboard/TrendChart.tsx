"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface TrendChartProps {
  data: Array<{ date: string; avg_score: number }>;
}

export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-stone-400">
        No data yet — analyze some meals to see your trend
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#78716C" }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#78716C" }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, fontSize: 12 }}
          formatter={(v) => {
            const num = typeof v === "number" ? v : Number(v);
            return [isNaN(num) ? String(v ?? "") : num.toFixed(1), "PCOS Score"];
          }}
        />
        <ReferenceLine y={7} stroke="#16A34A" strokeDasharray="4 4" strokeOpacity={0.5} />
        <ReferenceLine y={4} stroke="#D97706" strokeDasharray="4 4" strokeOpacity={0.5} />
        <Line
          type="monotone"
          dataKey="avg_score"
          stroke="#7C3AED"
          strokeWidth={2}
          dot={{ r: 4, fill: "#7C3AED" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
