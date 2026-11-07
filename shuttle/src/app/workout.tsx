import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActionSheetIOS, Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Button, Card, Icon, Label } from "../components/ui";
import { LIFTS, STRENGTH_MET } from "../lib/exercises";
import { metCalories, oneRepMax, today } from "../lib/nutrition";
import { useStore } from "../lib/store";
import { c } from "../lib/theme";
import type { Workout, WorkoutExercise } from "../lib/types";

export default function WorkoutScreen() {
  const params = useLocalSearchParams<{ date?: string; id?: string; template?: string }>();
  const { data, saveWorkout } = useStore();
  const existing = params.id ? data.workouts.find((w) => w.id === params.id) : undefined;
  const template = params.template ? data.workouts.find((w) => w.id === params.template) : undefined;

  const [name, setName] = useState(existing?.name ?? template?.name ?? "Strength workout");
  const [exercises, setExercises] = useState<WorkoutExercise[]>(
    existing?.exercises ?? template?.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, done: false })) })) ?? [],
  );
  const [startedAt] = useState(Date.now());
  const [elapsed, setElapsed] = useState(existing?.minutes ?? 0);

  useEffect(() => {
    if (existing) return;
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 60000)), 15000);
    return () => clearInterval(timer);
  }, [existing, startedAt]);

  // Previous best (estimated 1RM) per exercise, to show PRs live.
  const bests = useMemo(() => {
    const map: Record<string, number> = {};
    for (const w of data.workouts) {
      if (w.id === existing?.id) continue;
      for (const e of w.exercises) for (const s of e.sets) if (s.done) map[e.name] = Math.max(map[e.name] ?? 0, oneRepMax(s.weight, s.reps));
    }
    return map;
  }, [data.workouts, existing?.id]);

  const minutes = Math.max(1, elapsed);
  const calories = metCalories(STRENGTH_MET, data.profile!.weightLb, minutes);
  const doneSets = exercises.reduce((s, e) => s + e.sets.filter((x) => x.done).length, 0);
  const volume = exercises.reduce((s, e) => s + e.sets.filter((x) => x.done).reduce((v, x) => v + x.reps * x.weight, 0), 0);

  const addExercise = () => {
    const recent = [...new Set(data.workouts.flatMap((w) => w.exercises.map((e) => e.name)))];
    const options = [...new Set([...recent, ...LIFTS])].filter((n) => !exercises.some((e) => e.name === n)).slice(0, 30);
    ActionSheetIOS.showActionSheetWithOptions({ title: "Add exercise", options: ["Cancel", "Custom…", ...options], cancelButtonIndex: 0 }, (i) => {
      if (i === 0) return;
      const add = (n: string) => setExercises((xs) => [...xs, { name: n, sets: [{ reps: 10, weight: 0, done: false }] }]);
      if (i === 1) Alert.prompt("Exercise name", undefined, (n) => n?.trim() && add(n.trim()));
      else add(options[i - 2]);
    });
  };

  const updateSet = (ei: number, si: number, patch: Partial<WorkoutExercise["sets"][number]>) =>
    setExercises((xs) => xs.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) })));

  const finish = () => {
    if (!doneSets) {
      Alert.alert("No sets completed", "Tap the check next to a set when you finish it.");
      return;
    }
    const w: Workout = {
      id: existing?.id ?? Crypto.randomUUID(),
      date: existing?.date ?? params.date ?? today(),
      name: name.trim() || "Strength workout",
      minutes,
      exercises: exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })).filter((e) => e.sets.length),
    };
    saveWorkout(w, calories);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={() => (exercises.length ? Alert.alert("Discard workout?", undefined, [{ text: "Keep going", style: "cancel" }, { text: "Discard", style: "destructive", onPress: () => router.back() }]) : router.back())}>
              <Text style={{ color: c.silverDim, fontSize: 17 }}>Cancel</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={finish}>
              <Text style={{ color: c.green, fontSize: 17, fontWeight: "800" }}>Finish</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <TextInput value={name} onChangeText={setName} style={{ color: c.white, fontSize: 28, fontWeight: "900" }} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pill icon="timer" label={`${minutes} min`} />
          <Pill icon="flame.fill" label={`+${calories} cal`} color={c.green} />
          <Pill icon="scalemass.fill" label={`${volume.toLocaleString()} lb`} />
        </View>

        {exercises.map((e, ei) => {
          const best = bests[e.name] ?? 0;
          return (
            <Card key={e.name} style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: c.blueBright, fontSize: 17, fontWeight: "800" }}>{e.name}</Text>
                <Pressable onPress={() => setExercises((xs) => xs.filter((_, i) => i !== ei))} hitSlop={10}>
                  <Icon name="trash" size={15} color={c.silverFaint} />
                </Pressable>
              </View>
              {best ? <Label style={{ fontSize: 12 }}>Best est. 1RM: {best} lb</Label> : null}
              <View style={{ flexDirection: "row", paddingHorizontal: 4 }}>
                <Label style={{ width: 36 }}>SET</Label>
                <Label style={{ flex: 1, textAlign: "center" }}>LB</Label>
                <Label style={{ flex: 1, textAlign: "center" }}>REPS</Label>
                <View style={{ width: 44 }} />
              </View>
              {e.sets.map((s, si) => {
                const isPR = s.done && s.weight > 0 && oneRepMax(s.weight, s.reps) > best;
                return (
                  <View key={si} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: s.done ? c.greenSoft : "transparent", borderRadius: 12, padding: 4 }}>
                    <Text style={{ width: 32, color: isPR ? c.yellow : c.silver, fontWeight: "800", textAlign: "center" }}>{isPR ? "PR" : si + 1}</Text>
                    <NumInput value={s.weight} onChange={(v) => updateSet(ei, si, { weight: v })} />
                    <NumInput value={s.reps} onChange={(v) => updateSet(ei, si, { reps: v })} />
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        updateSet(ei, si, { done: !s.done });
                      }}
                      style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: s.done ? c.green : c.surfaceHi }}
                    >
                      <Icon name="checkmark" size={16} color={s.done ? c.bg : c.silverFaint} />
                    </Pressable>
                  </View>
                );
              })}
              <Pressable
                onPress={() => setExercises((xs) => xs.map((x, i) => (i === ei ? { ...x, sets: [...x.sets, { ...(x.sets[x.sets.length - 1] ?? { reps: 10, weight: 0 }), done: false }] } : x)))}
                style={{ alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: c.surfaceHi }}
              >
                <Text style={{ color: c.silver, fontWeight: "700" }}>+ Add set</Text>
              </Pressable>
            </Card>
          );
        })}

        <Button title="Add exercise" icon="plus" variant="secondary" onPress={addExercise} />
        <Button title="Finish workout" icon="checkmark" onPress={finish} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <TextInput
      defaultValue={value ? String(value) : ""}
      placeholder="0"
      placeholderTextColor={c.silverFaint}
      keyboardType="decimal-pad"
      selectTextOnFocus
      onChangeText={(t) => onChange(Number(t) || 0)}
      style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: c.surfaceHi, color: c.white, textAlign: "center", fontSize: 16, fontWeight: "700" }}
    />
  );
}

function Pill({ icon, label, color = c.silver }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; color?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
      <Icon name={icon} size={13} color={color} />
      <Text style={{ color, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{label}</Text>
    </View>
  );
}
