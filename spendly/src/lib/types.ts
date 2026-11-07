// Shapes returned by spendly-server (see spendly-server/src/store.ts).

export interface LinkedItem {
  itemId: string;
  institutionName: string;
  lastSyncedAt?: string;
  /** Plaid error code, e.g. ITEM_LOGIN_REQUIRED when the bank needs re-login. */
  error?: string;
}

export interface Account {
  accountId: string;
  itemId: string;
  name: string;
  officialName?: string;
  mask?: string;
  type: string; // depository | credit | loan | other
  subtype?: string;
  currentBalance: number | null;
  availableBalance: number | null;
  currency: string;
}

export interface Transaction {
  transactionId: string;
  accountId: string;
  date: string;
  name: string;
  merchantName?: string;
  /** Positive = money out, negative = money in (Plaid convention). */
  amount: number;
  currency: string;
  pending: boolean;
  plaidCategory?: string;
  plaidDetailed?: string;
  logoUrl?: string;
}

export interface BankData {
  items: LinkedItem[];
  accounts: Account[];
  transactions: Transaction[];
}
