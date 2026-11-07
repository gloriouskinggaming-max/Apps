import { CATEGORY_BY_ID } from "./categories";
import { isoDate } from "./format";
import type { Transaction } from "./types";

export interface RecurringSeries {
  key: string;
  name: string;
  amount: number; // average, positive = charge, negative = income
  frequency: "weekly" | "biweekly" | "monthly" | "yearly";
  lastDate: string;
  nextDate: string;
  categoryId: string;
  count: number;
}

const DAY = 86_400_000;
const toTime = (iso: string) => new Date(iso + "T12:00:00").getTime();

/**
 * Finds subscriptions, bills and paychecks: the same merchant charging a
 * similar amount on a regular schedule.
 */
export function detectRecurring(
  transactions: Transaction[],
  merchantKey: (t: Transaction) => string,
  categoryOf: (t: Transaction) => string,
): RecurringSeries[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (CATEGORY_BY_ID[categoryOf(t)]?.kind === "transfer") continue;
    const key = merchantKey(t);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const result: RecurringSeries[] = [];
  for (const [key, txs] of groups) {
    if (txs.length < 2) continue;
    txs.sort((a, b) => a.date.localeCompare(b.date));
    const amounts = txs.map((t) => t.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    // Amounts must be consistent (within 20% of the average).
    if (amounts.some((a) => Math.abs(a - avg) > Math.abs(avg) * 0.2)) continue;

    const gaps: number[] = [];
    for (let i = 1; i < txs.length; i++) gaps.push((toTime(txs[i].date) - toTime(txs[i - 1].date)) / DAY);
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const frequency =
      avgGap >= 5 && avgGap <= 9 ? "weekly" : avgGap >= 12 && avgGap <= 17 ? "biweekly" : avgGap >= 25 && avgGap <= 35 ? "monthly" : avgGap >= 350 && avgGap <= 380 ? "yearly" : null;
    if (!frequency) continue;
    // Gaps must be regular too.
    if (gaps.some((g) => Math.abs(g - avgGap) > Math.max(5, avgGap * 0.25))) continue;

    const last = txs[txs.length - 1];
    const next = new Date(toTime(last.date) + Math.round(avgGap) * DAY);
    result.push({
      key,
      name: last.merchantName ?? last.name,
      amount: Math.round(avg * 100) / 100,
      frequency,
      lastDate: last.date,
      nextDate: isoDate(next),
      categoryId: categoryOf(last),
      count: txs.length,
    });
  }
  return result.sort((a, b) => a.nextDate.localeCompare(b.nextDate));
}
