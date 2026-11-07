import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { StoreProvider, useStore } from "../lib/store";
import { c } from "../lib/theme";

function RootStack() {
  const { ready, user, data } = useStore();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={c.blue} />
      </View>
    );
  }
  const signedIn = !!user;
  const onboarded = !!data.profile;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.blueBright,
        headerTitleStyle: { color: c.white, fontWeight: "700" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ title: "Create account", headerBackTitle: "Back" }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-food" options={{ presentation: "modal", title: "Add food" }} />
        <Stack.Screen name="log-food" options={{ presentation: "formSheet", title: "", sheetAllowedDetents: [0.62, 0.95], sheetGrabberVisible: true }} />
        <Stack.Screen name="custom-food" options={{ presentation: "modal", title: "Create food" }} />
        <Stack.Screen name="scan" options={{ presentation: "fullScreenModal", headerShown: false }} />
        <Stack.Screen name="cardio" options={{ presentation: "modal", title: "Log cardio" }} />
        <Stack.Screen name="workout" options={{ presentation: "fullScreenModal", title: "Workout" }} />
        <Stack.Screen name="goals" options={{ title: "Goals", headerBackTitle: "Back" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <StoreProvider>
      <StatusBar style="light" />
      <RootStack />
    </StoreProvider>
  );
}
