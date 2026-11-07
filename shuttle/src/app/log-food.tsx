import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Icon, Segmented } from "../components/ui";
import { useStore } from "../lib/store";
import { c } from "../lib/theme";
import { MEALS, type Food, type Meal } from "../lib/types";

const STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5];

export default function LogFood() {
  const params = useLocalSearchParams<{ date: string; meal: Meal; food: string }>();
  const food = JSON.parse(params.food) as Food;
  const { addFood } = useStore();
  const [servings, setServings] = useState(1);
  const [meal, setMeal] = useState<Meal>(params.meal ?? "snacks");

  const step = (dir: 1 | -1) => {
    Haptics.selectionAsync();
    const i = STEPS.findIndex((s) => s >= servings);
    const next = dir === 1 ? STEPS[Math.min(STEPS.length - 1, (STEPS[i] === servings ? i : i - 1) + 1)] : STEPS[Math.max(0, (i === -1 ? STEPS.length : i) - 1)];
    setServings(next);
  };

  const m = (x: number) => Math.round(x * servings * 10) / 10;

  const save = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addFood(params.date, { meal, food, servings });
    router.dismissTo("/");
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.surface, padding: 20, gap: 18 }}>
      <View>
        <Text style={{ color: c.white, fontSize: 22, fontWeight: "800" }} numberOfLines={2}>{food.name}</Text>
        <Text style={{ color: c.silverDim, marginTop: 4 }}>{[food.brand, food.serving].filter(Boolean).join(" · ")}</Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => step(-1)} style={stepper}>
          <Icon name="minus" size={18} color={c.white} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: c.white, fontSize: 40, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{servings}</Text>
          <Text style={{ color: c.silverDim }}>serving{servings === 1 ? "" : "s"}</Text>
        </View>
        <Pressable onPress={() => step(1)} style={stepper}>
          <Icon name="plus" size={18} color={c.white} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: c.bg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.border }}>
        <Nutrient label="Calories" value={Math.round(food.calories * servings)} color={c.white} />
        <Nutrient label="Protein" value={`${m(food.protein)}g`} color={c.green} />
        <Nutrient label="Carbs" value={`${m(food.carbs)}g`} color={c.blueBright} />
        <Nutrient label="Fat" value={`${m(food.fat)}g`} color={c.silver} />
      </View>

      <Segmented value={meal} onChange={setMeal} options={MEALS.map((x) => ({ value: x.id, label: x.label }))} />
      <Button title="Add to diary" icon="checkmark" onPress={save} />
    </View>
  );
}

const stepper = { width: 56, height: 56, borderRadius: 28, backgroundColor: c.blue, alignItems: "center", justifyContent: "center" } as const;

function Nutrient({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color, fontSize: 18, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: c.silverDim, fontSize: 12 }}>{label}</Text>
    </View>
  );
}
