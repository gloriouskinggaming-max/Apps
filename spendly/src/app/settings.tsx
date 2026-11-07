import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Button, Card, IconBadge, Muted, Row, SectionHeader } from "../components/ui";
import { CATEGORY_BY_ID } from "../lib/categories";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { useTheme } from "../lib/theme";

export default function Settings() {
  const t = useTheme();
  const { prefs, apiKey, setMode, setServer, refresh, resetAll, removeRule } = useStore();
  const rules = Object.entries(prefs.merchantRules);
  const [url, setUrl] = useState(prefs.serverUrl);
  const [key, setKey] = useState(apiKey);
  const [testing, setTesting] = useState(false);

  const save = async () => {
    setTesting(true);
    try {
      const health = await api.health({ url, apiKey: key });
      await api.data({ url, apiKey: key }); // verifies the API key
      await setServer(url, key);
      setMode("live");
      Alert.alert("Connected", `Your server is running (Plaid ${health.env}).`);
      refresh();
    } catch (e) {
      Alert.alert("Couldn't connect", (e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  const input = { color: t.text, fontSize: 16, paddingVertical: 12 } as const;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <SectionHeader title="Data source" />
      <View style={{ flexDirection: "row", backgroundColor: t.card, borderRadius: 14, padding: 4 }}>
        {(["demo", "live"] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: prefs.mode === m ? t.accent : "transparent" }}
          >
            <Text style={{ color: prefs.mode === m ? "#fff" : t.text, fontWeight: "600" }}>{m === "demo" ? "Demo data" : "My banks"}</Text>
          </Pressable>
        ))}
      </View>
      <Muted style={{ marginTop: 8 }}>
        Demo data lets you try everything without linking a bank. Switch to “My banks” after setting up your server below.
      </Muted>

      <SectionHeader title="Your server" />
      <Card style={{ paddingVertical: 4 }}>
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="https://your-server.example.com"
          placeholderTextColor={t.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={[input, { borderBottomWidth: 0.5, borderBottomColor: t.border }]}
        />
        <TextInput
          value={key}
          onChangeText={setKey}
          placeholder="APP_API_KEY from the server's .env"
          placeholderTextColor={t.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={input}
        />
      </Card>
      <Muted style={{ marginTop: 8 }}>
        The server keeps your Plaid keys and bank tokens off your phone. The API key is stored in the iPhone Keychain.
      </Muted>
      <Button title={testing ? "Connecting…" : "Save & connect"} icon="link" onPress={save} disabled={testing || !url} style={{ marginTop: 16 }} />

      <SectionHeader title="Rules" />
      <Card style={{ paddingVertical: 4 }}>
        {rules.length === 0 ? (
          <Muted style={{ paddingVertical: 12 }}>Turn on “Always use for this merchant” when recategorizing a transaction to create a rule.</Muted>
        ) : null}
        {rules.map(([merchant, catId], i) => {
          const cat = CATEGORY_BY_ID[catId] ?? CATEGORY_BY_ID.other;
          return (
            <Row
              key={merchant}
              last={i === rules.length - 1}
              left={<IconBadge name={cat.icon} color={cat.color} size={30} />}
              title={merchant}
              subtitle={`→ ${cat.name}`}
              onPress={() =>
                Alert.alert("Delete rule?", `Stop auto-categorizing “${merchant}”.`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => removeRule(merchant) },
                ])
              }
            />
          );
        })}
      </Card>

      <SectionHeader title="Danger zone" />
      <Button
        title="Reset all app data"
        variant="danger"
        icon="trash"
        onPress={() =>
          Alert.alert("Reset everything?", "Budgets, rules, goals and cached data on this phone will be erased.", [
            { text: "Cancel", style: "cancel" },
            { text: "Reset", style: "destructive", onPress: resetAll },
          ])
        }
      />
    </ScrollView>
  );
}
