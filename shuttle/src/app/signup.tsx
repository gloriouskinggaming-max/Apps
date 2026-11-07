import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, Text } from "react-native";
import { Button, Field } from "../components/ui";
import { useStore } from "../lib/store";
import { c } from "../lib/theme";

export default function SignUp() {
  const { signUp } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const result = await signUp(name, email, password);
      if (result === "confirm-email") {
        Alert.alert("Check your email", `We sent a confirmation link to ${email.trim()}. Tap it, then come back and log in.`, [
          { text: "OK", onPress: () => router.back() },
        ]);
        setBusy(false);
      }
    } catch (e) {
      Alert.alert("Couldn't create account", (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: c.silverDim, fontSize: 16, marginBottom: 8 }}>Set up your account, then we'll build your daily calorie and macro goals.</Text>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" textContentType="name" autoComplete="name" />
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" autoComplete="email" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry textContentType="newPassword" />
        <Button title={busy ? "Creating…" : "Continue"} onPress={submit} disabled={busy || !name || !email || !password} style={{ marginTop: 8 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
