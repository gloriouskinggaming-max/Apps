import { router } from "expo-router";
import { ActionSheetIOS, Alert, Text, View } from "react-native";
import { Button, Card, EmptyState, Icon, IconBadge, IconButton, Muted, Row, Screen, SectionHeader, type IconName } from "../../components/ui";
import { fmtMoney, fmtMoneyWhole } from "../../lib/format";
import { plaidAvailable } from "../../lib/plaid";
import { useStore } from "../../lib/store";
import { useTheme } from "../../lib/theme";
import type { Account } from "../../lib/types";

const GROUPS: { type: string; title: string; icon: IconName; color: string; liability: boolean }[] = [
  { type: "depository", title: "Cash", icon: "banknote.fill", color: "#3B82F6", liability: false },
  { type: "credit", title: "Credit Cards", icon: "creditcard.fill", color: "#F97316", liability: true },
  { type: "loan", title: "Loans", icon: "building.columns.fill", color: "#8B5CF6", liability: true },
  { type: "other", title: "Other", icon: "square.grid.2x2.fill", color: "#64748B", liability: false },
];

export default function Accounts() {
  const t = useTheme();
  const { data, prefs, syncing, refresh, linkBank, removeBank } = useStore();
  const isDemo = prefs.mode === "demo";

  const assets = data.accounts.filter((a) => a.type === "depository" || a.type === "other").reduce((s, a) => s + (a.currentBalance ?? 0), 0);
  const liabilities = data.accounts.filter((a) => a.type === "credit" || a.type === "loan").reduce((s, a) => s + (a.currentBalance ?? 0), 0);

  const onLink = () => {
    if (isDemo) {
      Alert.alert("You're in demo mode", "Open Settings, switch to “My banks” and enter your server address to link real accounts.", [
        { text: "Not now", style: "cancel" },
        { text: "Open Settings", onPress: () => router.push("/settings") },
      ]);
      return;
    }
    if (!plaidAvailable) {
      Alert.alert("Install the app build", "Bank linking uses Plaid's native SDK, which isn't included in Expo Go. See the README for how to build the app for your iPhone.");
      return;
    }
    linkBank();
  };

  const manageItem = (itemId: string, name: string, hasError: boolean) => {
    if (isDemo) return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: name,
        options: ["Cancel", hasError ? "Reconnect" : "Update login", "Remove bank"],
        cancelButtonIndex: 0,
        destructiveButtonIndex: 2,
      },
      (i) => {
        if (i === 1) linkBank(itemId);
        if (i === 2)
          Alert.alert(`Remove ${name}?`, "Its accounts and transactions will be deleted from your server.", [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: () => removeBank(itemId) },
          ]);
      },
    );
  };

  return (
    <Screen
      title="Accounts"
      right={<IconButton name="gearshape.fill" onPress={() => router.push("/settings")} />}
      onRefresh={refresh}
      refreshing={syncing}
    >
      <Card style={{ gap: 4 }}>
        <Muted>Net worth (excluding investments)</Muted>
        <Text style={{ color: t.text, fontSize: 34, fontWeight: "800", letterSpacing: -0.8, fontVariant: ["tabular-nums"] }}>
          {fmtMoney(assets - liabilities)}
        </Text>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
          <Text style={{ color: t.income, fontWeight: "600" }}>▲ {fmtMoneyWhole(assets)} assets</Text>
          <Text style={{ color: t.danger, fontWeight: "600" }}>▼ {fmtMoneyWhole(liabilities)} debts</Text>
        </View>
      </Card>

      {data.accounts.length === 0 ? (
        <View style={{ marginTop: 16 }}>
          <EmptyState
            icon="building.columns"
            title="Connect your bank"
            message="Securely link checking, savings, credit cards and loans through Plaid. Investment accounts are never imported."
            action={<Button title="Link a bank" icon="plus" onPress={onLink} />}
          />
        </View>
      ) : null}

      {GROUPS.map((g) => {
        const accounts = data.accounts.filter((a) => a.type === g.type);
        if (!accounts.length) return null;
        const total = accounts.reduce((s, a) => s + (a.currentBalance ?? 0), 0);
        return (
          <View key={g.type}>
            <SectionHeader title={g.title} action={<Text style={{ color: t.textMuted, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{fmtMoney(total)}</Text>} />
            <Card style={{ paddingVertical: 4 }}>
              {accounts.map((a, i) => (
                <AccountRow key={a.accountId} account={a} icon={g.icon} color={g.color} liability={g.liability} last={i === accounts.length - 1} />
              ))}
            </Card>
          </View>
        );
      })}

      {data.items.length ? (
        <>
          <SectionHeader title="Connections" />
          <Card style={{ paddingVertical: 4 }}>
            {data.items.map((item, i) => (
              <Row
                key={item.itemId}
                last={i === data.items.length - 1}
                onPress={() => manageItem(item.itemId, item.institutionName, !!item.error)}
                left={<IconBadge name={item.error ? "exclamationmark.triangle.fill" : "checkmark.seal.fill"} color={item.error ? t.danger : t.accent} />}
                title={item.institutionName}
                subtitle={
                  item.error
                    ? item.error === "ITEM_LOGIN_REQUIRED"
                      ? "Login expired — tap to reconnect"
                      : `Sync error: ${item.error}`
                    : item.lastSyncedAt
                      ? `Synced ${new Date(item.lastSyncedAt).toLocaleString()}`
                      : "Not synced yet"
                }
                right={isDemo ? undefined : <Icon name="ellipsis" size={16} color={t.textMuted} />}
              />
            ))}
          </Card>
          <Button title="Link another bank" icon="plus" variant="secondary" onPress={onLink} style={{ marginTop: 16 }} />
        </>
      ) : null}
    </Screen>
  );
}

function AccountRow({ account, icon, color, liability, last }: { account: Account; icon: IconName; color: string; liability: boolean; last: boolean }) {
  const t = useTheme();
  return (
    <Row
      last={last}
      left={<IconBadge name={icon} color={color} />}
      title={account.name}
      subtitle={[account.subtype, account.mask ? `•••• ${account.mask}` : null].filter(Boolean).join(" · ")}
      right={
        <Text style={{ color: liability ? t.danger : t.text, fontWeight: "600", fontSize: 16, fontVariant: ["tabular-nums"] }}>
          {fmtMoney(account.currentBalance ?? 0)}
        </Text>
      }
    />
  );
}
