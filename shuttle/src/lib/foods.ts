import type { Food } from "./types";

const f = (id: string, name: string, serving: string, calories: number, protein: number, carbs: number, fat: number): Food => ({
  id: `builtin-${id}`,
  name,
  serving,
  calories,
  protein,
  carbs,
  fat,
});

/** Common foods that work offline. Online search (Open Food Facts) covers everything else. */
export const BUILTIN_FOODS: Food[] = [
  f("egg", "Egg, large", "1 egg", 72, 6, 0.4, 5),
  f("egg-white", "Egg whites", "3 tbsp (46 g)", 25, 5, 0.3, 0),
  f("oats", "Oatmeal, rolled oats", "1/2 cup dry (40 g)", 150, 5, 27, 3),
  f("banana", "Banana", "1 medium", 105, 1.3, 27, 0.4),
  f("apple", "Apple", "1 medium", 95, 0.5, 25, 0.3),
  f("blueberries", "Blueberries", "1 cup", 85, 1.1, 21, 0.5),
  f("strawberries", "Strawberries", "1 cup", 50, 1, 12, 0.5),
  f("greek-yogurt", "Greek yogurt, nonfat plain", "170 g container", 100, 17, 6, 0.7),
  f("milk-2", "Milk, 2%", "1 cup", 122, 8, 12, 5),
  f("almond-milk", "Almond milk, unsweetened", "1 cup", 30, 1, 1, 2.5),
  f("whey", "Whey protein powder", "1 scoop (31 g)", 120, 24, 3, 1.5),
  f("bread-wheat", "Whole wheat bread", "1 slice", 80, 4, 14, 1),
  f("bagel", "Bagel, plain", "1 medium", 270, 11, 53, 1.5),
  f("pb", "Peanut butter", "2 tbsp", 190, 7, 7, 16),
  f("avocado", "Avocado", "1/2 fruit", 120, 1.5, 6, 11),
  f("chicken-breast", "Chicken breast, grilled", "4 oz (112 g)", 187, 35, 0, 4),
  f("ground-beef", "Ground beef 90/10, cooked", "4 oz", 240, 30, 0, 13),
  f("salmon", "Salmon, baked", "4 oz", 233, 25, 0, 14),
  f("tuna", "Tuna, canned in water", "1 can (142 g)", 120, 27, 0, 1),
  f("turkey-deli", "Turkey breast, deli", "2 oz", 60, 11, 2, 1),
  f("tofu", "Tofu, firm", "1/2 cup (126 g)", 180, 20, 4, 11),
  f("rice-white", "White rice, cooked", "1 cup", 205, 4, 45, 0.4),
  f("rice-brown", "Brown rice, cooked", "1 cup", 218, 5, 46, 1.6),
  f("pasta", "Pasta, cooked", "1 cup", 220, 8, 43, 1.3),
  f("potato", "Baked potato", "1 medium", 160, 4, 37, 0.2),
  f("sweet-potato", "Sweet potato, baked", "1 medium", 103, 2, 24, 0.2),
  f("broccoli", "Broccoli, steamed", "1 cup", 55, 4, 11, 0.6),
  f("spinach", "Spinach, raw", "2 cups", 14, 1.7, 2, 0.2),
  f("salad", "Mixed green salad, no dressing", "2 cups", 20, 1.5, 4, 0.2),
  f("ranch", "Ranch dressing", "2 tbsp", 130, 0.4, 2, 13),
  f("olive-oil", "Olive oil", "1 tbsp", 119, 0, 0, 13.5),
  f("butter", "Butter", "1 tbsp", 102, 0.1, 0, 11.5),
  f("cheddar", "Cheddar cheese", "1 oz", 115, 7, 0.4, 9.5),
  f("almonds", "Almonds", "1 oz (23 nuts)", 164, 6, 6, 14),
  f("protein-bar", "Protein bar", "1 bar (60 g)", 210, 20, 23, 7),
  f("granola-bar", "Granola bar", "1 bar", 120, 2, 20, 4),
  f("pizza", "Pizza, cheese", "1 slice (large)", 285, 12, 36, 10),
  f("burger", "Hamburger", "1 burger", 540, 34, 40, 27),
  f("fries", "French fries", "Medium order", 365, 4, 48, 17),
  f("burrito", "Chicken burrito", "1 burrito", 700, 40, 80, 22),
  f("coffee", "Coffee, black", "1 cup", 2, 0.3, 0, 0),
  f("latte", "Latte, 2% milk", "16 oz", 190, 13, 18, 7),
  f("soda", "Soda, cola", "12 oz can", 140, 0, 39, 0),
  f("beer", "Beer, regular", "12 oz", 153, 1.6, 13, 0),
  f("orange-juice", "Orange juice", "1 cup", 112, 1.7, 26, 0.5),
];

/** Search Open Food Facts (free, no API key). */
export async function searchOnline(query: string): Promise<Food[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&json=1&page_size=25&fields=code,product_name,brands,serving_size,nutriments`;
  const res = await fetch(url, { headers: { "User-Agent": "Shuttle/1.0 (iOS)" } });
  if (!res.ok) throw new Error("Food search is unavailable right now.");
  const body = (await res.json()) as { products?: OffProduct[] };
  return (body.products ?? []).map(fromOff).filter((x): x is Food => !!x);
}

export async function lookupBarcode(code: string): Promise<Food | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,brands,serving_size,nutriments`, {
    headers: { "User-Agent": "Shuttle/1.0 (iOS)" },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { status?: number; product?: OffProduct };
  return body.status === 1 && body.product ? fromOff({ ...body.product, code }) : null;
}

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number | undefined>;
}

function fromOff(p: OffProduct): Food | null {
  const n = p.nutriments ?? {};
  if (!p.product_name) return null;
  const perServing = n["energy-kcal_serving"] !== undefined;
  const key = perServing ? "_serving" : "_100g";
  const calories = n[`energy-kcal${key}`];
  if (calories === undefined) return null;
  const r = (x?: number) => Math.round((x ?? 0) * 10) / 10;
  return {
    id: `off-${p.code ?? p.product_name}`,
    name: p.product_name,
    brand: p.brands?.split(",")[0]?.trim(),
    serving: perServing ? p.serving_size ?? "1 serving" : "100 g",
    calories: Math.round(calories),
    protein: r(n[`proteins${key}`]),
    carbs: r(n[`carbohydrates${key}`]),
    fat: r(n[`fat${key}`]),
    barcode: p.code,
  };
}
