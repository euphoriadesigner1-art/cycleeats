import type { OpenFoodFactsProduct } from "@/types";

export async function fetchByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) return null;

  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  return {
    product_name: p.product_name ?? "Unknown Product",
    brands: p.brands ?? undefined,
    ingredients_text: p.ingredients_text ?? undefined,
    nutriments: {
      carbohydrates_100g: p.nutriments?.carbohydrates_100g,
      sugars_100g: p.nutriments?.sugars_100g,
      fiber_100g: p.nutriments?.fiber_100g,
      fat_100g: p.nutriments?.fat_100g,
      proteins_100g: p.nutriments?.proteins_100g,
    },
    additives_tags: p.additives_tags ?? [],
  };
}
