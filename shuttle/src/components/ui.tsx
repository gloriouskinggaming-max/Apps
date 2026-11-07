import * as Haptics from "expo-haptics";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { c, radius } from "../lib/theme";

export type IconName = SymbolViewProps["name"];

export function Icon({ name, size = 20, color = c.white }: { name: IconName; size?: number; color?: string }) {
  return <SymbolView name={name} size={size} tintColor={color} weight="semibold" />;
}

export function Screen({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 120 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ color: c.silverDim, fontSize: 13, fontWeight: "600" }, style]}>{children}</Text>;
}

export function Big({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ color: c.white, fontSize: 26, fontWeight: "800", fontVariant: ["tabular-nums"] }, style]}>{children}</Text>;
}

export function Bar({ value, color, height = 8 }: { value: number; color: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: c.track, overflow: "hidden" }}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

/** Circular progress ring. */
export function Ring({ value, color, size = 180, stroke = 16, children }: { value: number; color: string; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.7" />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
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
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = { primary: c.blue, secondary: c.surfaceHi, ghost: "transparent", danger: "rgba(255,77,94,0.12)" }[variant];
  const fg = { primary: c.white, secondary: c.silver, ghost: c.blueBright, danger: c.red }[variant];
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        variant === "secondary" && { borderWidth: 1, borderColor: c.border },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={17} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 17, fontWeight: "700" }}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ name, onPress, color = c.silver }: { name: IconName; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.6 : 1 }]}>
      <Icon name={name} size={17} color={color} />
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      {label ? <Label>{label}</Label> : null}
      <TextInput placeholderTextColor={c.silverFaint} {...rest} style={[styles.field, style]} />
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(o.value);
            }}
            style={[styles.segmentItem, active && { backgroundColor: c.blue }]}
          >
            <Text style={{ color: active ? c.white : c.silverDim, fontWeight: "700", fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ left, title, subtitle, right, onPress, last }: { left?: ReactNode; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
        {left}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: c.white, fontSize: 16, fontWeight: "600" }}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={{ color: c.silverDim, fontSize: 13, marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </Pressable>
  );
}

export function IconBadge({ name, color = c.blueBright, size = 36 }: { name: IconName; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}>
      <Icon name={name} size={size * 0.5} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 16, gap: 8 },
  title: { fontSize: 34, fontWeight: "900", letterSpacing: -0.8, color: c.white },
  subtitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, color: c.green, marginBottom: 2 },
  card: { backgroundColor: c.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: c.border, borderCurve: "continuous" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 10 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: c.white, letterSpacing: -0.3 },
  button: { height: 54, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderCurve: "continuous" },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceHi, borderWidth: 1, borderColor: c.border },
  field: { backgroundColor: c.surfaceHi, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: 14, height: 50, color: c.white, fontSize: 16 },
  segment: { flexDirection: "row", backgroundColor: c.surfaceHi, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: c.border },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
});
