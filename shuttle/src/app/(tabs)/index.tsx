import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Bar, Card, Icon, IconBadge, Label, Ring, Row, Screen, SectionHeader } from "../../components/ui";
import { addDays, dayTotals, prettyDate, today } from "../../lib/nutrition";
import { useStore } from "../../lib/store";
import { c, limitColor, reachColor } from "../../lib/theme";
import { MEALS } from "../../lib/types";

export default function Today() {
  const { data, day, removeFood, removeExercise, setWater } = useStore();
  const profile = data.profile!;
  const [date, setDate] = useState(today());
  const log = day(date);
  const totals = dayTotals(log);
  const budget = profile.calorieGoal + totals.burned;
  const remaining = budget - totals.calories;
  const pct = budget ? totals.calories / budget : 0;
  const ringColor = limitColor(pct);

  const shift = (n: number) => {
    Haptics.selectionAsync();
    setDate((d) => addDays(d, n));
  };

  const confirmRemove = (label: string, onRemove: () => void) =>
    Alert.alert(`Remove ${label}?`, undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: onRemove },
    ]);

  return (
    <Screen title={prettyDate(date)} subtitle={`Hi, ${profile.name.split(" ")[0]}`}>
      {/* Date switcher */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <Pressable onPress={() => shift(-1)} hitSlop={10} style={{ padding: 8 }}>
          <Icon name="chevron.left" size={16} color={c.blueBright} />
        </Pressable>
        <Pressable onPress={() => setDate(today())}>
          <Text style={{ color: date === today() ? c.silverDim : c.blueBright, fontWeight: "700" }}>{date === today() ? date : "Jump to today"}</Text>
        </Pressable>
        <Pressable onPress={() => shift(1)} hitSlop={10} style={{ padding: 8 }}>
          <Icon name="chevron.right" size={16} color={c.blueBright} />
        </Pressable>
      </View>

      {/* Calories hero */}
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <Ring value={pct} color={ringColor} size={150} stroke={14}>
          <Text style={{ color: c.white, fontSize: 30, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{Math.abs(remaining).toLocaleString()}</Text>
          <Text style={{ color: remaining >= 0 ? c.silverDim : c.red, fontSize: 13, fontWeight: "700" }}>{remaining >= 0 ? "Remaining" : "Over"}</Text>
        </Ring>
        <View style={{ flex: 1, gap: 12 }}>
          <Stat icon="flag.fill" color={c.silver} label="Goal" value={profile.calorieGoal} />
          <Stat icon="fork.knife" color={c.blueBright} label="Food" value={totals.calories} />
          <Stat icon="flame.fill" color={c.green} label="Exercise" value={totals.burned} />
        </View>
      </Card>

      {/* Goal − Food + Exercise = Remaining */}
      <Card style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 }}>
        <Eq value={profile.calorieGoal} label="Goal" />
        <Op>−</Op>
        <Eq value={totals.calories} label="Food" />
        <Op>+</Op>
        <Eq value={totals.burned} label="Exercise" color={c.green} />
        <Op>=</Op>
        <Eq value={remaining} label="Remaining" color={remaining >= 0 ? c.white : c.red} />
      </Card>

      {totals.burned > 0 ? (
        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.greenSoft, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.green + "55" }}>
          <Icon name="flame.fill" size={20} color={c.green} />
          <Text style={{ color: c.white, flex: 1, fontSize: 15 }}>
            You earned back <Text style={{ color: c.green, fontWeight: "900" }}>+{totals.burned.toLocaleString()} cal</Text> by working out today.
          </Text>
        </View>
      ) : null}

      {/* Macros */}
      <Card style={{ marginTop: 12, flexDirection: "row", gap: 14 }}>
        <Macro label="Protein" value={totals.protein} goal={profile.proteinGoal} reach />
        <Macro label="Carbs" value={totals.carbs} goal={profile.carbsGoal} />
        <Macro label="Fat" value={totals.fat} goal={profile.fatGoal} />
      </Card>

      {/* Meals */}
      {MEALS.map((meal) => {
        const entries = log.food.filter((e) => e.meal === meal.id);
        const kcal = Math.round(entries.reduce((s, e) => s + e.food.calories * e.servings, 0));
        return (
          <View key={meal.id}>
            <SectionHeader title={meal.label} action={<Text style={{ color: c.silver, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{kcal} cal</Text>} />
            <Card style={{ paddingVertical: 4 }}>
              {entries.map((e) => (
                <Row
                  key={e.id}
                  title={e.food.name}
                  subtitle={`${e.servings === 1 ? "" : `${e.servings} × `}${e.food.serving}${e.food.brand ? ` · ${e.food.brand}` : ""}`}
                  right={<Text style={{ color: c.white, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{Math.round(e.food.calories * e.servings)}</Text>}
                  onPress={() => confirmRemove(e.food.name, () => removeFood(date, e.id))}
                />
              ))}
              <AddRow label="Add food" onPress={() => router.push({ pathname: "/add-food", params: { date, meal: meal.id } })} />
            </Card>
          </View>
        );
      })}

      {/* Exercise */}
      <SectionHeader title="Exercise" action={<Text style={{ color: c.green, fontWeight: "700" }}>{totals.burned} cal</Text>} />
      <Card style={{ paddingVertical: 4 }}>
        {log.exercise.map((e) => (
          <Row
            key={e.id}
            left={<IconBadge name={e.workoutId ? "dumbbell.fill" : "figure.run"} color={c.green} size={32} />}
            title={e.name}
            subtitle={`${e.minutes} min`}
            right={<Text style={{ color: c.green, fontWeight: "700" }}>{e.calories}</Text>}
            onPress={() => confirmRemove(e.name, () => removeExercise(date, e.id))}
          />
        ))}
        <AddRow label="Log cardio" onPress={() => router.push({ pathname: "/cardio", params: { date } })} />
        <AddRow label="Start strength workout" onPress={() => router.push({ pathname: "/workout", params: { date } })} />
      </Card>

      {/* Water */}
      <SectionHeader title="Water" action={<Text style={{ color: reachColor(log.water / profile.waterGoal), fontWeight: "700" }}>{log.water} / {profile.waterGoal} cups</Text>} />
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {Array.from({ length: Math.max(profile.waterGoal, log.water) }, (_, i) => (
            <Pressable
              key={i}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setWater(date, i < log.water ? i : i + 1);
              }}
              style={{ width: 36, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: i < log.water ? c.blue : c.surfaceHi, borderWidth: 1, borderColor: i < log.water ? c.blueBright : c.border }}
            >
              <Icon name="drop.fill" size={16} color={i < log.water ? c.white : c.silverFaint} />
            </Pressable>
          ))}
          <Pressable onPress={() => setWater(date, log.water + 1)} style={{ width: 36, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderColor: c.silverFaint }}>
            <Icon name="plus" size={14} color={c.silverDim} />
          </Pressable>
        </View>
        <Bar value={log.water / profile.waterGoal} color={reachColor(log.water / profile.waterGoal)} />
      </Card>
    </Screen>
  );
}

function Eq({ value, label, color = c.white }: { value: number; label: string; color?: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color, fontSize: 16, fontWeight: "800", fontVariant: ["tabular-nums"] }} adjustsFontSizeToFit numberOfLines={1}>
        {value.toLocaleString()}
      </Text>
      <Text style={{ color: c.silverDim, fontSize: 11, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function Op({ children }: { children: string }) {
  return <Text style={{ color: c.silverFaint, fontSize: 16, fontWeight: "700", marginTop: -12 }}>{children}</Text>;
}

function Stat({ icon, color, label, value }: { icon: Parameters<typeof Icon>[0]["name"]; color: string; label: string; value: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Icon name={icon} size={15} color={color} />
      <View>
        <Label style={{ fontSize: 12 }}>{label}</Label>
        <Text style={{ color: c.white, fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{value.toLocaleString()}</Text>
      </View>
    </View>
  );
}

function Macro({ label, value, goal, reach }: { label: string; value: number; goal: number; reach?: boolean }) {
  const pct = goal ? value / goal : 0;
  const color = reach ? reachColor(pct) : limitColor(pct);
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Label>{label}</Label>
      <Text style={{ color: c.white, fontWeight: "800", fontSize: 16, fontVariant: ["tabular-nums"] }}>
        {value}
        <Text style={{ color: c.silverDim, fontWeight: "500", fontSize: 13 }}> / {goal}g</Text>
      </Text>
      <Bar value={pct} color={color} height={6} />
    </View>
  );
}

function AddRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, opacity: pressed ? 0.6 : 1 })}>
      <Icon name="plus.circle.fill" size={18} color={c.blueBright} />
      <Text style={{ color: c.blueBright, fontWeight: "700", fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}
