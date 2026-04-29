import { Card } from "@/components/ui/Card";
import { CheckCircle, XCircle, BookOpen } from "lucide-react";

const friendlyFoods = [
  { name: "Leafy greens (spinach, kale)", reason: "Low GI, anti-inflammatory, high magnesium" },
  { name: "Berries", reason: "Low sugar, high antioxidants, reduce inflammation" },
  { name: "Fatty fish (salmon, sardines)", reason: "Omega-3s reduce androgens and inflammation" },
  { name: "Nuts & seeds (walnuts, flaxseed)", reason: "Healthy fats, fiber, lignans regulate hormones" },
  { name: "Legumes (lentils, chickpeas)", reason: "Slow carb release, high fiber, stabilise insulin" },
  { name: "Whole grains (oats, quinoa)", reason: "Low GI, B vitamins, sustained energy" },
  { name: "Cinnamon", reason: "Improves insulin sensitivity" },
  { name: "Apple cider vinegar", reason: "May improve insulin response when taken with meals" },
];

const foodsToAvoid = [
  { name: "White bread, white rice, white pasta", reason: "High GI — spikes blood sugar rapidly" },
  { name: "Sugary drinks (sodas, juices)", reason: "Liquid sugar bypasses satiety signals" },
  { name: "Processed snacks", reason: "Seed oils + refined sugar = double inflammation hit" },
  { name: "Excess dairy", reason: "May elevate androgens (IGF-1) in some women" },
  { name: "Alcohol", reason: "Stresses liver, disrupts hormone metabolism" },
  { name: "Artificial sweeteners (in excess)", reason: "May alter gut microbiome affecting insulin" },
];

export default function EducationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-stone-800">PCOS Food Guide</h1>
        <p className="text-stone-500 text-sm mt-1">Evidence-based guidance for eating with PCOS</p>
      </div>

      <Card className="bg-primary-soft/40 border-primary/20">
        <div className="flex items-start gap-3">
          <BookOpen size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-stone-800 mb-2">Why Glycemic Index Matters for PCOS</h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              PCOS is strongly linked to insulin resistance — up to 70% of women with PCOS have it.
              When you eat high-GI foods, blood sugar spikes sharply, forcing your pancreas to release
              large amounts of insulin. High insulin stimulates the ovaries to produce more androgens
              (testosterone), worsening PCOS symptoms like acne, hair loss, and irregular periods.
            </p>
            <p className="text-sm text-stone-600 leading-relaxed mt-2">
              Eating low-GI foods keeps insulin stable, which reduces androgen production and helps regulate your cycle.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <CheckCircle size={16} className="text-green-500" />
          PCOS-Friendly Foods
        </h2>
        <ul className="flex flex-col gap-3">
          {friendlyFoods.map(({ name, reason }) => (
            <li key={name} className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-stone-700">{name}</p>
                <p className="text-xs text-stone-500">{reason}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <XCircle size={16} className="text-red-400" />
          Foods to Limit
        </h2>
        <ul className="flex flex-col gap-3">
          {foodsToAvoid.map(({ name, reason }) => (
            <li key={name} className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-stone-700">{name}</p>
                <p className="text-xs text-stone-500">{reason}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-stone-700 mb-4">Quick Substitution Cheat Sheet</h2>
        <div className="flex flex-col gap-2">
          {[
            ["White rice", "Cauliflower rice or brown rice"],
            ["White bread", "Sourdough or Ezekiel bread"],
            ["Cow's milk", "Unsweetened oat milk or almond milk"],
            ["Sugary yogurt", "Plain Greek yogurt + berries"],
            ["Soda / juice", "Sparkling water + hibiscus or lemon"],
            ["Vegetable oil", "Extra virgin olive oil or avocado oil"],
            ["White pasta", "Chickpea pasta or courgette noodles"],
          ].map(([from, to]) => (
            <div key={from} className="flex items-center gap-3 text-sm">
              <span className="text-red-500 line-through text-xs w-32 shrink-0">{from}</span>
              <span className="text-stone-400">→</span>
              <span className="text-green-700">{to}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
