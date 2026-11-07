import "dotenv/config";
import crypto from "node:crypto";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
  type AccountBase,
  type Transaction,
} from "plaid/legacy";
import { JsonFileStore, type StoredAccount, type StoredTransaction } from "./store.js";

const { PLAID_CLIENT_ID, PLAID_SECRET, APP_API_KEY } = process.env;
const PLAID_ENV = (process.env.PLAID_ENV ?? "sandbox") as keyof typeof PlaidEnvironments;
const PORT = Number(process.env.PORT ?? 8080);

if (!PLAID_CLIENT_ID || !PLAID_SECRET || !APP_API_KEY) {
  console.error("Missing PLAID_CLIENT_ID, PLAID_SECRET or APP_API_KEY. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
if (!PlaidEnvironments[PLAID_ENV]) {
  console.error(`PLAID_ENV must be one of: ${Object.keys(PlaidEnvironments).join(", ")}`);
  process.exit(1);
}

const plaid = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[PLAID_ENV],
    baseOptions: { headers: { "PLAID-CLIENT-ID": PLAID_CLIENT_ID, "PLAID-SECRET": PLAID_SECRET } },
  }),
);

const store = new JsonFileStore(process.env.DATA_FILE ?? "data/db.json");

// This app deliberately ignores investment / brokerage accounts.
const EXCLUDED_ACCOUNT_TYPES = new Set(["investment", "brokerage"]);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, env: PLAID_ENV });
});

// Every /api route requires the shared key so only your phone can talk to the server.
app.use("/api", (req, res, next) => {
  const given = Buffer.from(req.header("x-api-key") ?? "");
  const expected = Buffer.from(APP_API_KEY);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }
  next();
});

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

app.post(
  "/api/link-token",
  wrap(async (req, res) => {
    // Pass an itemId to re-authenticate a bank whose login expired ("update mode").
    const itemId: string | undefined = req.body?.itemId;
    const item = itemId ? store.getItem(itemId) : undefined;
    const { data } = await plaid.linkTokenCreate({
      user: { client_user_id: "me" },
      client_name: "Spendly",
      language: "en",
      country_codes: [CountryCode.Us],
      ...(item ? { access_token: item.accessToken } : { products: [Products.Transactions] }),
      transactions: item ? undefined : { days_requested: 730 },
    });
    res.json({ linkToken: data.link_token });
  }),
);

app.post(
  "/api/exchange",
  wrap(async (req, res) => {
    const { publicToken, institutionName } = req.body ?? {};
    if (!publicToken) {
      res.status(400).json({ error: "publicToken is required" });
      return;
    }
    const { data } = await plaid.itemPublicTokenExchange({ public_token: publicToken });
    store.upsertItem({ itemId: data.item_id, accessToken: data.access_token, institutionName: institutionName ?? "Bank" });
    await refreshAccounts(data.item_id);
    await syncItem(data.item_id);
    res.json({ itemId: data.item_id });
  }),
);

app.post(
  "/api/sync",
  wrap(async (_req, res) => {
    for (const item of store.listItems()) {
      try {
        await refreshAccounts(item.itemId);
        await syncItem(item.itemId);
        store.upsertItem({ ...store.getItem(item.itemId)!, error: undefined });
      } catch (err) {
        const code = plaidErrorCode(err) ?? "SYNC_FAILED";
        store.upsertItem({ ...store.getItem(item.itemId)!, error: code });
      }
    }
    res.json(snapshot());
  }),
);

app.get("/api/data", (_req, res) => {
  res.json(snapshot());
});

app.delete(
  "/api/items/:itemId",
  wrap(async (req, res) => {
    const item = store.getItem(String(req.params.itemId));
    if (!item) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await plaid.itemRemove({ access_token: item.accessToken }).catch(() => undefined);
    store.removeItem(item.itemId);
    res.json({ ok: true });
  }),
);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // Only log Plaid's response body, never the request config (it contains the secret).
  const plaidBody = (err as { response?: { data?: unknown } })?.response?.data;
  console.error(plaidBody ?? err);
  res.status(500).json({ error: plaidErrorCode(err) ?? "Server error" });
});

function snapshot() {
  return {
    items: store.listItems().map(({ itemId, institutionName, lastSyncedAt, error }) => ({
      itemId,
      institutionName,
      lastSyncedAt,
      error,
    })),
    accounts: store.listAccounts(),
    transactions: store.listTransactions(),
  };
}

function plaidErrorCode(err: unknown): string | undefined {
  return (err as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code;
}

async function refreshAccounts(itemId: string) {
  const item = store.getItem(itemId)!;
  const { data } = await plaid.accountsGet({ access_token: item.accessToken });
  store.upsertAccounts(data.accounts.filter((a) => !EXCLUDED_ACCOUNT_TYPES.has(a.type)).map((a) => toAccount(a, itemId)));
}

async function syncItem(itemId: string) {
  const item = store.getItem(itemId)!;
  const allowedAccounts = new Set(store.listAccounts().filter((a) => a.itemId === itemId).map((a) => a.accountId));
  let cursor = item.cursor;
  const upserts: StoredTransaction[] = [];
  const removed: string[] = [];
  let hasMore = true;
  while (hasMore) {
    const { data } = await plaid.transactionsSync({ access_token: item.accessToken, cursor, count: 500 });
    for (const t of [...data.added, ...data.modified]) {
      if (allowedAccounts.has(t.account_id)) upserts.push(toTransaction(t));
    }
    removed.push(...data.removed.map((r) => r.transaction_id));
    hasMore = data.has_more;
    cursor = data.next_cursor;
  }
  store.applyTransactionChanges(upserts, removed);
  store.upsertItem({ ...item, cursor, lastSyncedAt: new Date().toISOString() });
}

function toAccount(a: AccountBase, itemId: string): StoredAccount {
  return {
    accountId: a.account_id,
    itemId,
    name: a.name,
    officialName: a.official_name ?? undefined,
    mask: a.mask ?? undefined,
    type: a.type,
    subtype: a.subtype ?? undefined,
    currentBalance: a.balances.current,
    availableBalance: a.balances.available,
    currency: a.balances.iso_currency_code ?? "USD",
  };
}

function toTransaction(t: Transaction): StoredTransaction {
  return {
    transactionId: t.transaction_id,
    accountId: t.account_id,
    date: t.date,
    name: t.name,
    merchantName: t.merchant_name ?? undefined,
    amount: t.amount,
    currency: t.iso_currency_code ?? "USD",
    pending: t.pending,
    plaidCategory: t.personal_finance_category?.primary,
    plaidDetailed: t.personal_finance_category?.detailed,
    logoUrl: t.logo_url ?? t.counterparties?.[0]?.logo_url ?? undefined,
  };
}

app.listen(PORT, () => {
  console.log(`Spendly server listening on http://localhost:${PORT} (Plaid ${PLAID_ENV})`);
});
