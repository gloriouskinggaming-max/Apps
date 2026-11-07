import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as auth from "./auth";
import { emptyDay, today } from "./nutrition";
import type { DayLog, ExerciseEntry, Food, FoodEntry, Profile, UserData, Workout } from "./types";

const EMPTY: UserData = { profile: null, diary: {}, customFoods: [], recentFoods: [], workouts: [], weights: [] };
const dataKey = (userId: string) => `shuttle.data.${userId}`;

interface StoreValue {
  ready: boolean;
  user: auth.User | null;
  data: UserData;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  saveProfile: (p: Profile) => void;
  day: (date: string) => DayLog;
  addFood: (date: string, entry: Omit<FoodEntry, "id">) => void;
  removeFood: (date: string, id: string) => void;
  addExercise: (date: string, entry: Omit<ExerciseEntry, "id">) => void;
  removeExercise: (date: string, id: string) => void;
  setWater: (date: string, cups: number) => void;
  saveCustomFood: (food: Food) => void;
  saveWorkout: (w: Workout, caloriesBurned: number) => void;
  deleteWorkout: (id: string) => void;
  logWeight: (lb: number, date?: string) => void;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<auth.User | null>(null);
  const [data, setData] = useState<UserData>(EMPTY);
  const loadedFor = useRef<string | null>(null);

  const load = useCallback(async (u: auth.User | null) => {
    loadedFor.current = null;
    setUser(u);
    if (u) {
      const raw = await AsyncStorage.getItem(dataKey(u.id));
      setData(raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY);
      loadedFor.current = u.id;
    } else {
      setData(EMPTY);
    }
  }, []);

  useEffect(() => {
    auth.currentUser().then(load).finally(() => setReady(true));
  }, [load]);

  // Persist whenever data changes (only after this user's data has loaded).
  useEffect(() => {
    if (user && loadedFor.current === user.id) AsyncStorage.setItem(dataKey(user.id), JSON.stringify(data));
  }, [data, user]);

  const update = useCallback((fn: (d: UserData) => UserData) => setData(fn), []);
  const updateDay = useCallback(
    (date: string, fn: (d: DayLog) => DayLog) => update((d) => ({ ...d, diary: { ...d.diary, [date]: fn(d.diary[date] ?? emptyDay()) } })),
    [update],
  );

  const value: StoreValue = {
    ready,
    user,
    data,
    signIn: async (email, password) => load(await auth.signIn(email, password)),
    signUp: async (name, email, password) => load(await auth.signUp(name, email, password)),
    signOut: async () => {
      await auth.signOut();
      await load(null);
    },
    deleteAccount: async () => {
      if (user) await auth.deleteAccount(user.id);
      await load(null);
    },
    saveProfile: (profile) =>
      update((d) => ({
        ...d,
        profile,
        weights: d.weights.length ? d.weights : [{ date: today(), lb: profile.weightLb }],
      })),
    day: (date) => data.diary[date] ?? emptyDay(),
    addFood: (date, entry) => {
      updateDay(date, (day) => ({ ...day, food: [...day.food, { ...entry, id: Crypto.randomUUID() }] }));
      update((d) => ({ ...d, recentFoods: [entry.food, ...d.recentFoods.filter((f) => f.id !== entry.food.id)].slice(0, 30) }));
    },
    removeFood: (date, id) => updateDay(date, (day) => ({ ...day, food: day.food.filter((e) => e.id !== id) })),
    addExercise: (date, entry) => updateDay(date, (day) => ({ ...day, exercise: [...day.exercise, { ...entry, id: Crypto.randomUUID() }] })),
    removeExercise: (date, id) => updateDay(date, (day) => ({ ...day, exercise: day.exercise.filter((e) => e.id !== id) })),
    setWater: (date, cups) => updateDay(date, (day) => ({ ...day, water: Math.max(0, cups) })),
    saveCustomFood: (food) => update((d) => ({ ...d, customFoods: [food, ...d.customFoods.filter((f) => f.id !== food.id)] })),
    saveWorkout: (w, caloriesBurned) => {
      update((d) => ({ ...d, workouts: [w, ...d.workouts.filter((x) => x.id !== w.id)] }));
      updateDay(w.date, (day) => ({
        ...day,
        exercise: [
          ...day.exercise.filter((e) => e.workoutId !== w.id),
          { id: Crypto.randomUUID(), name: w.name, minutes: w.minutes, calories: caloriesBurned, workoutId: w.id },
        ],
      }));
    },
    deleteWorkout: (id) => {
      const w = data.workouts.find((x) => x.id === id);
      update((d) => ({ ...d, workouts: d.workouts.filter((x) => x.id !== id) }));
      if (w) updateDay(w.date, (day) => ({ ...day, exercise: day.exercise.filter((e) => e.workoutId !== id) }));
    },
    logWeight: (lb, date = today()) =>
      update((d) => {
        const weights = [...d.weights.filter((w) => w.date !== date), { date, lb }].sort((a, b) => a.date.localeCompare(b.date));
        const latest = weights[weights.length - 1];
        return { ...d, weights, profile: d.profile ? { ...d.profile, weightLb: latest.lb } : d.profile };
      }),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
