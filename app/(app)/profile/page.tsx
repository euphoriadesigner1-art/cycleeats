"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { PrimaryConcern } from "@/types";

const concerns: { value: PrimaryConcern; label: string; description: string }[] = [
  { value: "general", label: "General PCOS", description: "Balanced analysis across all factors" },
  { value: "insulin_resistance", label: "Insulin Resistance", description: "Emphasises glycemic impact and blood sugar" },
  { value: "acne", label: "Acne / Androgens", description: "Focuses on androgen-triggering foods" },
  { value: "weight", label: "Weight Management", description: "Highlights caloric density and satiety" },
  { value: "fertility", label: "Fertility", description: "Flags endocrine disruptors prominently" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [concern, setConcern] = useState<PrimaryConcern>("general");
  const [age, setAge] = useState("");
  const [diagnosed, setDiagnosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (data) {
        setConcern(data.primary_concern as PrimaryConcern);
        setAge(data.age?.toString() ?? "");
        setDiagnosed(data.diagnosed ?? false);
      }
    }
    load();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleSave() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").upsert({
      user_id: user.id,
      primary_concern: concern,
      age: age ? Number(age) : null,
      diagnosed,
    });
    setLoading(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); router.push("/dashboard"); }, 1200);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-stone-800">Your PCOS Profile</h1>
        <p className="text-stone-500 text-sm mt-1">This helps Claude personalise your analysis</p>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-stone-700 mb-4">Primary concern</h2>
        <div className="flex flex-col gap-2">
          {concerns.map(({ value, label, description }) => (
            <button
              key={value}
              onClick={() => setConcern(value)}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
                concern === value ? "border-primary bg-primary-soft/50" : "border-stone-100 hover:border-stone-200"
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 ${concern === value ? "border-primary bg-primary" : "border-stone-300"}`} />
              <div>
                <p className="text-sm font-medium text-stone-800">{label}</p>
                <p className="text-xs text-stone-500">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-stone-700 mb-4">About you</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-stone-500 mb-1 block">Age (optional)</label>
            <Input type="number" placeholder="e.g. 28" value={age} onChange={(e) => setAge(e.target.value)} className="max-w-[120px]" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={diagnosed} onChange={(e) => setDiagnosed(e.target.checked)} className="w-4 h-4 rounded accent-primary" />
            <span className="text-sm text-stone-700">I have a formal PCOS diagnosis</span>
          </label>
        </div>
      </Card>

      <Button onClick={handleSave} disabled={loading} size="lg">
        {saved ? "Saved!" : loading ? "Saving…" : "Save Profile"}
      </Button>

      <button
        onClick={handleLogout}
        className="flex items-center justify-center gap-2 py-3 text-sm text-stone-400 hover:text-red-500 transition-colors"
      >
        <LogOut size={15} />
        Log out
      </button>
    </div>
  );
}
