import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import type { DayLog, Food, Profile, UserData, Workout } from "./types";

/**
 * Offline-first sync with Supabase.
 *
 * Every change is saved on the phone immediately and the changed record is
 * marked "dirty" (e.g. `day:2026-11-07`, `workout:<id>`). Dirty keys are kept
 * in an outbox on disk and uploaded in the background; if the phone is offline
 * they stay queued and are retried on the next change or app launch.
 */

export type DirtyKey = "profile" | `day:${string}` | `workout:${string}` | `weight:${string}` | `food:${string}`;

const outboxKey = (userId: string) => `shuttle.outbox.${userId}`;

export async function loadOutbox(userId: string): Promise<Set<DirtyKey>> {
  return new Set(JSON.parse((await AsyncStorage.getItem(outboxKey(userId))) ?? "[]"));
}

export async function saveOutbox(userId: string, keys: Set<DirtyKey>) {
  await AsyncStorage.setItem(outboxKey(userId), JSON.stringify([...keys]));
}

/** Uploads every dirty key using the latest local data. Returns the keys that still failed. */
export async function flush(userId: string, data: UserData, keys: Set<DirtyKey>): Promise<Set<DirtyKey>> {
  if (!supabase || keys.size === 0) return keys;
  const failed = new Set<DirtyKey>();
  const now = new Date().toISOString();

  for (const key of keys) {
    const [kind, id] = splitKey(key);
    let error: { message: string } | null = null;
    try {
      if (kind === "profile") {
        ({ error } = await supabase
          .from("shuttle_profiles")
          .upsert({ user_id: userId, profile: data.profile, recent_foods: data.recentFoods, updated_at: now }));
      } else if (kind === "day") {
        const log = data.diary[id];
        ({ error } = log
          ? await supabase.from("shuttle_diary_days").upsert({ user_id: userId, date: id, log, updated_at: now })
          : await supabase.from("shuttle_diary_days").delete().match({ user_id: userId, date: id }));
      } else if (kind === "workout") {
        const w = data.workouts.find((x) => x.id === id);
        ({ error } = w
          ? await supabase.from("shuttle_workouts").upsert({ user_id: userId, id, date: w.date, data: w, updated_at: now })
          : await supabase.from("shuttle_workouts").delete().match({ user_id: userId, id }));
      } else if (kind === "weight") {
        const w = data.weights.find((x) => x.date === id);
        ({ error } = w
          ? await supabase.from("shuttle_weights").upsert({ user_id: userId, date: id, lb: w.lb, updated_at: now })
          : await supabase.from("shuttle_weights").delete().match({ user_id: userId, date: id }));
      } else if (kind === "food") {
        const f = data.customFoods.find((x) => x.id === id);
        ({ error } = f
          ? await supabase.from("shuttle_custom_foods").upsert({ user_id: userId, id, food: f, updated_at: now })
          : await supabase.from("shuttle_custom_foods").delete().match({ user_id: userId, id }));
      }
    } catch (e) {
      error = { message: (e as Error).message };
    }
    if (error) failed.add(key);
  }
  return failed;
}

/** Downloads everything for the signed-in user. Returns null if the request fails (e.g. offline). */
export async function pull(userId: string): Promise<Omit<UserData, never> | null> {
  if (!supabase) return null;
  const [profile, days, workouts, weights, foods] = await Promise.all([
    supabase.from("shuttle_profiles").select("profile, recent_foods").eq("user_id", userId).maybeSingle(),
    supabase.from("shuttle_diary_days").select("date, log").eq("user_id", userId),
    supabase.from("shuttle_workouts").select("data").eq("user_id", userId).order("date", { ascending: false }),
    supabase.from("shuttle_weights").select("date, lb").eq("user_id", userId).order("date"),
    supabase.from("shuttle_custom_foods").select("food").eq("user_id", userId).order("updated_at", { ascending: false }),
  ]);
  if (profile.error || days.error || workouts.error || weights.error || foods.error) return null;
  return {
    profile: (profile.data?.profile as Profile | null) ?? null,
    recentFoods: (profile.data?.recent_foods as Food[] | undefined) ?? [],
    diary: Object.fromEntries((days.data ?? []).map((d) => [d.date as string, d.log as DayLog])),
    workouts: (workouts.data ?? []).map((w) => w.data as Workout),
    weights: (weights.data ?? []).map((w) => ({ date: w.date as string, lb: Number(w.lb) })),
    customFoods: (foods.data ?? []).map((f) => f.food as Food),
  };
}

/** Every key that has data, used to upload an account's existing local data the first time. */
export function allKeys(data: UserData): Set<DirtyKey> {
  const keys = new Set<DirtyKey>();
  if (data.profile) keys.add("profile");
  for (const d of Object.keys(data.diary)) keys.add(`day:${d}`);
  for (const w of data.workouts) keys.add(`workout:${w.id}`);
  for (const w of data.weights) keys.add(`weight:${w.date}`);
  for (const f of data.customFoods) keys.add(`food:${f.id}`);
  return keys;
}

function splitKey(key: DirtyKey): [string, string] {
  const i = key.indexOf(":");
  return i === -1 ? [key, ""] : [key.slice(0, i), key.slice(i + 1)];
}
