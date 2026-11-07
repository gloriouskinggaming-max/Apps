import { useMemo, useState } from "react";
import { ScrollView, SectionList, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TransactionRow } from "../../components/TransactionRow";
import { Chip, EmptyState, Icon } from "../../components/ui";
import { CATEGORY_BY_ID } from "../../lib/categories";
import { dayLabel, fmtMoney } from "../../lib/format";
import { useStore } from "../../lib/store";
import { useTheme } from "../../lib/theme";

type Filter = "all" | "spending" | "income" | "pending";

export default function Transactions() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { data, categoryOf, syncing, refresh } = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const groups = new Map<string, typeof data.transactions>();
    for (const tx of data.transactions) {
      const kind = CATEGORY_BY_ID[categoryOf(tx)]?.kind ?? "expense";
      if (filter === "spending" && kind !== "expense") continue;
      if (filter === "income" && kind !== "income") continue;
      if (filter === "pending" && !tx.pending) continue;
      if (q) {
        const hay = `${tx.merchantName ?? ""} ${tx.name} ${CATEGORY_BY_ID[categoryOf(tx)]?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      if (!groups.has(tx.date)) groups.set(tx.date, []);
      groups.get(tx.date)!.push(tx);
    }
    return [...groups.entries()].map(([date, items]) => ({
      date,
      data: items,
      total: items.reduce((s, x) => s + x.amount, 0),
    }));
  }, [data.transactions, categoryOf, query, filter]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={(tx) => tx.transactionId}
        stickySectionHeadersEnabled={false}
        refreshing={syncing}
        onRefresh={refresh}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
            <Text style={{ fontSize: 34, fontWeight: "800", letterSpacing: -0.6, color: t.text, marginBottom: 12 }}>Transactions</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.card, borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
              <Icon name="magnifyingglass" size={16} color={t.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search merchants or categories"
                placeholderTextColor={t.textFaint}
                clearButtonMode="while-editing"
                style={{ flex: 1, color: t.text, fontSize: 16 }}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
              {(["all", "spending", "income", "pending"] as Filter[]).map((f) => (
                <Chip key={f} label={f[0].toUpperCase() + f.slice(1)} active={filter === f} onPress={() => setFilter(f)} />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="tray"
            title="No transactions"
            message={data.transactions.length ? "Nothing matches your search." : "Link a bank from the Accounts tab to see transactions here."}
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16, marginBottom: 6, paddingHorizontal: 4 }}>
            <Text style={{ color: t.textMuted, fontWeight: "600", fontSize: 13, textTransform: "uppercase" }}>{dayLabel(section.date)}</Text>
            <Text style={{ color: t.textMuted, fontWeight: "600", fontSize: 13, fontVariant: ["tabular-nums"] }}>
              {fmtMoney(-section.total)}
            </Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={{
              backgroundColor: t.card,
              paddingHorizontal: 16,
              borderTopLeftRadius: index === 0 ? 18 : 0,
              borderTopRightRadius: index === 0 ? 18 : 0,
              borderBottomLeftRadius: index === section.data.length - 1 ? 18 : 0,
              borderBottomRightRadius: index === section.data.length - 1 ? 18 : 0,
            }}
          >
            <TransactionRow tx={item} last={index === section.data.length - 1} />
          </View>
        )}
      />
    </View>
  );
}
