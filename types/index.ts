export interface AnalysisResult {
  pcos_score: number;
  insulin_impact: "Low" | "Moderate" | "High";
  androgen_risk: "Low" | "Moderate" | "High";
  inflammation_level: "Low" | "Moderate" | "High";
  fiber_rating: "Poor" | "Fair" | "Good" | "Excellent";
  flagged_ingredients: Array<{
    name: string;
    reason: string;
    risk_type: string;
  }>;
  safe_ingredients: string[];
  substitutions: string[];
  summary: string;
}

export interface NutritionComposition {
  carbs_g?: number;
  sugar_g?: number;
  fiber_g?: number;
  fat_g?: number;
  protein_g?: number;
  ingredients_text?: string;
}

export interface OpenFoodFactsProduct {
  product_name: string;
  brands?: string;
  ingredients_text?: string;
  nutriments?: {
    carbohydrates_100g?: number;
    sugars_100g?: number;
    fiber_100g?: number;
    fat_100g?: number;
    proteins_100g?: number;
  };
  additives_tags?: string[];
}

export interface AnalyzeRequest {
  input_method: "text" | "barcode" | "manual" | "photo";
  meal_description?: string;
  product_data?: OpenFoodFactsProduct;
  composition?: NutritionComposition;
  image_data?: string;       // base64-encoded image (no data: prefix)
  image_media_type?: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  user_concern: string;
}

export type PrimaryConcern =
  | "general"
  | "insulin_resistance"
  | "acne"
  | "weight"
  | "fertility";

export interface PCOSProfile {
  id: string;
  user_id: string;
  primary_concern: PrimaryConcern;
  secondary_concerns: string[];
  diagnosed: boolean;
  age: number | null;
  created_at: string;
}

export interface MealLog {
  id: string;
  user_id: string;
  input_method: "text" | "barcode" | "manual" | "photo";
  meal_description: string | null;
  product_name: string | null;
  raw_composition: NutritionComposition | null;
  analysis_result: AnalysisResult;
  pcos_score: number;
  created_at: string;
}
