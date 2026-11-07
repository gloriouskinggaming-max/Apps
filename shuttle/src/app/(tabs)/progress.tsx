import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Bar, Button, Card, Label, Screen, SectionHeader, Segmented } from "../../components/ui";
import { addDays, dayTotals, emptyDay, today } from "../../lib/nutrition";
import { useStore } from "../../lib/store";
import { c, limitColor, reachColor } from "../../lib/theme";

type Range = "7" | "30" | "90";

export default function Progress() {
  const { data, logWeight } = useStore();
  const profile = data.profile!;
  const [range, setRange] = useState<Range>("7");
  const days = Number(range);

  const stats = useMemo(() => {
    const list = Array.from({ length: days }, (_, i) => {
      const date = addDays(today(), i - days + 1);
      const log = data.diary[date] ?? emptyDay();
      return { date, logged: log.food.length > 0, water: log.water, ...dayTotals(log) };
    });
    const logged = list.filter((d) => d.logged);
    const avg = (k: "calories" | "protein" | "carbs" | "fat" | "burned") => (logged.length ? Math.round(logged.reduce((s, d) => s + d[k], 0) / logged.length) : 0);
    // Current logging streak (consecutive days with food logged, ending today or yesterday).
    let streak = 0;
    for (let d = data.diary[today()]?.food.length ? today() : addDays(today(), -1); data.diary[d]?.food.length; d = addDays(d, -1)) streak++;
    const onTarget = logged.filter((d) => d.calories <= profile.calorieGoal + d.burned).length;
    const workouts = data.workouts.filter((w) => w.date >= list[0].date).length;
    const burned = list.reduce((s, d) => s + d.burned, 0);
    return { list, logged, avg, streak, onTarget, workouts, burned };
  }, [data.diary, data.workouts, days, profile.calorieGoal]);

  const weights = data.weights.filter((w) => w.date >= addDays(today(), -Math.max(days, 30)));
  const startW = data.weights[0]?.lb ?? profile.weightLb;
  const currentW = data.weights[data.weights.length - 1]?.lb ?? profile.weightLb;
  const toGo = Math.abs(profile.goalWeightLb - currentW);
  const totalChange = Math.abs(profile.goalWeightLb - startW) || 1;
  const goalPct = profile.goal === "maintain" ? 1 : 1 - toGo / totalChange;

  const maxCal = Math.max(profile.calorieGoal * 1.25, ...stats.list.map((d) => d.calories));
  const minW = Math.min(...weights.map((w) => w.lb), profile.goalWeightLb) - 2;
  const maxW = Math.max(...weights.map((w) => w.lb), profile.goalWeightLb) + 2;
  const CH = 130;

  const promptWeight = () =>
    Alert.prompt("Log weight", "Today's weight in lb", (v) => {
      const n = Number(v);
      if (n > 50 && n < 700) logWeight(n);
    }, "plain-text", String(currentW), "decimal-pad");

  return (
    <Screen title="Stats" subtitle="Progress">
      <Segmented value={range} onChange={setRange} options={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }]} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
        <Tile label="Day streak" value={`${stats.streak}🔥`} color={reachColor(stats.streak / 7)} />
        <Tile label="Avg calories" value={stats.avg("calories").toLocaleString()} color={limitColor(stats.avg("calories") / profile.calorieGoal)} />
        <Tile label="On-target days" value={`${stats.onTarget}/${stats.logged.length}`} color={reachColor(stats.logged.length ? stats.onTarget / stats.logged.length : 0)} />
        <Tile label="Avg protein" value={`${stats.avg("protein")}g`} color={reachColor(stats.avg("protein") / profile.proteinGoal)} />
        <Tile label="Workouts" value={String(stats.workouts)} color={reachColor(stats.workouts / ((profile.workoutsPerWeek * days) / 7))} />
        <Tile label="Earned back" value={`+${stats.burned.toLocaleString()}`} color={c.green} />
      </View>

      {/* Weight */}
      <SectionHeader title="Weight" action={<Button title="Log" icon="plus" variant="ghost" onPress={promptWeight} style={{ height: 32 }} />} />
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Label>Current</Label>
            <Text style={{ color: c.white, fontSize: 28, fontWeight: "900" }}>{currentW} lb</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Label>Goal</Label>
            <Text style={{ color: c.silver, fontSize: 20, fontWeight: "800" }}>{profile.goalWeightLb} lb</Text>
            <Text style={{ color: c.silverDim, fontSize: 12 }}>{toGo ? `${toGo.toFixed(1)} lb to go` : "Goal reached!"}</Text>
          </View>
        </View>
        <Bar value={goalPct} color={reachColor(goalPct)} height={10} />
        {weights.length > 1 ? (
          <View style={{ height: CH, flexDirection: "row", alignItems: "flex-end", gap: 3, marginTop: 4 }}>
            {weights.map((w) => (
              <View key={w.date} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: CH }}>
                <View style={{ width: "70%", maxWidth: 16, height: ((w.lb - minW) / (maxW - minW)) * CH, backgroundColor: c.blue, borderRadius: 4, opacity: 0.9 }} />
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: c.silverDim }}>Log your weight regularly to see your trend.</Text>
        )}
        <Text style={{ color: c.silverDim, fontSize: 13 }}>
          {currentW === startW ? "Starting weight" : `${currentW < startW ? "Down" : "Up"} ${Math.abs(currentW - startW).toFixed(1)} lb since you started`}
        </Text>
      </Card>

      {/* Calories per day */}
      <SectionHeader title="Calories" />
      <Card style={{ gap: 10 }}>
        <View style={{ height: CH, flexDirection: "row", alignItems: "flex-end", gap: days > 30 ? 1 : 4 }}>
          {stats.list.map((d) => {
            const allowed = profile.calorieGoal + d.burned;
            return (
              <View key={d.date} style={{ flex: 1, height: CH, justifyContent: "flex-end" }}>
                <View style={{ height: Math.max(2, (d.calories / maxCal) * CH), borderRadius: 3, backgroundColor: d.logged ? limitColor(d.calories / allowed) : c.track }} />
              </View>
            );
          })}
        </View>
        {days === 7 ? (
          <View style={{ flexDirection: "row" }}>
            {stats.list.map((d) => (
              <Text key={d.date} style={{ flex: 1, textAlign: "center", color: c.silverDim, fontSize: 11, fontWeight: "600" }}>
                {new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "narrow" })}
              </Text>
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: "row", gap: 14 }}>
          <Legend color={c.green} label="Under goal" />
          <Legend color={c.yellow} label="Slightly over" />
          <Legend color={c.red} label="Over" />
        </View>
      </Card>

      {/* Macros */}
      <SectionHeader title="Average macros" />
      <Card style={{ gap: 14 }}>
        <MacroRow label="Protein" value={stats.avg("protein")} goal={profile.proteinGoal} reach />
        <MacroRow label="Carbs" value={stats.avg("carbs")} goal={profile.carbsGoal} />
        <MacroRow label="Fat" value={stats.avg("fat")} goal={profile.fatGoal} />
      </Card>
    </Screen>
  );
}

function Tile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card style={{ width: "31%", flexGrow: 1, padding: 12, gap: 6 }}>
      <View style={{ width: 22, height: 4, borderRadius: 2, backgroundColor: color }} />
      <Text style={{ color: c.white, fontSize: 20, fontWeight: "900" }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Label style={{ fontSize: 12 }}>{label}</Label>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color: c.silverDim, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function MacroRow({ label, value, goal, reach }: { label: string; value: number; goal: number; reach?: boolean }) {
  const pct = goal ? value / goal : 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: c.silver, fontWeight: "700" }}>{label}</Text>
        <Text style={{ color: c.white, fontWeight: "800" }}>
          {value}g <Text style={{ color: c.silverDim, fontWeight: "500" }}>/ {goal}g</Text>
        </Text>
      </View>
      <Bar value={pct} color={reach ? reachColor(pct) : limitColor(pct)} />
    </View>
  );
}
