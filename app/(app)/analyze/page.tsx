"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TextInput } from "@/components/analysis/TextInput";
import { ManualForm } from "@/components/analysis/ManualForm";
import { BarcodeScanner } from "@/components/analysis/BarcodeScanner";
import { ResultCard } from "@/components/analysis/ResultCard";
import { cn } from "@/lib/utils";
import type { AnalysisResult, NutritionComposition, OpenFoodFactsProduct } from "@/types";

type Tab = "text" | "barcode" | "manual";

export default function AnalyzePage() {
  const [tab, setTab] = useState<Tab>("text");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [mealLabel, setMealLabel] = useState("");
  const [error, setError] = useState("");

  async function getUserConcern(): Promise<string> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "general";
    const { data } = await supabase
      .from("profiles")
      .select("primary_concern")
      .eq("user_id", user.id)
      .single();
    return data?.primary_concern ?? "general";
  }

  async function runAnalysis(body: object, label: string) {
    setLoading(true);
    setError("");
    setResult(null);
    setMealLabel(label);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data: AnalysisResult = await res.json();
      setResult(data);
      await saveToDB(data, body, label);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function saveToDB(data: AnalysisResult, body: object, label: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const b = body as Record<string, unknown>;
    const { data: log } = await supabase.from("meal_logs").insert({
      user_id: user.id,
      input_method: b.input_method,
      meal_description: b.meal_description ?? label,
      product_name: (b.product_data as OpenFoodFactsProduct)?.product_name ?? null,
      raw_composition: b.composition ?? null,
      analysis_result: data,
      pcos_score: data.pcos_score,
    }).select().single();
    if (log && data.flagged_ingredients.length > 0) {
      await supabase.from("flagged_ingredients").insert(
        data.flagged_ingredients.map((fi) => ({
          meal_log_id: log.id,
          user_id: user.id,
          ingredient: fi.name,
          risk_type: fi.risk_type,
          severity: fi.risk_type === "High" ? "high" : "moderate",
        }))
      );
    }
  }

  async function handleText(description: string) {
    const concern = await getUserConcern();
    await runAnalysis({ input_method: "text", meal_description: description, user_concern: concern }, description);
  }

  async function handleBarcode(code: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/barcode?code=${code}`);
      if (!res.ok) {
        setError("Product not found. Try entering nutrition manually.");
        setLoading(false);
        return;
      }
      const product: OpenFoodFactsProduct = await res.json();
      const concern = await getUserConcern();
      await runAnalysis({ input_method: "barcode", product_data: product, user_concern: concern }, product.product_name);
    } catch {
      setError("Barcode lookup failed.");
      setLoading(false);
    }
  }

  async function handleManual(composition: NutritionComposition) {
    const concern = await getUserConcern();
    await runAnalysis({ input_method: "manual", composition, user_concern: concern }, "Manual entry");
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "text", label: "Describe Meal" },
    { id: "barcode", label: "Scan Barcode" },
    { id: "manual", label: "Manual Entry" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-stone-800">Analyze a Meal</h1>
        <p className="text-stone-500 text-sm mt-1">Choose how you&apos;d like to enter your food</p>
      </div>
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setResult(null); setError(""); }}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
              tab === id ? "bg-white text-primary shadow-sm" : "text-stone-500 hover:text-stone-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        {tab === "text" && <TextInput onSubmit={handleText} loading={loading} />}
        {tab === "barcode" && <BarcodeScanner onDetected={handleBarcode} loading={loading} />}
        {tab === "manual" && <ManualForm onSubmit={handleManual} loading={loading} />}
      </div>
      {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
      {result && <ResultCard result={result} mealLabel={mealLabel} />}
    </div>
  );
}
