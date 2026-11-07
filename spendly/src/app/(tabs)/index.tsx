import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MonthPicker } from "../../components/MonthPicker";
import { TransactionRow } from "../../components/TransactionRow";
import { Card, Icon, IconBadge, IconButton, Muted, ProgressBar, Screen, SectionHeader } from "../../components/ui";
import { CATEGORY_BY_ID } from "../../lib/categories";
import { dayLabel, fmtMoney, fmtMoneyWhole, monthKey, shiftMonth } from "../../lib/format";
import { detectRecurring } from "../../lib/recurring";
import { useMonthSummary, useStore } from "../../lib/store";
import { useTheme } from "../../lib/theme";

export default function Overview() {
  const t = useTheme();
  const { data, prefs, syncing, refresh, merchantKey, categoryOf } = useStore();
  const [month, setMonth] = useState(monthKey(new Date()));
  const summary = useMonthSummary(month);
  const lastMonth = useMonthSummary(shiftMonth(month, -1));
  const upcoming = useMemo(
    () => detectRecurring(data.transactions, merchantKey, categoryOf).filter((s) => s.amount > 0).slice(0, 4),
    [data.transactions, merchantKey, categoryOf],
  );

  const totalBudget = Object.values(prefs.budgets).reduce((a, b) => a + b, 0);
  const cash = data.accounts.filter((a) => a.type === "depository").reduce((s, a) => s + (a.currentBalance ?? 0), 0);
  const debt = data.accounts
    .filter((a) => a.type === "credit" || a.type === "loan")
    .reduce((s, a) => s + (a.currentBalance ?? 0), 0);
  const topCategories = Object.entries(summary.byCategory)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCat = topCategories[0]?.[1] ?? 1;
  const budgetPct = totalBudget ? summary.spent / totalBudget : 0;
  const barColor = budgetPct > 1 ? t.danger : budgetPct > 0.85 ? t.warning : "#FFFFFF";

  return (
    <Screen
      title="Spendly"
      subtitle={prefs.mode === "demo" ? "Demo data" : undefined}
      right={<IconButton name="gearshape.fill" onPress={() => router.push("/settings")} />}
      onRefresh={refresh}
      refreshing={syncing}
    >
      <MonthPicker month={month} onChange={setMonth} />

      {/* Hero card */}
      <View style={{ backgroundColor: t.heroFrom, borderRadius: 24, padding: 20, borderCurve: "continuous" }}>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: "600" }}>Spent this month</Text>
        <Text style={{ color: t.heroText, fontSize: 40, fontWeight: "800", letterSpacing: -1, marginTop: 4, fontVariant: ["tabular-nums"] }}>
          {fmtMoney(summary.spent)}
        </Text>
        {totalBudget > 0 ? (
          <>
            <View style={{ marginTop: 16 }}>
              <View style={{ height: 10, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
                <View style={{ width: `${Math.min(1, budgetPct) * 100}%`, height: 10, borderRadius: 10, backgroundColor: barColor }} />
              </View>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 10, fontSize: 14 }}>
              {summary.spent <= totalBudget
                ? `${fmtMoneyWhole(totalBudget - summary.spent)} left of ${fmtMoneyWhole(totalBudget)} budget`
                : `${fmtMoneyWhole(summary.spent - totalBudget)} over your ${fmtMoneyWhole(totalBudget)} budget`}
            </Text>
          </>
        ) : null}
        {lastMonth.spent > 0 ? (
          <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 4, fontSize: 13 }}>
            {summary.spent <= lastMonth.spent ? "▼" : "▲"} {fmtMoneyWhole(Math.abs(summary.spent - lastMonth.spent))} vs last month
          </Text>
        ) : null}
      </View>

      {/* Income / net */}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <Stat label="Income" value={fmtMoneyWhole(summary.income)} icon="arrow.down.left" color={t.income} />
        <Stat
          label="Net"
          value={(summary.net >= 0 ? "+" : "") + fmtMoneyWhole(summary.net)}
          icon="plusminus"
          color={summary.net >= 0 ? t.income : t.danger}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <Stat label="Cash" value={fmtMoneyWhole(cash)} icon="banknote.fill" color="#3B82F6" />
        <Stat label="Debt" value={fmtMoneyWhole(debt)} icon="creditcard.fill" color="#F97316" />
      </View>

      <SectionHeader
        title="Top spending"
        action={
          <Pressable onPress={() => router.push("/budgets")}>
            <Text style={{ color: t.accent, fontWeight: "600" }}>Budgets</Text>
          </Pressable>
        }
      />
      <Card style={{ gap: 14 }}>
        {topCategories.length === 0 ? <Muted>No spending this month yet.</Muted> : null}
        {topCategories.map(([id, amount]) => {
          const cat = CATEGORY_BY_ID[id];
          return (
            <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <IconBadge name={cat.icon} color={cat.color} size={32} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: t.text, fontWeight: "500" }}>{cat.name}</Text>
                  <Text style={{ color: t.text, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{fmtMoneyWhole(amount)}</Text>
                </View>
                <ProgressBar value={amount / maxCat} color={cat.color} height={6} />
              </View>
            </View>
          );
        })}
      </Card>

      <SectionHeader
        title="Upcoming bills"
        action={
          <Pressable onPress={() => router.push("/recurring")}>
            <Text style={{ color: t.accent, fontWeight: "600" }}>All recurring</Text>
          </Pressable>
        }
      />
      <Card style={{ paddingVertical: 4 }}>
        {upcoming.length === 0 ? <Muted style={{ paddingVertical: 12 }}>No recurring bills detected yet.</Muted> : null}
        {upcoming.map((s, i) => {
          const cat = CATEGORY_BY_ID[s.categoryId] ?? CATEGORY_BY_ID.other;
          return (
            <View key={s.key} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: i === upcoming.length - 1 ? 0 : 0.5, borderBottomColor: t.border }}>
              <IconBadge name={cat.icon} color={cat.color} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: "500" }} numberOfLines={1}>{s.name}</Text>
                <Muted>{dayLabel(s.nextDate)}</Muted>
              </View>
              <Text style={{ color: t.text, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{fmtMoney(s.amount)}</Text>
            </View>
          );
        })}
      </Card>

      <SectionHeader
        title="Goals"
        action={
          <Pressable onPress={() => router.push("/goals")}>
            <Text style={{ color: t.accent, fontWeight: "600" }}>Manage</Text>
          </Pressable>
        }
      />
      <Card style={{ gap: 14 }}>
        {prefs.goals.length === 0 ? <Muted>Set a savings goal to track it here.</Muted> : null}
        {prefs.goals.slice(0, 3).map((g) => (
          <View key={g.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: t.text, fontWeight: "600" }}>{g.name}</Text>
              <Muted>
                {fmtMoneyWhole(g.saved)} / {fmtMoneyWhole(g.target)}
              </Muted>
            </View>
            <ProgressBar value={g.saved / g.target} color={g.color} />
          </View>
        ))}
      </Card>

      <SectionHeader
        title="Recent"
        action={
          <Pressable onPress={() => router.push("/transactions")}>
            <Text style={{ color: t.accent, fontWeight: "600" }}>See all</Text>
          </Pressable>
        }
      />
      <Card style={{ paddingVertical: 4 }}>
        {summary.txs.length === 0 ? <Muted style={{ paddingVertical: 12 }}>No transactions this month.</Muted> : null}
        {summary.txs.slice(0, 6).map((tx, i, arr) => (
          <TransactionRow key={tx.transactionId} tx={tx} last={i === arr.length - 1} />
        ))}
      </Card>
    </Screen>
  );
}

function Stat({ label, value, icon, color }: { label: string; value: string; icon: Parameters<typeof Icon>[0]["name"]; color: string }) {
  const t = useTheme();
  return (
    <Card style={{ flex: 1, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name={icon} size={13} color={color} />
        <Text style={{ color: t.textMuted, fontSize: 13, fontWeight: "600" }}>{label}</Text>
      </View>
      <Text style={{ color: t.text, fontSize: 22, fontWeight: "700", fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Card>
  );
}
