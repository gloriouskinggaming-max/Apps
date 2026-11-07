import { router } from "expo-router";
import { ActionSheetIOS, Alert, Text, View } from "react-native";
import { Bar, Button, Card, IconBadge, Label, Row, Screen, SectionHeader } from "../../components/ui";
import { addDays, oneRepMax, prettyDate, today } from "../../lib/nutrition";
import { useStore } from "../../lib/store";
import { c, reachColor } from "../../lib/theme";

export default function Workouts() {
  const { data, deleteWorkout } = useStore();
  const profile = data.profile!;
  const weekStart = addDays(today(), -6);
  const thisWeek = data.workouts.filter((w) => w.date >= weekStart);
  const cardioThisWeek = Object.entries(data.diary)
    .filter(([d]) => d >= weekStart)
    .flatMap(([, day]) => day.exercise.filter((e) => !e.workoutId));
  const sessions = thisWeek.length + new Set(cardioThisWeek.map((e) => e.id)).size;
  const burnedThisWeek = Object.entries(data.diary)
    .filter(([d]) => d >= weekStart)
    .reduce((s, [, day]) => s + day.exercise.reduce((x, e) => x + e.calories, 0), 0);
  const pct = sessions / profile.workoutsPerWeek;

  // Personal records: best estimated 1RM per exercise.
  const prs: Record<string, { orm: number; weight: number; reps: number; date: string }> = {};
  for (const w of data.workouts)
    for (const e of w.exercises)
      for (const s of e.sets) {
        const orm = oneRepMax(s.weight, s.reps);
        if (s.weight > 0 && orm > (prs[e.name]?.orm ?? 0)) prs[e.name] = { orm, weight: s.weight, reps: s.reps, date: w.date };
      }
  const topPRs = Object.entries(prs).sort((a, b) => b[1].orm - a[1].orm).slice(0, 6);

  const manage = (id: string, name: string) =>
    ActionSheetIOS.showActionSheetWithOptions({ title: name, options: ["Cancel", "Repeat this workout", "Edit", "Delete"], cancelButtonIndex: 0, destructiveButtonIndex: 3 }, (i) => {
      if (i === 1) router.push({ pathname: "/workout", params: { template: id } });
      if (i === 2) router.push({ pathname: "/workout", params: { id } });
      if (i === 3)
        Alert.alert(`Delete ${name}?`, undefined, [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteWorkout(id) },
        ]);
    });

  return (
    <Screen title="Workouts" subtitle="Train">
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Label>This week</Label>
            <Text style={{ color: c.white, fontSize: 30, fontWeight: "900" }}>
              {sessions}
              <Text style={{ color: c.silverDim, fontSize: 18 }}> / {profile.workoutsPerWeek} sessions</Text>
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Label>Earned back</Label>
            <Text style={{ color: c.green, fontSize: 24, fontWeight: "900" }}>+{burnedThisWeek.toLocaleString()}</Text>
          </View>
        </View>
        <Bar value={pct} color={reachColor(pct)} height={10} />
      </Card>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <Button title="Strength" icon="dumbbell.fill" onPress={() => router.push("/workout")} style={{ flex: 1 }} />
        <Button title="Cardio" icon="figure.run" variant="secondary" onPress={() => router.push("/cardio")} style={{ flex: 1 }} />
      </View>

      {topPRs.length ? (
        <>
          <SectionHeader title="Personal records" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {topPRs.map(([name, pr]) => (
              <Card key={name} style={{ width: "48%", flexGrow: 1, padding: 14, gap: 4 }}>
                <Text numberOfLines={1} style={{ color: c.silver, fontWeight: "700" }}>{name}</Text>
                <Text style={{ color: c.white, fontSize: 22, fontWeight: "900" }}>{pr.weight} lb × {pr.reps}</Text>
                <Label style={{ color: c.green, fontSize: 12 }}>Est. 1RM {pr.orm} lb</Label>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title="History" />
      <Card style={{ paddingVertical: 4 }}>
        {data.workouts.length === 0 ? <Text style={{ color: c.silverDim, paddingVertical: 14 }}>Your strength workouts will show up here.</Text> : null}
        {data.workouts.slice(0, 30).map((w, i, arr) => {
          const sets = w.exercises.reduce((s, e) => s + e.sets.length, 0);
          const volume = w.exercises.reduce((s, e) => s + e.sets.reduce((v, x) => v + x.reps * x.weight, 0), 0);
          return (
            <Row
              key={w.id}
              last={i === arr.length - 1}
              onPress={() => manage(w.id, w.name)}
              left={<IconBadge name="dumbbell.fill" color={c.blueBright} />}
              title={w.name}
              subtitle={`${prettyDate(w.date)} · ${w.exercises.length} exercises · ${sets} sets · ${w.minutes} min`}
              right={<Text style={{ color: c.silver, fontWeight: "700" }}>{volume.toLocaleString()} lb</Text>}
            />
          );
        })}
      </Card>
    </Screen>
  );
}
