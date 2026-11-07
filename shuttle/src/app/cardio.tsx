import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from "react-native";
import { Button, Field, Icon, IconBadge, Segmented } from "../components/ui";
import { CARDIO } from "../lib/exercises";
import { metCalories, today } from "../lib/nutrition";
import { useStore } from "../lib/store";
import { c } from "../lib/theme";

/** ~0.04 kcal per step for a 150 lb person, scaled by body weight. */
const stepCalories = (steps: number, weightLb: number) => Math.round(steps * 0.04 * (weightLb / 150));

export default function Cardio() {
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? today();
  const { data, addExercise } = useStore();
  const weight = data.profile!.weightLb;
  const [mode, setMode] = useState<"activity" | "steps">("activity");
  const [selected, setSelected] = useState(CARDIO[0].id);
  const [minutes, setMinutes] = useState("30");
  const [steps, setSteps] = useState("");
  const [manual, setManual] = useState("");

  const type = CARDIO.find((x) => x.id === selected)!;
  const mins = Number(minutes) || 0;
  const estimate = mode === "steps" ? stepCalories(Number(steps) || 0, weight) : metCalories(type.met, weight, mins);
  const calories = Number(manual) || estimate;

  const save = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (mode === "steps") addExercise(date, { name: `${Number(steps).toLocaleString()} steps`, minutes: Math.round((Number(steps) || 0) / 100), calories });
    else addExercise(date, { name: type.name, minutes: mins, calories });
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Segmented value={mode} onChange={setMode} options={[{ value: "activity", label: "Activity" }, { value: "steps", label: "Steps" }]} />

        {mode === "activity" ? (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {CARDIO.map((x) => {
                const active = x.id === selected;
                return (
                  <Pressable
                    key={x.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelected(x.id);
                    }}
                    style={{ width: "31.5%", alignItems: "center", gap: 6, paddingVertical: 12, borderRadius: 16, backgroundColor: active ? c.blueDeep : c.surface, borderWidth: 1.5, borderColor: active ? c.blue : c.border }}
                  >
                    <IconBadge name={x.icon} color={active ? c.green : c.silver} size={34} />
                    <Text numberOfLines={2} style={{ color: active ? c.white : c.silver, fontSize: 12, fontWeight: "600", textAlign: "center", paddingHorizontal: 4 }}>{x.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Field label="Minutes" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />
          </>
        ) : (
          <Field label="Steps" value={steps} onChangeText={setSteps} keyboardType="number-pad" placeholder="10000" />
        )}

        <Field label="Calories burned (optional — from your watch)" value={manual} onChangeText={setManual} keyboardType="number-pad" placeholder={`Estimated ${estimate}`} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.greenSoft, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: c.green + "55" }}>
          <Icon name="flame.fill" size={26} color={c.green} />
          <View>
            <Text style={{ color: c.silverDim, fontWeight: "600" }}>You'll earn back</Text>
            <Text style={{ color: c.green, fontSize: 30, fontWeight: "900", fontVariant: ["tabular-nums"] }}>+{calories} cal</Text>
          </View>
        </View>

        <Button title="Log exercise" icon="checkmark" onPress={save} disabled={calories <= 0} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
