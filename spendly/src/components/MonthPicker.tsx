import * as Haptics from "expo-haptics";
import { Pressable, Text, View } from "react-native";
import { monthKey, monthLabel, shiftMonth } from "../lib/format";
import { useTheme } from "../lib/theme";
import { Icon } from "./ui";

export function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const t = useTheme();
  const isCurrent = month === monthKey(new Date());
  const go = (d: number) => {
    Haptics.selectionAsync();
    onChange(shiftMonth(month, d));
  };
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: t.card,
        borderRadius: 14,
        paddingHorizontal: 6,
        height: 44,
        marginBottom: 16,
      }}
    >
      <Pressable hitSlop={10} onPress={() => go(-1)} style={{ padding: 8 }}>
        <Icon name="chevron.left" size={16} color={t.accent} />
      </Pressable>
      <Text style={{ color: t.text, fontWeight: "600", fontSize: 16 }}>{monthLabel(month)}</Text>
      <Pressable hitSlop={10} disabled={isCurrent} onPress={() => go(1)} style={{ padding: 8, opacity: isCurrent ? 0.3 : 1 }}>
        <Icon name="chevron.right" size={16} color={t.accent} />
      </Pressable>
    </View>
  );
}
