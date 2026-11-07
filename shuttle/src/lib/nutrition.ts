import type { Activity, DayLog, GoalType, Profile, Sex } from "./types";

const ACTIVITY_FACTOR: Record<Activity, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 };

/** Daily calorie & macro goals using the Mifflin-St Jeor equation. */
export function computeGoals(p: { sex: Sex; age: number; heightIn: number; weightLb: number; activity: Activity; goal: GoalType; rate: number }) {
  const kg = p.weightLb * 0.4536;
  const cm = p.heightIn * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * p.age + (p.sex === "male" ? 5 : -161);
  const tdee = bmr * ACTIVITY_FACTOR[p.activity];
  const delta = p.goal === "maintain" ? 0 : (p.rate * 3500) / 7; // 3500 kcal ≈ 1 lb
  const floor = p.sex === "male" ? 1500 : 1200;
  const calories = Math.round(Math.max(floor, p.goal === "lose" ? tdee - delta : tdee + delta) / 10) * 10;
  const protein = Math.round(p.weightLb * (p.goal === "gain" ? 0.9 : 0.8));
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calorieGoal: calories, proteinGoal: protein, carbsGoal: carbs, fatGoal: fat, tdee: Math.round(tdee) };
}

export const emptyDay = (): DayLog => ({ food: [], exercise: [], water: 0 });

export function dayTotals(day: DayLog) {
  let calories = 0, protein = 0, carbs = 0, fat = 0;
  for (const e of day.food) {
    calories += e.food.calories * e.servings;
    protein += e.food.protein * e.servings;
    carbs += e.food.carbs * e.servings;
    fat += e.food.fat * e.servings;
  }
  const burned = day.exercise.reduce((s, e) => s + e.calories, 0);
  return { calories: Math.round(calories), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat), burned: Math.round(burned) };
}

export function remaining(profile: Profile, day: DayLog) {
  const t = dayTotals(day);
  return { ...t, remaining: profile.calorieGoal - t.calories + t.burned };
}

/** Calories burned from a MET value: kcal = MET × kg × hours. */
export const metCalories = (met: number, weightLb: number, minutes: number) => Math.round(met * weightLb * 0.4536 * (minutes / 60));

/** Epley one-rep-max estimate. */
export const oneRepMax = (weight: number, reps: number) => (reps <= 1 ? weight : Math.round(weight * (1 + reps / 30)));

export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const today = () => isoDate(new Date());
export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return isoDate(new Date(y, m - 1, d + n));
}
export function prettyDate(iso: string) {
  if (iso === today()) return "Today";
  if (iso === addDays(today(), -1)) return "Yesterday";
  if (iso === addDays(today(), 1)) return "Tomorrow";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
