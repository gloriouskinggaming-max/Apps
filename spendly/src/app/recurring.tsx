import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { Card, EmptyState, IconBadge, Muted, Row, SectionHeader } from "../components/ui";
import { CATEGORY_BY_ID } from "../lib/categories";
import { dayLabel, fmtMoney, fmtMoneyWhole } from "../lib/format";
import { detectRecurring } from "../lib/recurring";
import { useStore } from "../lib/store";
import { useTheme } from "../lib/theme";

const PER_MONTH = { weekly: 52 / 12, biweekly: 26 / 12, monthly: 1, yearly: 1 / 12 } as const;

export default function Recurring() {
  const t = useTheme();
  const { data, merchantKey, categoryOf } = useStore();
  const series = useMemo(() => detectRecurring(data.transactions, merchantKey, categoryOf), [data.transactions, merchantKey, categoryOf]);
  const bills = series.filter((s) => s.amount > 0);
  const income = series.filter((s) => s.amount < 0);
  const monthlyBills = bills.reduce((sum, s) => sum + s.amount * PER_MONTH[s.frequency], 0);
  const monthlyIncome = income.reduce((sum, s) => sum + -s.amount * PER_MONTH[s.frequency], 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Card style={{ flex: 1, gap: 4 }}>
          <Muted>Bills / month</Muted>
          <Text style={{ color: t.text, fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{fmtMoneyWhole(monthlyBills)}</Text>
        </Card>
        <Card style={{ flex: 1, gap: 4 }}>
          <Muted>Income / month</Muted>
          <Text style={{ color: t.income, fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{fmtMoneyWhole(monthlyIncome)}</Text>
        </Card>
      </View>

      {series.length === 0 ? (
        <View style={{ marginTop: 16 }}>
          <EmptyState icon="repeat" title="Nothing recurring yet" message="Once a few months of transactions sync, subscriptions, bills and paychecks show up here automatically." />
        </View>
      ) : null}

      {[
        { title: "Upcoming bills & subscriptions", list: bills },
        { title: "Recurring income", list: income },
      ].map(({ title, list }) =>
        list.length ? (
          <View key={title}>
            <SectionHeader title={title} />
            <Card style={{ paddingVertical: 4 }}>
              {list.map((s, i) => {
                const cat = CATEGORY_BY_ID[s.categoryId] ?? CATEGORY_BY_ID.other;
                return (
                  <Row
                    key={s.key}
                    last={i === list.length - 1}
                    left={<IconBadge name={cat.icon} color={cat.color} />}
                    title={s.name}
                    subtitle={`${s.frequency[0].toUpperCase() + s.frequency.slice(1)} · next ${dayLabel(s.nextDate)}`}
                    right={
                      <Text style={{ color: s.amount < 0 ? t.income : t.text, fontWeight: "600", fontVariant: ["tabular-nums"] }}>
                        {fmtMoney(Math.abs(s.amount))}
                      </Text>
                    }
                  />
                );
              })}
            </Card>
          </View>
        ) : null,
      )}
    </ScrollView>
  );
}
