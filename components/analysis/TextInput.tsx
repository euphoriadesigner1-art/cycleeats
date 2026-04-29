"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface TextInputProps {
  onSubmit: (description: string) => void;
  loading: boolean;
}

export function TextInput({ onSubmit, loading }: TextInputProps) {
  const [value, setValue] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <textarea
        className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-32"
        placeholder="Describe your meal… e.g. 'jollof rice with fried chicken and a Coke'"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button onClick={() => value.trim() && onSubmit(value.trim())} disabled={loading || !value.trim()} size="lg">
        {loading ? "Analyzing…" : "Analyze Meal"}
      </Button>
    </div>
  );
}
