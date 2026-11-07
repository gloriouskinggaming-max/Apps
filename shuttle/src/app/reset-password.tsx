import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, Text } from "react-native";
import { Button, Field } from "../components/ui";
import { sendPasswordReset } from "../lib/auth";
import { useStore } from "../lib/store";
import { c } from "../lib/theme";

export default function ResetPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { resetPassword } = useStore();
  const [email, setEmail] = useState(params.email ?? "");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const attempt = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert("Something went wrong", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: c.silverDim, fontSize: 16, marginBottom: 8 }}>
          {sent ? `Enter the 6-digit code we emailed to ${email.trim()} and choose a new password.` : "We'll email you a code to reset your password."}
        </Text>
        <Field label="Email" value={email} onChangeText={setEmail} editable={!sent} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" />
        {sent ? (
          <>
            <Field label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" placeholder="123456" />
            <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" placeholder="At least 8 characters" />
            {/* On success the user is signed in and the router moves to the app. */}
            <Button title={busy ? "Saving…" : "Set new password"} disabled={busy || !code || !password} onPress={() => attempt(() => resetPassword(email, code, password))} />
            <Button title="Resend code" variant="ghost" disabled={busy} onPress={() => attempt(() => sendPasswordReset(email))} />
          </>
        ) : (
          <Button title={busy ? "Sending…" : "Send code"} disabled={busy || !email} onPress={() => attempt(async () => { await sendPasswordReset(email); setSent(true); })} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
