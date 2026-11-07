import { router } from "expo-router";
import { KeyboardAvoidingView, ScrollView } from "react-native";
import { ProfileForm } from "../components/ProfileForm";
import { useStore } from "../lib/store";
import { c } from "../lib/theme";

export default function EditGoals() {
  const { data, user, saveProfile } = useStore();
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <ProfileForm
          initial={data.profile}
          name={user?.name ?? ""}
          submitLabel="Save goals"
          onSubmit={(p) => {
            saveProfile(p);
            router.back();
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
