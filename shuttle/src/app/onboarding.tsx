import { KeyboardAvoidingView, ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileForm } from "../components/ProfileForm";
import { useStore } from "../lib/store";
import { c } from "../lib/theme";

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { user, saveProfile } = useStore();
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: c.green, fontWeight: "800", letterSpacing: 1.2, fontSize: 13 }}>WELCOME{user ? `, ${user.name.toUpperCase()}` : ""}</Text>
        <Text style={{ color: c.white, fontSize: 32, fontWeight: "900", letterSpacing: -0.8, marginTop: 4 }}>Let's set your goals</Text>
        <Text style={{ color: c.silverDim, fontSize: 15, marginTop: 6, marginBottom: 24 }}>We use this to calculate your daily calories and macros. You can change it anytime.</Text>
        <ProfileForm name={user?.name ?? ""} submitLabel="Start tracking" onSubmit={saveProfile} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
