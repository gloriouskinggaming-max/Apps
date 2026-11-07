import * as Haptics from "expo-haptics";
import { ActionSheetIOS, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Button, Card, EmptyState, Muted, ProgressBar } from "../components/ui";
import { fmtMoneyWhole, monthKey, monthLabel } from "../lib/format";
import { useStore, type Goal } from "../lib/store";
import { useTheme } from "../lib/theme";

const COLORS = ["#10B981", "#0EA5E9", "#8B5CF6", "#F97316", "#EC4899", "#F59E0B"];

const parse = (v?: string) => Number((v ?? "").replace(/[^0-9.]/g, ""));

/** Months left until targetDate, and how much to save each month to hit it. */
function monthlyNeeded(g: Goal) {
  if (!g.targetDate) return null;
  const [ty, tm] = g.targetDate.split("-").map(Number);
  const [cy, cm] = monthKey(new Date()).split("-").map(Number);
  const months = Math.max(1, (ty - cy) * 12 + (tm - cm));
  return Math.max(0, (g.target - g.saved) / months);
}

export default function Goals() {
  const t = useTheme();
  const { prefs, saveGoal, removeGoal } = useStore();

  const create = () => {
    Alert.prompt("New goal", "What are you saving for?", (name) => {
      if (!name?.trim()) return;
      Alert.prompt("Target amount", undefined, (amount) => {
        const target = parse(amount);
        if (!target) return;
        saveGoal({ id: String(Date.now()), name: name.trim(), target, saved: 0, color: COLORS[prefs.goals.length % COLORS.length] });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, "plain-text", "", "decimal-pad");
    });
  };

  const manage = (g: Goal) => {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: g.name, options: ["Cancel", "Add money", "Withdraw money", "Change target", "Set target date", "Delete goal"], cancelButtonIndex: 0, destructiveButtonIndex: 5 },
      (i) => {
        const promptAmount = (title: string, apply: (n: number) => Goal) =>
          Alert.prompt(title, undefined, (v) => {
            const n = parse(v);
            if (n > 0) saveGoal(apply(n));
          }, "plain-text", "", "decimal-pad");
        if (i === 1) promptAmount("Add money", (n) => ({ ...g, saved: g.saved + n }));
        if (i === 2) promptAmount("Withdraw money", (n) => ({ ...g, saved: Math.max(0, g.saved - n) }));
        if (i === 3) promptAmount("New target", (n) => ({ ...g, target: n }));
        if (i === 4)
          Alert.prompt("Target date", "Format: YYYY-MM (e.g. 2027-06). Leave empty to clear.", (v) => {
            const val = (v ?? "").trim();
            if (!val) saveGoal({ ...g, targetDate: undefined });
            else if (/^\d{4}-\d{2}$/.test(val)) saveGoal({ ...g, targetDate: val });
          }, "plain-text", g.targetDate ?? "");
        if (i === 5) removeGoal(g.id);
      },
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }}>
      {prefs.goals.length === 0 ? <EmptyState icon="flag.checkered" title="No goals yet" message="Set a savings goal like an emergency fund, a trip or a new car." /> : null}
      {prefs.goals.map((g) => {
        const pct = g.target ? g.saved / g.target : 0;
        const needed = monthlyNeeded(g);
        return (
          <Pressable key={g.id} onPress={() => manage(g)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: t.text, fontSize: 18, fontWeight: "700" }}>{g.name}</Text>
                <Text style={{ color: g.color, fontWeight: "700" }}>{Math.round(pct * 100)}%</Text>
              </View>
              <ProgressBar value={pct} color={g.color} height={12} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Muted>
                  <Text style={{ color: t.text, fontWeight: "600" }}>{fmtMoneyWhole(g.saved)}</Text> of {fmtMoneyWhole(g.target)}
                </Muted>
                {g.targetDate ? <Muted>by {monthLabel(g.targetDate)}</Muted> : null}
              </View>
              {needed !== null && g.saved < g.target ? <Muted>Save {fmtMoneyWhole(needed)}/month to stay on track</Muted> : null}
            </Card>
          </Pressable>
        );
      })}
      <Button title="New goal" icon="plus" onPress={create} />
    </ScrollView>
  );
}
