export type Meal = "breakfast" | "lunch" | "dinner" | "snacks";
export const MEALS: { id: Meal; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snacks", label: "Snacks" },
];

export interface Food {
  id: string;
  name: string;
  brand?: string;
  serving: string; // e.g. "1 cup (240 ml)"
  calories: number;
  protein: number; // grams per serving
  carbs: number;
  fat: number;
  barcode?: string;
}

export interface FoodEntry {
  id: string;
  meal: Meal;
  food: Food;
  servings: number;
}

export interface ExerciseEntry {
  id: string;
  name: string;
  minutes: number;
  calories: number;
  workoutId?: string;
}

export interface DayLog {
  food: FoodEntry[];
  exercise: ExerciseEntry[];
  water: number; // cups
}

export interface WorkoutSet {
  reps: number;
  weight: number; // lb
  done: boolean;
}

export interface WorkoutExercise {
  name: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  minutes: number;
  exercises: WorkoutExercise[];
}

export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "very";
export type GoalType = "lose" | "maintain" | "gain";

export interface Profile {
  name: string;
  sex: Sex;
  age: number;
  heightIn: number;
  weightLb: number;
  goalWeightLb: number;
  activity: Activity;
  goal: GoalType;
  /** lb per week to lose/gain. */
  rate: number;
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  waterGoal: number;
  workoutsPerWeek: number;
}

export interface UserData {
  profile: Profile | null;
  diary: Record<string, DayLog>;
  customFoods: Food[];
  recentFoods: Food[];
  workouts: Workout[];
  weights: { date: string; lb: number }[];
}
