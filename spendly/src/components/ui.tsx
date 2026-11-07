import * as Haptics from "expo-haptics";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ReactNode } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, space, useTheme } from "../lib/theme";

export type IconName = SymbolViewProps["name"];

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const t = useTheme();
  return <SymbolView name={name} size={size} tintColor={color ?? t.text} weight="semibold" />;
}

/** Scrollable screen with an iOS-style large title. */
export function Screen({
  title,
  subtitle,
  right,
  children,
  onRefresh,
  refreshing = false,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: 120, paddingHorizontal: space.lg }}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
    >
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          {subtitle ? <Text style={[styles.subtitle, { color: t.textMuted }]}>{subtitle}</Text> : null}
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.card }, style]}>{children}</View>;
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: t.text }]}>{title}</Text>
      {action}
    </View>
  );
}

export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: t.track, overflow: "hidden" }}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height, backgroundColor: color ?? t.accent }} />
    </View>
  );
}

export function IconBadge({ name, color, size = 36 }: { name: IconName; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: color + "22",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={name} size={size * 0.5} color={color} />
    </View>
  );
}

export function Button({
  title,
  onPress,
  icon,
  variant = "primary",
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg = variant === "primary" ? t.accent : variant === "danger" ? t.danger + "1A" : t.accentSoft;
  const fg = variant === "primary" ? "#FFFFFF" : variant === "danger" ? t.danger : t.accent;
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={17} color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ name, onPress }: { name: IconName; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: t.card, opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon name={name} size={18} color={t.text} />
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.chip, { backgroundColor: active ? t.text : t.card }]}
    >
      <Text style={{ color: active ? t.bg : t.text, fontWeight: "600", fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Row({
  left,
  title,
  subtitle,
  right,
  onPress,
  last,
}: {
  left?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
        {left}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: t.text, fontSize: 16, fontWeight: "500" }}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={{ color: t.textMuted, fontSize: 13, marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
    </Pressable>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[{ color: t.textMuted, fontSize: 13 }, style]}>{children}</Text>;
}

export function EmptyState({ icon, title, message, action }: { icon: IconName; title: string; message: string; action?: ReactNode }) {
  const t = useTheme();
  return (
    <Card style={{ alignItems: "center", paddingVertical: space.xl * 1.5, gap: space.sm }}>
      <IconBadge name={icon} color={t.accent} size={56} />
      <Text style={{ color: t.text, fontSize: 18, fontWeight: "700", marginTop: space.sm }}>{title}</Text>
      <Text style={{ color: t.textMuted, fontSize: 15, textAlign: "center", lineHeight: 21 }}>{message}</Text>
      {action ? <View style={{ marginTop: space.md, alignSelf: "stretch" }}>{action}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: space.lg, gap: space.sm },
  title: { fontSize: 34, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  card: { borderRadius: radius.lg, padding: space.lg, borderCurve: "continuous" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  button: {
    height: 52,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    borderCurve: "continuous",
  },
  buttonText: { fontSize: 17, fontWeight: "600" },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
});
