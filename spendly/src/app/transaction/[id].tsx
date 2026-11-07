import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Card, IconBadge, Muted, Row, SectionHeader } from "../../components/ui";
import { CATEGORIES, CATEGORY_BY_ID } from "../../lib/categories";
import { dayLabel, fmtMoney } from "../../lib/format";
import { useStore } from "../../lib/store";
import { useTheme } from "../../lib/theme";

export default function TransactionDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, prefs, categoryOf, setCategory, setOverride, merchantKey } = useStore();
  const tx = data.transactions.find((x) => x.transactionId === id);
  const [applyToAll, setApplyToAll] = useState(false);

  if (!tx) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.bg }}>
        <Muted>Transaction not found.</Muted>
      </View>
    );
  }

  const override = prefs.overrides[tx.transactionId] ?? {};
  const current = categoryOf(tx);
  const cat = CATEGORY_BY_ID[current] ?? CATEGORY_BY_ID.other;
  const account = data.accounts.find((a) => a.accountId === tx.accountId);
  const isIn = tx.amount < 0;
  const hasRule = !!prefs.merchantRules[merchantKey(tx)];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <View style={{ alignItems: "center", paddingVertical: 16, gap: 8 }}>
        <IconBadge name={cat.icon} color={cat.color} size={64} />
        <Text style={{ color: t.text, fontSize: 20, fontWeight: "700", textAlign: "center" }}>{tx.merchantName ?? tx.name}</Text>
        <Text style={{ color: isIn ? t.income : t.text, fontSize: 40, fontWeight: "800", letterSpacing: -1, fontVariant: ["tabular-nums"] }}>
          {isIn ? "+" : ""}
          {fmtMoney(Math.abs(tx.amount))}
        </Text>
        <Muted>
          {dayLabel(tx.date)}
          {tx.pending ? " · Pending" : ""}
        </Muted>
      </View>

      <Card style={{ paddingVertical: 4 }}>
        <Row title="Account" right={<Muted>{account ? `${account.name}${account.mask ? ` ••${account.mask}` : ""}` : "—"}</Muted>} />
        <Row title="Bank description" right={<Muted style={{ maxWidth: 200 }}>{tx.name}</Muted>} />
        <Row
          last
          title="Hide from budgets & reports"
          right={<Switch value={!!override.hidden} onValueChange={(v) => setOverride(tx.transactionId, { hidden: v })} />}
        />
      </Card>

      <SectionHeader title="Notes" />
      <Card>
        <TextInput
          defaultValue={override.note}
          onEndEditing={(e) => setOverride(tx.transactionId, { note: e.nativeEvent.text })}
          placeholder="Add a note"
          placeholderTextColor={t.textFaint}
          multiline
          style={{ color: t.text, fontSize: 16, minHeight: 44 }}
        />
      </Card>

      <SectionHeader title="Category" />
      <Card style={{ paddingVertical: 4, marginBottom: 12 }}>
        <Row
          last
          title={`Always use for “${tx.merchantName ?? tx.name}”`}
          subtitle={hasRule ? "A rule exists for this merchant" : "Creates a rule for future transactions"}
          right={<Switch value={applyToAll} onValueChange={setApplyToAll} />}
        />
      </Card>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {CATEGORIES.map((c) => {
          const selected = c.id === current;
          return (
            <Pressable
              key={c.id}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setCategory(tx, c.id, applyToAll);
                router.back();
              }}
              style={({ pressed }) => ({
                width: "31%",
                flexGrow: 1,
                alignItems: "center",
                gap: 6,
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: selected ? c.color + "22" : t.card,
                borderWidth: 2,
                borderColor: selected ? c.color : "transparent",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <IconBadge name={c.icon} color={c.color} size={34} />
              <Text numberOfLines={1} style={{ color: t.text, fontSize: 12, fontWeight: "600", paddingHorizontal: 4 }}>
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
