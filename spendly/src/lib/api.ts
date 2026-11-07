import type { BankData } from "./types";

export interface ServerConfig {
  url: string;
  apiKey: string;
}

async function call<T>(cfg: ServerConfig, path: string, init?: RequestInit): Promise<T> {
  if (!cfg.url) throw new Error("Add your server address in Settings first.");
  const res = await fetch(cfg.url.replace(/\/+$/, "") + path, {
    ...init,
    headers: { "content-type": "application/json", "x-api-key": cfg.apiKey, ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Server returned ${res.status}`);
  return body as T;
}

export const api = {
  health: (cfg: ServerConfig) => call<{ ok: boolean; env: string }>(cfg, "/health"),
  data: (cfg: ServerConfig) => call<BankData>(cfg, "/api/data"),
  sync: (cfg: ServerConfig) => call<BankData>(cfg, "/api/sync", { method: "POST" }),
  linkToken: (cfg: ServerConfig, itemId?: string) =>
    call<{ linkToken: string }>(cfg, "/api/link-token", { method: "POST", body: JSON.stringify({ itemId }) }),
  exchange: (cfg: ServerConfig, publicToken: string, institutionName?: string) =>
    call<{ itemId: string }>(cfg, "/api/exchange", {
      method: "POST",
      body: JSON.stringify({ publicToken, institutionName }),
    }),
  removeItem: (cfg: ServerConfig, itemId: string) =>
    call<{ ok: true }>(cfg, `/api/items/${encodeURIComponent(itemId)}`, { method: "DELETE" }),
};
