import { router } from "expo-router";
import { Text } from "react-native";
import { CATEGORY_BY_ID } from "../lib/categories";
import { fmtMoney } from "../lib/format";
import { useStore } from "../lib/store";
import { useTheme } from "../lib/theme";
import type { Transaction } from "../lib/types";
import { IconBadge, Row } from "./ui";

export function TransactionRow({ tx, last, showDate }: { tx: Transaction; last?: boolean; showDate?: boolean }) {
  const t = useTheme();
  const { categoryOf, prefs } = useStore();
  const cat = CATEGORY_BY_ID[categoryOf(tx)] ?? CATEGORY_BY_ID.other;
  const hidden = prefs.overrides[tx.transactionId]?.hidden;
  const isIn = tx.amount < 0;
  const subtitle = [cat.name, tx.pending ? "Pending" : null, showDate ? tx.date : null, hidden ? "Hidden" : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <Row
      last={last}
      onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: tx.transactionId } })}
      left={<IconBadge name={cat.icon} color={cat.color} />}
      title={tx.merchantName ?? tx.name}
      subtitle={subtitle}
      right={
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            fontVariant: ["tabular-nums"],
            color: isIn ? t.income : t.expense,
            opacity: hidden ? 0.4 : 1,
          }}
        >
          {isIn ? "+" : ""}
          {fmtMoney(-tx.amount).replace("-", "")}
        </Text>
      }
    />
  );
}
