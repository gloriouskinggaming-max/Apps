import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import * as auth from "./auth";
import * as cloud from "./cloud";
import { emptyDay, today } from "./nutrition";
import { cloudEnabled } from "./supabase";
import type { DayLog, ExerciseEntry, Food, FoodEntry, Profile, UserData, Workout } from "./types";

const EMPTY: UserData = { profile: null, diary: {}, customFoods: [], recentFoods: [], workouts: [], weights: [] };
const dataKey = (userId: string) => `shuttle.data.${userId}`;
const SYNC_DELAY_MS = 1500;

export type SyncStatus = "local" | "synced" | "syncing" | "offline";

interface StoreValue {
  ready: boolean;
  user: auth.User | null;
  data: UserData;
  syncStatus: SyncStatus;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  /** Resolves to "confirm-email" when Supabase requires email confirmation first. */
  signUp: (name: string, email: string, password: string) => Promise<"signed-in" | "confirm-email">;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  syncNow: () => void;
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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloudEnabled ? "synced" : "local");

  const loadedFor = useRef<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const outbox = useRef<Set<cloud.DirtyKey>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushing = useRef(false);

  const flushNow = useCallback(async () => {
    const uid = loadedFor.current;
    if (!cloudEnabled || !uid || flushing.current || outbox.current.size === 0) return;
    flushing.current = true;
    setSyncStatus("syncing");
    const sending = new Set(outbox.current);
    outbox.current = new Set();
    const failed = await cloud.flush(uid, dataRef.current, sending);
    // Keep anything that failed plus anything changed while we were uploading.
    for (const k of failed) outbox.current.add(k);
    await cloud.saveOutbox(uid, outbox.current);
    flushing.current = false;
    setSyncStatus(failed.size ? "offline" : outbox.current.size ? "syncing" : "synced");
    if (!failed.size && outbox.current.size) scheduleFlush();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleFlush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flushNow, SYNC_DELAY_MS);
  }, [flushNow]);

  const mark = useCallback(
    (...keys: cloud.DirtyKey[]) => {
      if (!cloudEnabled || !loadedFor.current) return;
      for (const k of keys) outbox.current.add(k);
      cloud.saveOutbox(loadedFor.current, outbox.current);
      scheduleFlush();
    },
    [scheduleFlush],
  );

  const load = useCallback(
    async (u: auth.User | null) => {
      loadedFor.current = null;
      outbox.current = new Set();
      setUser(u);
      if (!u) {
        setData(EMPTY);
        return;
      }
      // 1) Show what's cached on the phone right away.
      const raw = await AsyncStorage.getItem(dataKey(u.id));
      const cached: UserData = raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
      setData(cached);
      dataRef.current = cached;
      loadedFor.current = u.id;
      if (!cloudEnabled) return;

      // 2) Upload anything that didn't make it last time, then pull the latest from Supabase.
      outbox.current = await cloud.loadOutbox(u.id);
      setSyncStatus("syncing");
      if (outbox.current.size) await flushNow();
      if (outbox.current.size) return; // still offline: keep using the cache

      const remote = await cloud.pull(u.id);
      if (!remote) {
        setSyncStatus("offline");
        return;
      }
      if (!remote.profile && cached.profile) {
        // Cloud is empty but the phone has data (e.g. first login after enabling sync): upload it.
        outbox.current = cloud.allKeys(cached);
        await flushNow();
        return;
      }
      if (loadedFor.current === u.id) setData(remote);
      setSyncStatus("synced");
    },
    [flushNow],
  );

  useEffect(() => {
    auth.currentUser().then(load).finally(() => setReady(true));
    return auth.onAuthChange((u) => {
      if (!u) load(null);
      else setUser(u);
    });
  }, [load]);

  // Save to the phone whenever data changes (only after this user's data has loaded).
  useEffect(() => {
    if (user && loadedFor.current === user.id) AsyncStorage.setItem(dataKey(user.id), JSON.stringify(data));
  }, [data, user]);

  // Retry queued uploads when the app comes back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s === "active" && flushNow());
    return () => sub.remove();
  }, [flushNow]);

  const update = useCallback((fn: (d: UserData) => UserData) => setData(fn), []);
  const updateDay = useCallback(
    (date: string, fn: (d: DayLog) => DayLog) => {
      update((d) => ({ ...d, diary: { ...d.diary, [date]: fn(d.diary[date] ?? emptyDay()) } }));
      mark(`day:${date}`);
    },
    [update, mark],
  );

  const value: StoreValue = {
    ready,
    user,
    data,
    syncStatus,
    signIn: async (email, password) => load(await auth.signIn(email, password)),
    signInWithApple: async () => {
      const u = await auth.signInWithApple();
      if (u) await load(u);
    },
    signUp: async (name, email, password) => {
      const result = await auth.signUp(name, email, password);
      if ("needsConfirmation" in result) return "confirm-email";
      await load(result.user);
      return "signed-in";
    },
    resetPassword: async (email, code, newPassword) => load(await auth.resetPassword(email, code, newPassword)),
    signOut: async () => {
      await flushNow();
      await auth.signOut();
      await load(null);
    },
    deleteAccount: async () => {
      if (user) {
        await auth.deleteAccount(user.id);
        await AsyncStorage.multiRemove([dataKey(user.id), `shuttle.outbox.${user.id}`]);
      }
      await load(null);
    },
    syncNow: () => {
      if (loadedFor.current) load(user);
    },
    saveProfile: (profile) => {
      const seedWeight = dataRef.current.weights.length === 0;
      update((d) => ({ ...d, profile, weights: d.weights.length ? d.weights : [{ date: today(), lb: profile.weightLb }] }));
      mark("profile", ...(seedWeight ? ([`weight:${today()}`] as const) : []));
    },
    day: (date) => data.diary[date] ?? emptyDay(),
    addFood: (date, entry) => {
      updateDay(date, (day) => ({ ...day, food: [...day.food, { ...entry, id: Crypto.randomUUID() }] }));
      update((d) => ({ ...d, recentFoods: [entry.food, ...d.recentFoods.filter((f) => f.id !== entry.food.id)].slice(0, 30) }));
      mark("profile");
    },
    removeFood: (date, id) => updateDay(date, (day) => ({ ...day, food: day.food.filter((e) => e.id !== id) })),
    addExercise: (date, entry) => updateDay(date, (day) => ({ ...day, exercise: [...day.exercise, { ...entry, id: Crypto.randomUUID() }] })),
    removeExercise: (date, id) => updateDay(date, (day) => ({ ...day, exercise: day.exercise.filter((e) => e.id !== id) })),
    setWater: (date, cups) => updateDay(date, (day) => ({ ...day, water: Math.max(0, cups) })),
    saveCustomFood: (food) => {
      update((d) => ({ ...d, customFoods: [food, ...d.customFoods.filter((f) => f.id !== food.id)] }));
      mark(`food:${food.id}`);
    },
    saveWorkout: (w, caloriesBurned) => {
      update((d) => ({ ...d, workouts: [w, ...d.workouts.filter((x) => x.id !== w.id)] }));
      mark(`workout:${w.id}`);
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
      mark(`workout:${id}`);
      if (w) updateDay(w.date, (day) => ({ ...day, exercise: day.exercise.filter((e) => e.workoutId !== id) }));
    },
    logWeight: (lb, date = today()) => {
      update((d) => {
        const weights = [...d.weights.filter((w) => w.date !== date), { date, lb }].sort((a, b) => a.date.localeCompare(b.date));
        const latest = weights[weights.length - 1];
        return { ...d, weights, profile: d.profile ? { ...d.profile, weightLb: latest.lb } : d.profile };
      });
      mark(`weight:${date}`, "profile");
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
