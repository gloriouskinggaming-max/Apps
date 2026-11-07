import * as Crypto from "expo-crypto";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";
import { Button, Field } from "../components/ui";
import { useStore } from "../lib/store";
import { c } from "../lib/theme";
import type { Food } from "../lib/types";

export default function CustomFood() {
  const { date, meal, barcode } = useLocalSearchParams<{ date: string; meal: string; barcode?: string }>();
  const { saveCustomFood } = useStore();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [serving, setServing] = useState("1 serving");
  const [cal, setCal] = useState("");
  const [p, setP] = useState("");
  const [carb, setCarb] = useState("");
  const [fat, setFat] = useState("");

  const save = () => {
    const food: Food = {
      id: `custom-${Crypto.randomUUID()}`,
      name: name.trim(),
      brand: brand.trim() || undefined,
      serving: serving.trim() || "1 serving",
      calories: Number(cal) || 0,
      protein: Number(p) || 0,
      carbs: Number(carb) || 0,
      fat: Number(fat) || 0,
      barcode,
    };
    saveCustomFood(food);
    router.replace({ pathname: "/log-food", params: { date, meal, food: JSON.stringify(food) } });
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Field label="Food name" value={name} onChangeText={setName} placeholder="e.g. Mom's lasagna" />
        <Field label="Brand (optional)" value={brand} onChangeText={setBrand} />
        <Field label="Serving size" value={serving} onChangeText={setServing} />
        <Field label="Calories" value={cal} onChangeText={setCal} keyboardType="number-pad" placeholder="0" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Protein (g)" value={p} onChangeText={setP} keyboardType="decimal-pad" placeholder="0" /></View>
          <View style={{ flex: 1 }}><Field label="Carbs (g)" value={carb} onChangeText={setCarb} keyboardType="decimal-pad" placeholder="0" /></View>
          <View style={{ flex: 1 }}><Field label="Fat (g)" value={fat} onChangeText={setFat} keyboardType="decimal-pad" placeholder="0" /></View>
        </View>
        <Button title="Save food" onPress={save} disabled={!name.trim() || !cal} style={{ marginTop: 8 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
