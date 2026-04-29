import { cn } from "@/lib/utils";

interface BadgeProps {
  label: string;
  level: "Low" | "Moderate" | "High" | "Poor" | "Fair" | "Good" | "Excellent";
  className?: string;
}

const levelColors: Record<string, string> = {
  Low: "bg-green-100 text-green-700",
  Good: "bg-green-100 text-green-700",
  Excellent: "bg-green-100 text-green-700",
  Moderate: "bg-amber-100 text-amber-700",
  Fair: "bg-amber-100 text-amber-700",
  High: "bg-red-100 text-red-700",
  Poor: "bg-red-100 text-red-700",
};

export function Badge({ label, level, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
        levelColors[level],
        className
      )}
    >
      {label}: <strong>{level}</strong>
    </span>
  );
}
