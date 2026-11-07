import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert } from "react-native";
import { api, type ServerConfig } from "./api";
import { CATEGORY_BY_ID, categoryFromPlaid } from "./categories";
import { buildDemoData } from "./demo";
import { openPlaidLink } from "./plaid";
import type { BankData, Transaction } from "./types";

/**
 * App state. Bank data comes from your spendly-server (or demo data); everything
 * you customize (categories, notes, budgets) is stored on the phone.
 */
interface Prefs {
  mode: "demo" | "live";
  serverUrl: string;
  /** Per-transaction edits. */
  overrides: Record<string, { categoryId?: string; note?: string; hidden?: boolean }>;
  /** "Always categorize this merchant as..." rules, keyed by lowercase merchant name. */
  merchantRules: Record<string, string>;
  /** Monthly budget per category id. */
  budgets: Record<string, number>;
  /** Savings goals. */
  goals: Goal[];
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  color: string;
  targetDate?: string; // YYYY-MM
}

const DEFAULT_PREFS: Prefs = {
  mode: "demo",
  serverUrl: "",
  overrides: {},
  merchantRules: {},
  budgets: { groceries: 600, dining: 300, transport: 250, shopping: 300, entertainment: 100, utilities: 200, housing: 1900 },
  goals: [
    { id: "g1", name: "Emergency fund", target: 15000, saved: 12500, color: "#10B981" },
    { id: "g2", name: "Vacation", target: 3000, saved: 850, color: "#0EA5E9", targetDate: "2027-06" },
  ],
};

const PREFS_KEY = "budget.prefs.v1";
const CACHE_KEY = "budget.bankdata.v1";
const API_KEY_KEY = "budget.apikey";
const EMPTY: BankData = { items: [], accounts: [], transactions: [] };

interface StoreValue {
  ready: boolean;
  prefs: Prefs;
  data: BankData;
  apiKey: string;
  syncing: boolean;
  categoryOf: (t: Transaction) => string;
  merchantKey: (t: Transaction) => string;
  refresh: () => Promise<void>;
  linkBank: (reconnectItemId?: string) => Promise<void>;
  removeBank: (itemId: string) => Promise<void>;
  setCategory: (t: Transaction, categoryId: string, applyToMerchant: boolean) => void;
  setOverride: (txId: string, patch: Prefs["overrides"][string]) => void;
  setBudget: (categoryId: string, amount: number | null) => void;
  setMode: (mode: Prefs["mode"]) => void;
  saveGoal: (goal: Goal) => void;
  removeGoal: (id: string) => void;
  removeRule: (merchant: string) => void;
  setServer: (url: string, apiKey: string) => Promise<void>;
  resetAll: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [liveData, setLiveData] = useState<BankData>(EMPTY);
  const [apiKey, setApiKey] = useState("");
  const [syncing, setSyncing] = useState(false);
  const demoData = useMemo(buildDemoData, []);

  useEffect(() => {
    (async () => {
      const [p, cache, key] = await Promise.all([
        AsyncStorage.getItem(PREFS_KEY),
        AsyncStorage.getItem(CACHE_KEY),
        SecureStore.getItemAsync(API_KEY_KEY),
      ]);
      if (p) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(p) });
      if (cache) setLiveData(JSON.parse(cache));
      if (key) setApiKey(key);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs, ready]);

  const cfg: ServerConfig = useMemo(() => ({ url: prefs.serverUrl, apiKey }), [prefs.serverUrl, apiKey]);
  const data = prefs.mode === "demo" ? demoData : liveData;

  const saveLive = useCallback((d: BankData) => {
    setLiveData(d);
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(d));
  }, []);

  const merchantKey = useCallback((t: Transaction) => (t.merchantName ?? t.name).trim().toLowerCase(), []);

  const categoryOf = useCallback(
    (t: Transaction) =>
      prefs.overrides[t.transactionId]?.categoryId ??
      prefs.merchantRules[merchantKey(t)] ??
      categoryFromPlaid(t.plaidCategory, t.plaidDetailed),
    [prefs.overrides, prefs.merchantRules, merchantKey],
  );

  const refresh = useCallback(async () => {
    if (prefs.mode === "demo") return;
    setSyncing(true);
    try {
      saveLive(await api.sync(cfg));
    } catch (e) {
      Alert.alert("Couldn't sync", (e as Error).message);
    } finally {
      setSyncing(false);
    }
  }, [prefs.mode, cfg, saveLive]);

  const linkBank = useCallback(
    async (reconnectItemId?: string) => {
      try {
        const { linkToken } = await api.linkToken(cfg, reconnectItemId);
        const result = await openPlaidLink(linkToken);
        if (!result) return;
        setSyncing(true);
        if (!reconnectItemId) await api.exchange(cfg, result.publicToken, result.institutionName);
        saveLive(await api.sync(cfg));
      } catch (e) {
        Alert.alert("Couldn't link bank", (e as Error).message);
      } finally {
        setSyncing(false);
      }
    },
    [cfg, saveLive],
  );

  const removeBank = useCallback(
    async (itemId: string) => {
      try {
        await api.removeItem(cfg, itemId);
        saveLive(await api.data(cfg));
      } catch (e) {
        Alert.alert("Couldn't remove bank", (e as Error).message);
      }
    },
    [cfg, saveLive],
  );

  const setOverride = useCallback((txId: string, patch: Prefs["overrides"][string]) => {
    setPrefs((p) => ({ ...p, overrides: { ...p.overrides, [txId]: { ...p.overrides[txId], ...patch } } }));
  }, []);

  const setCategory = useCallback(
    (t: Transaction, categoryId: string, applyToMerchant: boolean) => {
      setPrefs((p) => ({
        ...p,
        overrides: { ...p.overrides, [t.transactionId]: { ...p.overrides[t.transactionId], categoryId } },
        merchantRules: applyToMerchant ? { ...p.merchantRules, [merchantKey(t)]: categoryId } : p.merchantRules,
      }));
    },
    [merchantKey],
  );

  const setBudget = useCallback((categoryId: string, amount: number | null) => {
    setPrefs((p) => {
      const budgets = { ...p.budgets };
      if (amount && amount > 0 && CATEGORY_BY_ID[categoryId]) budgets[categoryId] = amount;
      else delete budgets[categoryId];
      return { ...p, budgets };
    });
  }, []);

  const saveGoal = useCallback((goal: Goal) => {
    setPrefs((p) => {
      const exists = p.goals.some((g) => g.id === goal.id);
      return { ...p, goals: exists ? p.goals.map((g) => (g.id === goal.id ? goal : g)) : [...p.goals, goal] };
    });
  }, []);
  const removeGoal = useCallback((id: string) => setPrefs((p) => ({ ...p, goals: p.goals.filter((g) => g.id !== id) })), []);
  const removeRule = useCallback((merchant: string) => {
    setPrefs((p) => {
      const merchantRules = { ...p.merchantRules };
      delete merchantRules[merchant];
      return { ...p, merchantRules };
    });
  }, []);

  const setMode = useCallback((mode: Prefs["mode"]) => setPrefs((p) => ({ ...p, mode })), []);

  const setServer = useCallback(async (url: string, key: string) => {
    setPrefs((p) => ({ ...p, serverUrl: url.trim() }));
    setApiKey(key.trim());
    await SecureStore.setItemAsync(API_KEY_KEY, key.trim());
  }, []);

  const resetAll = useCallback(async () => {
    await AsyncStorage.multiRemove([PREFS_KEY, CACHE_KEY]);
    await SecureStore.deleteItemAsync(API_KEY_KEY);
    setPrefs(DEFAULT_PREFS);
    setLiveData(EMPTY);
    setApiKey("");
  }, []);

  const value: StoreValue = {
    ready,
    prefs,
    data,
    apiKey,
    syncing,
    categoryOf,
    merchantKey,
    refresh,
    linkBank,
    removeBank,
    setCategory,
    setOverride,
    setBudget,
    setMode,
    saveGoal,
    removeGoal,
    removeRule,
    setServer,
    resetAll,
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

/** Spending / income totals for a month, honoring hidden transactions and transfers. */
export function useMonthSummary(month: string) {
  const { data, prefs, categoryOf } = useStore();
  return useMemo(() => {
    const byCategory: Record<string, number> = {};
    let spent = 0;
    let income = 0;
    const txs = data.transactions.filter((t) => t.date.startsWith(month) && !prefs.overrides[t.transactionId]?.hidden);
    for (const t of txs) {
      const cat = CATEGORY_BY_ID[categoryOf(t)] ?? CATEGORY_BY_ID.other;
      if (cat.kind === "transfer") continue;
      if (cat.kind === "income") {
        income += -t.amount;
        continue;
      }
      // Refunds (negative amounts) in an expense category reduce that category's spending.
      byCategory[cat.id] = (byCategory[cat.id] ?? 0) + t.amount;
      spent += t.amount;
    }
    return { txs, byCategory, spent, income, net: income - spent };
  }, [data.transactions, prefs.overrides, categoryOf, month]);
}
