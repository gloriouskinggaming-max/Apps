import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StoreProvider } from "../lib/store";
import { useTheme } from "../lib/theme";

export default function RootLayout() {
  const t = useTheme();
  return (
    <StoreProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.accent,
          headerTitleStyle: { color: t.text },
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="transaction/[id]" options={{ presentation: "modal", title: "Transaction" }} />
        <Stack.Screen name="settings" options={{ presentation: "modal", title: "Settings" }} />
        <Stack.Screen name="recurring" options={{ title: "Recurring", headerBackTitle: "Back" }} />
        <Stack.Screen name="goals" options={{ title: "Goals", headerBackTitle: "Back" }} />
      </Stack>
    </StoreProvider>
  );
}
