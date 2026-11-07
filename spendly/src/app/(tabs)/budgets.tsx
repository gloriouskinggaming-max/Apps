import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { MonthPicker } from "../../components/MonthPicker";
import { Card, IconBadge, Muted, ProgressBar, Screen, SectionHeader } from "../../components/ui";
import { CATEGORIES, type Category } from "../../lib/categories";
import { fmtMoneyWhole, monthKey } from "../../lib/format";
import { useMonthSummary, useStore } from "../../lib/store";
import { useTheme } from "../../lib/theme";

export default function Budgets() {
  const t = useTheme();
  const { prefs, setBudget } = useStore();
  const [month, setMonth] = useState(monthKey(new Date()));
  const { byCategory } = useMonthSummary(month);

  const expense = CATEGORIES.filter((c) => c.kind === "expense");
  const budgeted = expense.filter((c) => prefs.budgets[c.id]);
  const unbudgeted = expense.filter((c) => !prefs.budgets[c.id]);
  const totalBudget = budgeted.reduce((s, c) => s + prefs.budgets[c.id], 0);
  const totalSpent = budgeted.reduce((s, c) => s + Math.max(0, byCategory[c.id] ?? 0), 0);

  const edit = (cat: Category) => {
    Haptics.selectionAsync();
    Alert.prompt(
      cat.name,
      "Monthly budget (leave empty to remove)",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: (value?: string) => {
            const n = Number((value ?? "").replace(/[^0-9.]/g, ""));
            setBudget(cat.id, n > 0 ? n : null);
          },
        },
      ],
      "plain-text",
      prefs.budgets[cat.id] ? String(prefs.budgets[cat.id]) : "",
      "decimal-pad",
    );
  };

  const color = (pct: number) => (pct > 1 ? t.danger : pct > 0.85 ? t.warning : t.accent);

  return (
    <Screen title="Budgets">
      <MonthPicker month={month} onChange={setMonth} />
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Muted>Spent</Muted>
            <Text style={{ color: t.text, fontSize: 28, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{fmtMoneyWhole(totalSpent)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Muted>Budgeted</Muted>
            <Text style={{ color: t.textMuted, fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{fmtMoneyWhole(totalBudget)}</Text>
          </View>
        </View>
        <ProgressBar value={totalBudget ? totalSpent / totalBudget : 0} color={color(totalBudget ? totalSpent / totalBudget : 0)} height={10} />
      </Card>

      <SectionHeader title="Categories" />
      <Card style={{ gap: 18 }}>
        {budgeted.length === 0 ? <Muted>Tap a category below to set your first budget.</Muted> : null}
        {budgeted.map((cat) => {
          const spent = Math.max(0, byCategory[cat.id] ?? 0);
          const limit = prefs.budgets[cat.id];
          const pct = spent / limit;
          return (
            <Pressable key={cat.id} onPress={() => edit(cat)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, gap: 8 })}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <IconBadge name={cat.icon} color={cat.color} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontWeight: "600", fontSize: 16 }}>{cat.name}</Text>
                  <Muted>
                    {spent <= limit ? `${fmtMoneyWhole(limit - spent)} left` : `${fmtMoneyWhole(spent - limit)} over`}
                  </Muted>
                </View>
                <Text style={{ color: t.text, fontVariant: ["tabular-nums"], fontWeight: "600" }}>
                  {fmtMoneyWhole(spent)} <Text style={{ color: t.textMuted, fontWeight: "400" }}>/ {fmtMoneyWhole(limit)}</Text>
                </Text>
              </View>
              <ProgressBar value={pct} color={color(pct)} />
            </Pressable>
          );
        })}
      </Card>

      {unbudgeted.length ? (
        <>
          <SectionHeader title="Not budgeted" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {unbudgeted.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => edit(cat)}
                style={({ pressed }) => ({
                  width: "48%",
                  flexGrow: 1,
                  backgroundColor: t.card,
                  borderRadius: 16,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <IconBadge name={cat.icon} color={cat.color} size={30} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: t.text, fontWeight: "500" }}>{cat.name}</Text>
                  <Muted>{fmtMoneyWhole(Math.max(0, byCategory[cat.id] ?? 0))} spent</Muted>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
