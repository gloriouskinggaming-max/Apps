import { isoDate } from "./format";
import type { BankData, Transaction } from "./types";

/** Realistic fake data so the app can be explored before connecting real banks. */
export function buildDemoData(): BankData {
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const transactions: Transaction[] = [];
  let n = 0;
  const add = (daysAgo: number, name: string, amount: number, primary: string, detailed: string, accountId = "demo-checking") => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    transactions.push({
      transactionId: `demo-${n++}`,
      accountId,
      date: isoDate(d),
      name,
      merchantName: name,
      amount: Math.round(amount * 100) / 100,
      currency: "USD",
      pending: daysAgo < 2,
      plaidCategory: primary,
      plaidDetailed: detailed,
    });
  };

  const spend: [string, number, number, string, string, number][] = [
    // name, min, max, primary, detailed, times per month
    ["Whole Foods", 45, 140, "FOOD_AND_DRINK", "FOOD_AND_DRINK_GROCERIES", 4],
    ["Trader Joe's", 30, 90, "FOOD_AND_DRINK", "FOOD_AND_DRINK_GROCERIES", 3],
    ["Starbucks", 5, 9, "FOOD_AND_DRINK", "FOOD_AND_DRINK_COFFEE", 8],
    ["Chipotle", 11, 18, "FOOD_AND_DRINK", "FOOD_AND_DRINK_FAST_FOOD", 3],
    ["Sushi Palace", 40, 85, "FOOD_AND_DRINK", "FOOD_AND_DRINK_RESTAURANT", 2],
    ["Shell", 35, 60, "TRANSPORTATION", "TRANSPORTATION_GAS", 3],
    ["Uber", 12, 30, "TRANSPORTATION", "TRANSPORTATION_TAXIS_AND_RIDE_SHARES", 2],
    ["Amazon", 15, 120, "GENERAL_MERCHANDISE", "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES", 4],
    ["Target", 20, 95, "GENERAL_MERCHANDISE", "GENERAL_MERCHANDISE_SUPERSTORES", 2],
    ["AMC Theatres", 18, 40, "ENTERTAINMENT", "ENTERTAINMENT_TV_AND_MOVIES_THEATRE", 1],
    ["CVS Pharmacy", 8, 40, "MEDICAL", "MEDICAL_PHARMACIES_AND_SUPPLEMENTS", 1],
  ];

  for (let month = 0; month < 3; month++) {
    const base = month * 30;
    for (const [name, min, max, p, dt, times] of spend) {
      for (let i = 0; i < times; i++) {
        add(base + Math.floor(rand() * 30), name, min + rand() * (max - min), p, dt, rand() > 0.4 ? "demo-credit" : "demo-checking");
      }
    }
    add(base + 1, "Rent - Maple Apartments", 1850, "RENT_AND_UTILITIES", "RENT_AND_UTILITIES_RENT");
    add(base + 5, "City Power & Light", 70 + rand() * 50, "RENT_AND_UTILITIES", "RENT_AND_UTILITIES_GAS_AND_ELECTRICITY");
    add(base + 8, "Verizon", 85, "RENT_AND_UTILITIES", "RENT_AND_UTILITIES_TELEPHONE");
    add(base + 3, "Netflix", 15.49, "ENTERTAINMENT", "ENTERTAINMENT_TV_AND_MOVIES");
    add(base + 12, "Spotify", 11.99, "ENTERTAINMENT", "ENTERTAINMENT_MUSIC_AND_AUDIO", "demo-credit");
    add(base + 10, "Planet Fitness", 24.99, "PERSONAL_CARE", "PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS", "demo-credit");
    add(base + 15, "Toyota Financial", 389, "LOAN_PAYMENTS", "LOAN_PAYMENTS_CAR_PAYMENT");
    add(base + 20, "Credit Card Payment", 1200, "LOAN_PAYMENTS", "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT");
    add(base + 20, "Payment Thank You", -1200, "TRANSFER_IN", "TRANSFER_IN_ACCOUNT_TRANSFER", "demo-credit");
    add(base + 14, "Acme Corp Payroll", -2650, "INCOME", "INCOME_WAGES");
    add(base + 28, "Acme Corp Payroll", -2650, "INCOME", "INCOME_WAGES");
  }

  const today = new Date();
  return {
    items: [{ itemId: "demo-item", institutionName: "Demo Bank", lastSyncedAt: today.toISOString() }],
    accounts: [
      { accountId: "demo-checking", itemId: "demo-item", name: "Everyday Checking", mask: "4821", type: "depository", subtype: "checking", currentBalance: 4218.33, availableBalance: 4118.33, currency: "USD" },
      { accountId: "demo-savings", itemId: "demo-item", name: "High-Yield Savings", mask: "9033", type: "depository", subtype: "savings", currentBalance: 12500, availableBalance: 12500, currency: "USD" },
      { accountId: "demo-credit", itemId: "demo-item", name: "Rewards Visa", mask: "1177", type: "credit", subtype: "credit card", currentBalance: 842.17, availableBalance: 7157.83, currency: "USD" },
      { accountId: "demo-auto", itemId: "demo-item", name: "Auto Loan", mask: "5510", type: "loan", subtype: "auto", currentBalance: 14320.5, availableBalance: null, currency: "USD" },
    ],
    transactions: transactions.filter((t) => t.date <= isoDate(today)).sort((a, b) => b.date.localeCompare(a.date)),
  };
}
