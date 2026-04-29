"use client";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { NutritionComposition } from "@/types";

interface ManualFormProps {
  onSubmit: (composition: NutritionComposition) => void;
  loading: boolean;
}

export function ManualForm({ onSubmit, loading }: ManualFormProps) {
  const [form, setForm] = useState<NutritionComposition>({});

  function set(key: keyof NutritionComposition, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: key === "ingredients_text" ? value : value === "" ? undefined : Number(value),
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {(["carbs_g", "sugar_g", "fiber_g", "fat_g", "protein_g"] as const).map((field) => (
          <div key={field}>
            <label className="text-xs text-stone-500 mb-1 block capitalize">
              {field.replace("_g", "")} (g)
            </label>
            <Input type="number" min={0} placeholder="0" onChange={(e) => set(field, e.target.value)} />
          </div>
        ))}
      </div>
      <div>
        <label className="text-xs text-stone-500 mb-1 block">Ingredients (optional)</label>
        <textarea
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-24"
          placeholder="Paste ingredients list from the label…"
          onChange={(e) => set("ingredients_text", e.target.value)}
        />
      </div>
      <Button onClick={() => onSubmit(form)} disabled={loading} size="lg">
        {loading ? "Analyzing…" : "Analyze Composition"}
      </Button>
    </div>
  );
}
