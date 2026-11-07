import { NativeTabs } from "expo-router/native-tabs";
import { useTheme } from "../../lib/theme";

export default function TabsLayout() {
  const t = useTheme();
  return (
    <NativeTabs tintColor={t.accent} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="accounts">
        <NativeTabs.Trigger.Label>Accounts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "building.columns", selected: "building.columns.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="transactions">
        <NativeTabs.Trigger.Label>Transactions</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet.rectangle" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cashflow">
        <NativeTabs.Trigger.Label>Cash Flow</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.xaxis" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="budgets">
        <NativeTabs.Trigger.Label>Budget</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "target", selected: "target" }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
