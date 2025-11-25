// src/prodata/prodataAuth.ts

export type ProdataTokenResponse = {
  token?: string;
  access_token?: string;
  expiresIn?: number; // segundos
  expires_in?: number;
  tipo?: string;
  dados?: {
    token?: string;
    access_token?: string;
    expiresIn?: number;
  };
};

export const PRODATA_BASE_URL =
  process.env.PRODATA_BASE_URL ??
  "https://araguaina.prodataweb.inf.br/sigintegracaorest";

// caminho de login corrigido: /auth (altere via env se precisar /autenticacao)
export const PRODATA_AUTH_PATH = process.env.PRODATA_AUTH_PATH ?? "/auth";

const PRODATA_USER = process.env.PRODATA_USER;
const PRODATA_PASSWORD = process.env.PRODATA_PASSWORD;

let cachedToken: { value: string; expiresAt: number } | null = null;

function ensureEnv() {
  if (!PRODATA_USER || !PRODATA_PASSWORD) {
    throw new Error(
      "Falha na autenticação com o sistema Prodata. PRODATA_USER ou PRODATA_PASSWORD não configurados.",
    );
  }
}

async function requestNewToken(): Promise<string> {
  ensureEnv();

  const url = `${PRODATA_BASE_URL}${PRODATA_AUTH_PATH}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      usuario: PRODATA_USER,
      senha: PRODATA_PASSWORD,
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    console.error("[Prodata] Falha ao autenticar", res.status, res.statusText, bodyText);
    throw new Error(
      "Falha na autenticação com o sistema Prodata. Verifique as credenciais.",
    );
  }

  const json = (await res.json()) as ProdataTokenResponse;
  const rawToken =
    json.token ??
    json.access_token ??
    json.dados?.token ??
    json.dados?.access_token;
  if (!rawToken) {
    console.error("[Prodata] Resposta de auth sem token:", json);
    throw new Error(
      "Falha na autenticação com o sistema Prodata. Resposta não contém token.",
    );
  }

  const expiresInSeconds =
    json.expiresIn ?? json.expires_in ?? json.dados?.expiresIn ?? 25 * 60;
  const now = Date.now();
  cachedToken = {
    value: rawToken,
    expiresAt: now + (expiresInSeconds - 30) * 1000,
  };

  return rawToken;
}

export async function getProdataToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.value;
  }
  return requestNewToken();
}

export async function prodataFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getProdataToken();

  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const url = path.startsWith("http")
    ? path
    : `${PRODATA_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (res.status === 401) {
    console.warn("[Prodata] Token expirado, forçando renovação...");
    cachedToken = null;
    const newToken = await getProdataToken();
    headers.set("Authorization", `Bearer ${newToken}`);
    const retryRes = await fetch(url, { ...init, headers });
    if (!retryRes.ok) {
      const body = await retryRes.text().catch(() => "");
      console.error(
        "[Prodata] Falha após renovar token",
        retryRes.status,
        retryRes.statusText,
        body,
      );
      throw new Error(
        "Falha na comunicação com o sistema Prodata após renovar token.",
      );
    }
    if (retryRes.status === 204) return undefined as T;
    return (await retryRes.json()) as T;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(
      "[Prodata] Erro em chamada à API",
      res.status,
      res.statusText,
      body,
    );
    throw new Error(
      `Erro ao consultar dados no sistema Prodata (${res.status}).`,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
