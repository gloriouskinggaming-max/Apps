import type { IconName } from "../components/ui";

export type CategoryKind = "expense" | "income" | "transfer";

export interface Category {
  id: string;
  name: string;
  icon: IconName;
  color: string;
  kind: CategoryKind;
}

export const CATEGORIES: Category[] = [
  { id: "housing", name: "Housing", icon: "house.fill", color: "#6366F1", kind: "expense" },
  { id: "utilities", name: "Utilities", icon: "bolt.fill", color: "#F59E0B", kind: "expense" },
  { id: "groceries", name: "Groceries", icon: "cart.fill", color: "#10B981", kind: "expense" },
  { id: "dining", name: "Dining & Drinks", icon: "fork.knife", color: "#F97316", kind: "expense" },
  { id: "transport", name: "Transportation", icon: "car.fill", color: "#3B82F6", kind: "expense" },
  { id: "shopping", name: "Shopping", icon: "bag.fill", color: "#EC4899", kind: "expense" },
  { id: "entertainment", name: "Entertainment", icon: "tv.fill", color: "#8B5CF6", kind: "expense" },
  { id: "health", name: "Health & Fitness", icon: "heart.fill", color: "#EF4444", kind: "expense" },
  { id: "personal", name: "Personal Care", icon: "sparkles", color: "#D946EF", kind: "expense" },
  { id: "subscriptions", name: "Subscriptions", icon: "repeat", color: "#14B8A6", kind: "expense" },
  { id: "travel", name: "Travel", icon: "airplane", color: "#0EA5E9", kind: "expense" },
  { id: "services", name: "Services", icon: "wrench.and.screwdriver.fill", color: "#64748B", kind: "expense" },
  { id: "gifts", name: "Gifts & Donations", icon: "gift.fill", color: "#E11D48", kind: "expense" },
  { id: "debt", name: "Loan Payments", icon: "creditcard.fill", color: "#78716C", kind: "expense" },
  { id: "fees", name: "Fees", icon: "exclamationmark.triangle.fill", color: "#DC2626", kind: "expense" },
  { id: "other", name: "Other", icon: "square.grid.2x2.fill", color: "#94A3B8", kind: "expense" },
  { id: "income", name: "Income", icon: "dollarsign.circle.fill", color: "#10B981", kind: "income" },
  { id: "transfer", name: "Transfers", icon: "arrow.left.arrow.right", color: "#94A3B8", kind: "transfer" },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<string, Category>;

/** Maps Plaid's personal_finance_category to one of our categories. */
export function categoryFromPlaid(primary?: string, detailed?: string): string {
  if (detailed === "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT") return "transfer"; // avoid double-counting card spend
  if (detailed === "FOOD_AND_DRINK_GROCERIES") return "groceries";
  if (detailed === "RENT_AND_UTILITIES_RENT") return "housing";
  if (detailed === "GENERAL_SERVICES_INSURANCE") return "services";
  if (detailed?.startsWith("ENTERTAINMENT_TV_AND_MOVIES") || detailed === "GENERAL_SERVICES_SUBSCRIPTION") return "subscriptions";
  switch (primary) {
    case "INCOME":
      return "income";
    case "TRANSFER_IN":
    case "TRANSFER_OUT":
      return "transfer";
    case "LOAN_PAYMENTS":
      return "debt";
    case "BANK_FEES":
      return "fees";
    case "ENTERTAINMENT":
      return "entertainment";
    case "FOOD_AND_DRINK":
      return "dining";
    case "GENERAL_MERCHANDISE":
      return "shopping";
    case "HOME_IMPROVEMENT":
      return "housing";
    case "MEDICAL":
      return "health";
    case "PERSONAL_CARE":
      return "personal";
    case "GENERAL_SERVICES":
      return "services";
    case "GOVERNMENT_AND_NON_PROFIT":
      return "gifts";
    case "TRANSPORTATION":
      return "transport";
    case "TRAVEL":
      return "travel";
    case "RENT_AND_UTILITIES":
      return "utilities";
    default:
      return "other";
  }
}
