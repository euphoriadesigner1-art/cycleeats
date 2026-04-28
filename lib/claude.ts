import Anthropic from "@anthropic-ai/sdk";
import type { AnalyzeRequest, AnalysisResult } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a PCOS nutrition specialist AI. Analyze the food input provided and return a JSON object only — no extra text, no markdown, no explanation.

Evaluate based on:
1. Insulin Impact — glycemic index, refined carbs, sugar content
2. Androgen Risk — excess dairy, processed sugars, soy
3. Inflammation Level — seed oils, trans fats, additives, preservatives
4. Fiber Rating — soluble/insoluble fiber that buffers insulin spikes
5. PCOS Score (1–10) where 10 = maximally PCOS-friendly
6. Flagged ingredients with one-line reasons
7. Safe ingredients
8. Specific substitution suggestions
9. A plain-English summary (2–3 sentences, no jargon)

Return exactly this JSON shape:
{
  "pcos_score": number,
  "insulin_impact": "Low" | "Moderate" | "High",
  "androgen_risk": "Low" | "Moderate" | "High",
  "inflammation_level": "Low" | "Moderate" | "High",
  "fiber_rating": "Poor" | "Fair" | "Good" | "Excellent",
  "flagged_ingredients": [{ "name": string, "reason": string, "risk_type": string }],
  "safe_ingredients": string[],
  "substitutions": string[],
  "summary": string
}`;

export function buildUserMessage(req: AnalyzeRequest): string {
  const concernNote = `User's primary PCOS concern: ${req.user_concern}. Adjust severity weighting accordingly (insulin_resistance → weight insulin_impact heavily; acne → weight androgen_risk; fertility → flag endocrine disruptors; weight → flag caloric density).`;

  if (req.input_method === "text") {
    return `${concernNote}\n\nMeal description: ${req.meal_description}`;
  }

  if (req.input_method === "barcode" && req.product_data) {
    const p = req.product_data;
    const n = p.nutriments ?? {};
    return `${concernNote}\n\nProduct: ${p.product_name}${p.brands ? ` (${p.brands})` : ""}
Ingredients: ${p.ingredients_text ?? "not available"}
Per 100g: carbs ${n.carbohydrates_100g ?? "?"}g, sugar ${n.sugars_100g ?? "?"}g, fiber ${n.fiber_100g ?? "?"}g, fat ${n.fat_100g ?? "?"}g, protein ${n.proteins_100g ?? "?"}g
Additives: ${p.additives_tags?.join(", ") ?? "none listed"}`;
  }

  if (req.input_method === "manual" && req.composition) {
    const c = req.composition;
    return `${concernNote}\n\nManual nutrition entry:
Carbs: ${c.carbs_g ?? "?"}g, Sugar: ${c.sugar_g ?? "?"}g, Fiber: ${c.fiber_g ?? "?"}g, Fat: ${c.fat_g ?? "?"}g, Protein: ${c.protein_g ?? "?"}g
Ingredients: ${c.ingredients_text ?? "not provided"}`;
  }

  throw new Error("Invalid analyze request");
}

export function parseAnalysisResponse(text: string): AnalysisResult {
  // Strip any accidental markdown code fences
  const cleaned = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(cleaned) as AnalysisResult;
}

export async function analyzeWithClaude(req: AnalyzeRequest): Promise<AnalysisResult> {
  const userMessage = buildUserMessage(req);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    return parseAnalysisResponse(text);
  } catch {
    // Retry once
    const retry = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userMessage },
        { role: "assistant", content: text },
        { role: "user", content: "Your response was not valid JSON. Please return only the JSON object with no extra text." },
      ],
    });
    const retryText = retry.content[0].type === "text" ? retry.content[0].text : "";
    return parseAnalysisResponse(retryText);
  }
}
