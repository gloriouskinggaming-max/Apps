import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Field, Icon } from "../components/ui";
import { useStore } from "../lib/store";
import { c } from "../lib/theme";

export default function Login() {
  const insets = useSafeAreaInsets();
  const { signIn } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (e) {
      Alert.alert("Couldn't log in", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: insets.top + 40, justifyContent: "space-between" }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", gap: 14 }}>
          <View style={{ width: 88, height: 88, borderRadius: 26, backgroundColor: c.blueDeep, borderWidth: 1, borderColor: c.blue, alignItems: "center", justifyContent: "center" }}>
            <Icon name="bolt.heart.fill" size={44} color={c.green} />
          </View>
          <Text style={{ color: c.white, fontSize: 40, fontWeight: "900", letterSpacing: -1 }}>Shuttle</Text>
          <Text style={{ color: c.silverDim, fontSize: 16, textAlign: "center" }}>Track food, workouts and progress — all in one place.</Text>
        </View>

        <View style={{ gap: 14, marginTop: 40 }}>
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry textContentType="password" onSubmitEditing={submit} />
          <Button title={busy ? "Logging in…" : "Log in"} onPress={submit} disabled={busy || !email || !password} style={{ marginTop: 6 }} />
          <Button title="Create an account" variant="secondary" onPress={() => router.push("/signup")} />
          <Text style={{ color: c.silverFaint, fontSize: 12, textAlign: "center", marginTop: 6 }}>Your account and data are stored securely on this iPhone.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
