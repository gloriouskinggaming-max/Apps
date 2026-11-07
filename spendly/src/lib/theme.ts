import { useColorScheme } from "react-native";

const light = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  cardAlt: "#F7F7FA",
  text: "#0B0B0F",
  textMuted: "#6B6B76",
  textFaint: "#A1A1AA",
  border: "rgba(60,60,67,0.12)",
  accent: "#10B981",
  accentSoft: "rgba(16,185,129,0.12)",
  income: "#10B981",
  expense: "#0B0B0F",
  danger: "#EF4444",
  warning: "#F59E0B",
  track: "rgba(120,120,128,0.16)",
  heroFrom: "#0F766E",
  heroText: "#FFFFFF",
};

const dark: typeof light = {
  bg: "#000000",
  card: "#1C1C1E",
  cardAlt: "#2C2C2E",
  text: "#F5F5F7",
  textMuted: "#A1A1AA",
  textFaint: "#6B6B76",
  border: "rgba(84,84,88,0.45)",
  accent: "#34D399",
  accentSoft: "rgba(52,211,153,0.16)",
  income: "#34D399",
  expense: "#F5F5F7",
  danger: "#F87171",
  warning: "#FBBF24",
  track: "rgba(120,120,128,0.32)",
  heroFrom: "#134E4A",
  heroText: "#FFFFFF",
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
