import fs from "node:fs";
import path from "node:path";

/**
 * Storage for linked banks, accounts and transactions.
 *
 * The default implementation keeps everything in one JSON file on disk, which
 * is enough for a single person. To move to a real database (SQLite, Postgres,
 * Supabase...), write another class that implements `Store` and swap it in
 * `index.ts`; nothing else needs to change.
 */

export interface StoredItem {
  itemId: string;
  accessToken: string;
  institutionName: string;
  cursor?: string;
  lastSyncedAt?: string;
  error?: string;
}

export interface StoredAccount {
  accountId: string;
  itemId: string;
  name: string;
  officialName?: string;
  mask?: string;
  type: string; // depository | credit | loan | other (investment accounts are never stored)
  subtype?: string;
  currentBalance: number | null;
  availableBalance: number | null;
  currency: string;
}

export interface StoredTransaction {
  transactionId: string;
  accountId: string;
  date: string; // YYYY-MM-DD
  name: string;
  merchantName?: string;
  /** Positive = money out (Plaid convention), negative = money in. */
  amount: number;
  currency: string;
  pending: boolean;
  plaidCategory?: string; // personal_finance_category.primary, e.g. FOOD_AND_DRINK
  plaidDetailed?: string;
  logoUrl?: string;
}

export interface Store {
  listItems(): StoredItem[];
  getItem(itemId: string): StoredItem | undefined;
  upsertItem(item: StoredItem): void;
  removeItem(itemId: string): void;
  listAccounts(): StoredAccount[];
  upsertAccounts(accounts: StoredAccount[]): void;
  listTransactions(): StoredTransaction[];
  applyTransactionChanges(upserts: StoredTransaction[], removedIds: string[]): void;
}

interface FileShape {
  items: Record<string, StoredItem>;
  accounts: Record<string, StoredAccount>;
  transactions: Record<string, StoredTransaction>;
}

export class JsonFileStore implements Store {
  private data: FileShape;

  constructor(private file: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.data = fs.existsSync(file)
      ? (JSON.parse(fs.readFileSync(file, "utf8")) as FileShape)
      : { items: {}, accounts: {}, transactions: {} };
  }

  private save() {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data), { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }

  listItems() {
    return Object.values(this.data.items);
  }
  getItem(itemId: string) {
    return this.data.items[itemId];
  }
  upsertItem(item: StoredItem) {
    this.data.items[item.itemId] = item;
    this.save();
  }
  removeItem(itemId: string) {
    delete this.data.items[itemId];
    const accountIds = new Set<string>();
    for (const [id, a] of Object.entries(this.data.accounts)) {
      if (a.itemId === itemId) {
        accountIds.add(id);
        delete this.data.accounts[id];
      }
    }
    for (const [id, t] of Object.entries(this.data.transactions)) {
      if (accountIds.has(t.accountId)) delete this.data.transactions[id];
    }
    this.save();
  }
  listAccounts() {
    return Object.values(this.data.accounts);
  }
  upsertAccounts(accounts: StoredAccount[]) {
    for (const a of accounts) this.data.accounts[a.accountId] = a;
    this.save();
  }
  listTransactions() {
    return Object.values(this.data.transactions).sort((a, b) => b.date.localeCompare(a.date));
  }
  applyTransactionChanges(upserts: StoredTransaction[], removedIds: string[]) {
    for (const t of upserts) this.data.transactions[t.transactionId] = t;
    for (const id of removedIds) delete this.data.transactions[id];
    this.save();
  }
}
