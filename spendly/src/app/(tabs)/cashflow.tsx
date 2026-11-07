import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Card, IconBadge, Muted, Screen, SectionHeader } from "../../components/ui";
import { CATEGORY_BY_ID } from "../../lib/categories";
import { fmtMoneyWhole, monthKey, shiftMonth } from "../../lib/format";
import { useStore } from "../../lib/store";
import { useTheme } from "../../lib/theme";

const MONTHS = 6;

export default function CashFlow() {
  const t = useTheme();
  const { data, prefs, categoryOf, syncing, refresh } = useStore();
  const current = monthKey(new Date());
  const [selected, setSelected] = useState(current);

  const months = useMemo(() => {
    const keys = Array.from({ length: MONTHS }, (_, i) => shiftMonth(current, i - (MONTHS - 1)));
    const map = Object.fromEntries(
      keys.map((k) => [k, { income: 0, expense: 0, incomeBy: {} as Record<string, number>, expenseBy: {} as Record<string, number> }]),
    );
    for (const tx of data.transactions) {
      const m = map[tx.date.slice(0, 7)];
      if (!m || prefs.overrides[tx.transactionId]?.hidden) continue;
      const cat = CATEGORY_BY_ID[categoryOf(tx)] ?? CATEGORY_BY_ID.other;
      if (cat.kind === "transfer") continue;
      if (cat.kind === "income") {
        m.income += -tx.amount;
        const k = tx.merchantName ?? tx.name;
        m.incomeBy[k] = (m.incomeBy[k] ?? 0) + -tx.amount;
      } else {
        m.expense += tx.amount;
        m.expenseBy[cat.id] = (m.expenseBy[cat.id] ?? 0) + tx.amount;
      }
    }
    return keys.map((k) => ({ key: k, ...map[k] }));
  }, [data.transactions, prefs.overrides, categoryOf, current]);

  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const sel = months.find((m) => m.key === selected) ?? months[months.length - 1];
  const savings = sel.income - sel.expense;
  const savingsRate = sel.income > 0 ? savings / sel.income : 0;
  const BAR_H = 140;

  return (
    <Screen title="Cash Flow" onRefresh={refresh} refreshing={syncing}>
      <Card>
        <View style={{ flexDirection: "row", gap: 16, marginBottom: 14 }}>
          <Legend color={t.income} label="Income" />
          <Legend color="#F97316" label="Expenses" />
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: BAR_H + 24 }}>
          {months.map((m) => {
            const active = m.key === sel.key;
            return (
              <Pressable key={m.key} onPress={() => setSelected(m.key)} style={{ alignItems: "center", flex: 1, opacity: active ? 1 : 0.45 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: BAR_H }}>
                  <View style={{ width: 12, height: Math.max(3, (m.income / max) * BAR_H), borderRadius: 4, backgroundColor: t.income }} />
                  <View style={{ width: 12, height: Math.max(3, (m.expense / max) * BAR_H), borderRadius: 4, backgroundColor: "#F97316" }} />
                </View>
                <Text style={{ color: active ? t.text : t.textMuted, fontSize: 12, fontWeight: "600", marginTop: 6 }}>
                  {new Date(m.key + "-15").toLocaleDateString("en-US", { month: "short" })}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <Summary label="Income" value={fmtMoneyWhole(sel.income)} color={t.income} />
        <Summary label="Expenses" value={fmtMoneyWhole(sel.expense)} color="#F97316" />
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <Summary label="Total savings" value={fmtMoneyWhole(savings)} color={savings >= 0 ? t.income : t.danger} />
        <Summary label="Savings rate" value={`${Math.round(savingsRate * 100)}%`} color={savingsRate >= 0.2 ? t.income : savingsRate >= 0 ? t.warning : t.danger} />
      </View>

      <SectionHeader title="Income" />
      <Card style={{ gap: 12 }}>
        {Object.entries(sel.incomeBy).length === 0 ? <Muted>No income this month.</Muted> : null}
        {Object.entries(sel.incomeBy)
          .sort((a, b) => b[1] - a[1])
          .map(([name, amt]) => (
            <Breakdown key={name} icon="dollarsign.circle.fill" color={t.income} name={name} amount={amt} total={sel.income} />
          ))}
      </Card>

      <SectionHeader title="Expenses" />
      <Card style={{ gap: 12 }}>
        {Object.entries(sel.expenseBy).length === 0 ? <Muted>No expenses this month.</Muted> : null}
        {Object.entries(sel.expenseBy)
          .filter(([, v]) => v > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([id, amt]) => {
            const c = CATEGORY_BY_ID[id];
            return <Breakdown key={id} icon={c.icon} color={c.color} name={c.name} amount={amt} total={sel.expense} />;
          })}
      </Card>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color: t.textMuted, fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function Summary({ label, value, color }: { label: string; value: string; color: string }) {
  const t = useTheme();
  return (
    <Card style={{ flex: 1, padding: 14, gap: 6 }}>
      <Muted>{label}</Muted>
      <Text style={{ color, fontSize: 22, fontWeight: "700", fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <View style={{ height: 0, backgroundColor: t.border }} />
    </Card>
  );
}

function Breakdown({ icon, color, name, amount, total }: { icon: Parameters<typeof IconBadge>[0]["name"]; color: string; name: string; amount: number; total: number }) {
  const t = useTheme();
  const pct = total ? amount / total : 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <IconBadge name={icon} color={color} size={32} />
      <View style={{ flex: 1, gap: 5 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text numberOfLines={1} style={{ color: t.text, fontWeight: "500", flex: 1 }}>{name}</Text>
          <Text style={{ color: t.text, fontWeight: "600", fontVariant: ["tabular-nums"] }}>
            {fmtMoneyWhole(amount)} <Text style={{ color: t.textMuted, fontWeight: "400" }}>{Math.round(pct * 100)}%</Text>
          </Text>
        </View>
        <View style={{ height: 5, borderRadius: 5, backgroundColor: t.track }}>
          <View style={{ width: `${Math.min(1, pct) * 100}%`, height: 5, borderRadius: 5, backgroundColor: color }} />
        </View>
      </View>
    </View>
  );
}
