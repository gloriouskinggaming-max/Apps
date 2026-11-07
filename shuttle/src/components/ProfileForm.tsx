import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { computeGoals } from "../lib/nutrition";
import { c } from "../lib/theme";
import type { Activity, GoalType, Profile, Sex } from "../lib/types";
import { Button, Card, Field, Label, Segmented } from "./ui";

const ACTIVITIES: { value: Activity; label: string; detail: string }[] = [
  { value: "sedentary", label: "Low", detail: "Desk job, little exercise" },
  { value: "light", label: "Light", detail: "Exercise 1–3 days/week" },
  { value: "moderate", label: "Active", detail: "Exercise 3–5 days/week" },
  { value: "very", label: "Athlete", detail: "Hard exercise 6–7 days/week" },
];

/** Shared by onboarding and the "Edit goals" screen. */
export function ProfileForm({ initial, name, submitLabel, onSubmit }: { initial?: Profile | null; name: string; submitLabel: string; onSubmit: (p: Profile) => void }) {
  const [sex, setSex] = useState<Sex>(initial?.sex ?? "male");
  const [age, setAge] = useState(String(initial?.age ?? ""));
  const [feet, setFeet] = useState(initial ? String(Math.floor(initial.heightIn / 12)) : "");
  const [inches, setInches] = useState(initial ? String(Math.round(initial.heightIn % 12)) : "");
  const [weight, setWeight] = useState(String(initial?.weightLb ?? ""));
  const [goalWeight, setGoalWeight] = useState(String(initial?.goalWeightLb ?? ""));
  const [activity, setActivity] = useState<Activity>(initial?.activity ?? "light");
  const [goal, setGoal] = useState<GoalType>(initial?.goal ?? "lose");
  const [rate, setRate] = useState(String(initial?.rate ?? 1));
  const [water, setWater] = useState(String(initial?.waterGoal ?? 8));
  const [workouts, setWorkouts] = useState(String(initial?.workoutsPerWeek ?? 4));

  const heightIn = Number(feet) * 12 + Number(inches || 0);
  const valid = Number(age) > 12 && heightIn > 48 && Number(weight) > 60;
  const goals = useMemo(
    () => (valid ? computeGoals({ sex, age: Number(age), heightIn, weightLb: Number(weight), activity, goal, rate: Number(rate) || 0 }) : null),
    [valid, sex, age, heightIn, weight, activity, goal, rate],
  );

  const submit = () => {
    if (!goals) return;
    onSubmit({
      name,
      sex,
      age: Number(age),
      heightIn,
      weightLb: Number(weight),
      goalWeightLb: Number(goalWeight) || Number(weight),
      activity,
      goal,
      rate: goal === "maintain" ? 0 : Number(rate) || 0,
      calorieGoal: goals.calorieGoal,
      proteinGoal: goals.proteinGoal,
      carbsGoal: goals.carbsGoal,
      fatGoal: goals.fatGoal,
      waterGoal: Number(water) || 8,
      workoutsPerWeek: Number(workouts) || 3,
    });
  };

  return (
    <View style={{ gap: 16 }}>
      <Label>Sex (for calorie math)</Label>
      <Segmented value={sex} onChange={setSex} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="30" /></View>
        <View style={{ flex: 1 }}><Field label="Height (ft)" value={feet} onChangeText={setFeet} keyboardType="number-pad" placeholder="5" /></View>
        <View style={{ flex: 1 }}><Field label="(in)" value={inches} onChangeText={setInches} keyboardType="number-pad" placeholder="10" /></View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Weight (lb)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="180" /></View>
        <View style={{ flex: 1 }}><Field label="Goal weight (lb)" value={goalWeight} onChangeText={setGoalWeight} keyboardType="decimal-pad" placeholder="165" /></View>
      </View>

      <Label>Activity level</Label>
      <Segmented value={activity} onChange={setActivity} options={ACTIVITIES.map(({ value, label }) => ({ value, label }))} />
      <Text style={{ color: c.silverDim, fontSize: 13, marginTop: -8 }}>{ACTIVITIES.find((a) => a.value === activity)?.detail}</Text>

      <Label>Goal</Label>
      <Segmented value={goal} onChange={setGoal} options={[{ value: "lose", label: "Lose" }, { value: "maintain", label: "Maintain" }, { value: "gain", label: "Gain" }]} />
      {goal !== "maintain" ? (
        <Segmented
          value={rate}
          onChange={setRate}
          options={["0.5", "1", "1.5", "2"].map((r) => ({ value: r, label: `${r} lb/wk` }))}
        />
      ) : null}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Water goal (cups)" value={water} onChangeText={setWater} keyboardType="number-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Workouts / week" value={workouts} onChangeText={setWorkouts} keyboardType="number-pad" /></View>
      </View>

      {goals ? (
        <Card style={{ borderColor: c.blue, backgroundColor: c.blueDeep + "66", gap: 10 }}>
          <Label style={{ color: c.green }}>YOUR DAILY PLAN</Label>
          <Text style={{ color: c.white, fontSize: 34, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
            {goals.calorieGoal.toLocaleString()} <Text style={{ fontSize: 18, color: c.silver }}>cal</Text>
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Macro label="Protein" value={goals.proteinGoal} />
            <Macro label="Carbs" value={goals.carbsGoal} />
            <Macro label="Fat" value={goals.fatGoal} />
          </View>
          <Text style={{ color: c.silverDim, fontSize: 12 }}>Maintenance ≈ {goals.tdee.toLocaleString()} cal/day (Mifflin-St Jeor).</Text>
        </Card>
      ) : null}

      <Button title={submitLabel} onPress={submit} disabled={!goals} />
    </View>
  );
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <View>
      <Text style={{ color: c.white, fontSize: 20, fontWeight: "800" }}>{value}g</Text>
      <Text style={{ color: c.silverDim, fontSize: 13 }}>{label}</Text>
    </View>
  );
}
