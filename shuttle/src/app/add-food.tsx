import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Icon, Segmented } from "../components/ui";
import { BUILTIN_FOODS, searchOnline } from "../lib/foods";
import { useStore } from "../lib/store";
import { c } from "../lib/theme";
import type { Food } from "../lib/types";

type Tab = "all" | "recent" | "mine";

export default function AddFood() {
  const { date, meal } = useLocalSearchParams<{ date: string; meal: string }>();
  const { data } = useStore();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [online, setOnline] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced online search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3 || tab !== "all") {
      setOnline([]);
      return;
    }
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      searchOnline(q)
        .then(setOnline)
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
    }, 450);
    return () => clearTimeout(timer);
  }, [query, tab]);

  const local = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = tab === "recent" ? data.recentFoods : tab === "mine" ? data.customFoods : [...data.customFoods, ...BUILTIN_FOODS];
    return q ? source.filter((f) => `${f.name} ${f.brand ?? ""}`.toLowerCase().includes(q)) : source;
  }, [query, tab, data.recentFoods, data.customFoods]);

  const results = [...local, ...online.filter((o) => !local.some((l) => l.id === o.id))];

  const open = (food: Food) => router.push({ pathname: "/log-food", params: { date, meal, food: JSON.stringify(food) } });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.surfaceHi, borderRadius: 14, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, height: 46 }}>
          <Icon name="magnifyingglass" size={16} color={c.silverDim} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search foods & brands"
            placeholderTextColor={c.silverFaint}
            autoFocus
            clearButtonMode="while-editing"
            returnKeyType="search"
            style={{ flex: 1, color: c.white, fontSize: 16 }}
          />
          {loading ? <ActivityIndicator color={c.blue} /> : null}
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <QuickAction icon="barcode.viewfinder" label="Scan" onPress={() => router.push({ pathname: "/scan", params: { date, meal } })} />
          <QuickAction icon="square.and.pencil" label="Create food" onPress={() => router.push({ pathname: "/custom-food", params: { date, meal } })} />
        </View>
        <Segmented value={tab} onChange={setTab} options={[{ value: "all", label: "All" }, { value: "recent", label: "Recent" }, { value: "mine", label: "My foods" }]} />
        {error ? <Text style={{ color: c.yellow, fontSize: 13 }}>{error}</Text> : null}
      </View>
      <FlatList
        data={results}
        keyExtractor={(f) => f.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={{ color: c.silverDim, textAlign: "center", marginTop: 30 }}>
            {tab === "recent" ? "Foods you log will show up here." : tab === "mine" ? "Foods you create will show up here." : "No matches. Try another search or create a food."}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: c.border, opacity: pressed ? 0.6 : 1, gap: 12 })}>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: c.white, fontSize: 16, fontWeight: "600" }}>{item.name}</Text>
              <Text numberOfLines={1} style={{ color: c.silverDim, fontSize: 13, marginTop: 2 }}>
                {[item.brand, item.serving, `P ${item.protein}g · C ${item.carbs}g · F ${item.fat}g`].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <Text style={{ color: c.white, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{item.calories}</Text>
            <Icon name="plus.circle.fill" size={22} color={c.blueBright} />
          </Pressable>
        )}
      />
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", height: 46, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.7 : 1 })}>
      <Icon name={icon} size={18} color={c.green} />
      <Text style={{ color: c.silver, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
