import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Icon } from "../components/ui";
import { lookupBarcode } from "../lib/foods";
import { useStore } from "../lib/store";
import { c } from "../lib/theme";

export default function Scan() {
  const insets = useSafeAreaInsets();
  const { date, meal } = useLocalSearchParams<{ date: string; meal: string }>();
  const { data } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const handled = useRef(false);

  const onScan = async (code: string) => {
    if (handled.current) return;
    handled.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBusy(true);
    try {
      const food = data.customFoods.find((f) => f.barcode === code) ?? (await lookupBarcode(code));
      if (food) {
        router.replace({ pathname: "/log-food", params: { date, meal, food: JSON.stringify(food) } });
      } else {
        Alert.alert("Not found", "This barcode isn't in the food database yet. Create it and it'll be remembered next time.", [
          { text: "Scan again", onPress: () => (handled.current = false) },
          { text: "Create food", onPress: () => router.replace({ pathname: "/custom-food", params: { date, meal, barcode: code } }) },
        ]);
      }
    } catch {
      Alert.alert("No connection", "Couldn't look up that barcode.", [{ text: "OK", onPress: () => (handled.current = false) }]);
    } finally {
      setBusy(false);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: "center", gap: 16 }}>
        <Icon name="barcode.viewfinder" size={56} color={c.blueBright} />
        <Text style={{ color: c.white, fontSize: 24, fontWeight: "800" }}>Scan barcodes</Text>
        <Text style={{ color: c.silverDim, fontSize: 16 }}>Allow camera access to scan packaged food and log it instantly.</Text>
        <Button title="Allow camera" onPress={requestPermission} />
        <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
        onBarcodeScanned={busy ? undefined : ({ data: code }) => onScan(code)}
      />
      <View pointerEvents="none" style={{ position: "absolute", top: "35%", left: 40, right: 40, height: 160, borderRadius: 24, borderWidth: 3, borderColor: c.green }} />
      <View style={{ position: "absolute", top: insets.top + 12, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="xmark" size={16} color={c.white} />
        </Pressable>
        <Text style={{ color: c.white, fontWeight: "700", fontSize: 16 }}>Point at a barcode</Text>
        <View style={{ width: 40 }} />
      </View>
      {busy ? (
        <View style={{ position: "absolute", bottom: insets.bottom + 40, alignSelf: "center" }}>
          <ActivityIndicator color={c.green} size="large" />
        </View>
      ) : null}
    </View>
  );
}
