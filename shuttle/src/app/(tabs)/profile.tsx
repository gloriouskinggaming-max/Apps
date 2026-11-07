import { router } from "expo-router";
import { Alert, Text, View } from "react-native";
import { Button, Card, IconBadge, Label, Row, Screen, SectionHeader } from "../../components/ui";
import { useStore } from "../../lib/store";
import { c } from "../../lib/theme";

const GOAL_LABEL = { lose: "Lose weight", maintain: "Maintain weight", gain: "Gain weight" };

export default function ProfileTab() {
  const { user, data, signOut, deleteAccount } = useStore();
  const p = data.profile!;
  const initials = (user?.name ?? "?").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const totalWorkouts = data.workouts.length;
  const daysLogged = Object.values(data.diary).filter((d) => d.food.length).length;

  return (
    <Screen title="Profile">
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.blueDeep, borderWidth: 2, borderColor: c.blue, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: c.white, fontSize: 24, fontWeight: "900" }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.white, fontSize: 20, fontWeight: "800" }}>{user?.name}</Text>
          <Text style={{ color: c.silverDim }}>{user?.email}</Text>
        </View>
      </Card>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <Mini label="Days logged" value={daysLogged} />
        <Mini label="Workouts" value={totalWorkouts} />
        <Mini label="Weigh-ins" value={data.weights.length} />
      </View>

      <SectionHeader title="Goals" />
      <Card style={{ paddingVertical: 4 }}>
        <Row left={<IconBadge name="target" color={c.green} size={32} />} title={GOAL_LABEL[p.goal]} subtitle={p.goal === "maintain" ? undefined : `${p.rate} lb per week · goal ${p.goalWeightLb} lb`} />
        <Row left={<IconBadge name="flame.fill" color={c.blueBright} size={32} />} title={`${p.calorieGoal.toLocaleString()} calories / day`} subtitle={`P ${p.proteinGoal}g · C ${p.carbsGoal}g · F ${p.fatGoal}g`} />
        <Row left={<IconBadge name="drop.fill" color={c.blueBright} size={32} />} title={`${p.waterGoal} cups of water`} />
        <Row last left={<IconBadge name="dumbbell.fill" color={c.silver} size={32} />} title={`${p.workoutsPerWeek} workouts / week`} />
      </Card>
      <Button title="Edit goals" icon="slider.horizontal.3" variant="secondary" onPress={() => router.push("/goals")} style={{ marginTop: 12 }} />

      <SectionHeader title="Account" />
      <Button title="Log out" icon="rectangle.portrait.and.arrow.right" variant="secondary" onPress={signOut} />
      <Button
        title="Delete account"
        icon="trash"
        variant="danger"
        style={{ marginTop: 10 }}
        onPress={() =>
          Alert.alert("Delete account?", "This permanently erases your account and all your logs from this iPhone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: deleteAccount },
          ])
        }
      />
    </Screen>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <Card style={{ flex: 1, padding: 12, alignItems: "center", gap: 2 }}>
      <Text style={{ color: c.white, fontSize: 22, fontWeight: "900" }}>{value}</Text>
      <Label style={{ fontSize: 12 }}>{label}</Label>
    </Card>
  );
}
