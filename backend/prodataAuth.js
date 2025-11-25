const PRODATA_BASE_URL =
  (process.env.PRODATA_BASE_URL ||
    "https://araguaina.prodataweb.inf.br/sigintegracaorest").replace(/\/$/, "");
const PRODATA_AUTH_PATH = process.env.PRODATA_AUTH_PATH || "/auth";
const PRODATA_USER = process.env.PRODATA_USER;
const PRODATA_PASSWORD = process.env.PRODATA_PASSWORD;
const STATIC_TOKEN =
  process.env.PRODATA_AUTH_TOKEN || process.env.PRODATA_API_KEY || null;

let cachedToken = null;

function ensureEnv() {
  if (STATIC_TOKEN) return;
  if (!PRODATA_USER || !PRODATA_PASSWORD) {
    const err = new Error(
      "Falha na autenticacao: PRODATA_USER/PRODATA_PASSWORD nao configurados.",
    );
    err.status = 500;
    throw err;
  }
}

async function requestNewToken() {
  ensureEnv();
  if (STATIC_TOKEN) return STATIC_TOKEN;

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
    console.error(
      "[Prodata] Falha ao autenticar",
      res.status,
      res.statusText,
      bodyText,
    );
    const err = new Error(
      "Falha na autenticacao com o sistema Prodata. Verifique as credenciais.",
    );
    err.status = res.status === 401 ? 401 : res.status;
    throw err;
  }

  const json = await res.json().catch(() => ({}));
  const rawToken = json.token || json.access_token;
  if (!rawToken) {
    console.error("[Prodata] Resposta de auth sem token:", json);
    const err = new Error(
      "Falha na autenticacao com o sistema Prodata. Resposta nao contem token.",
    );
    err.status = 503;
    throw err;
  }

  const expiresInSeconds = json.expiresIn || json.expires_in || 25 * 60;
  const now = Date.now();
  cachedToken = {
    value: rawToken,
    expiresAt: now + (expiresInSeconds - 30) * 1000,
  };

  return rawToken;
}

export async function getProdataToken() {
  if (STATIC_TOKEN) return STATIC_TOKEN;
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.value;
  }
  return requestNewToken();
}

export async function prodataFetch(path, init = {}) {
  const token = await getProdataToken();

  const headers = new Headers(init.headers || {});
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
    // tenta renovar
    cachedToken = null;
    const newToken = await getProdataToken();
    headers.set("Authorization", `Bearer ${newToken}`);
    const retryRes = await fetch(url, { ...init, headers });
    if (!retryRes.ok) {
      const body = await retryRes.text().catch(() => "");
      console.error(
        "[Prodata] Falha apos renovar token",
        retryRes.status,
        retryRes.statusText,
        body,
      );
      const err = new Error(
        "Falha na comunicacao com o sistema Prodata apos renovar token.",
      );
      err.status = retryRes.status;
      err.data = body;
      throw err;
    }
    if (retryRes.status === 204) return undefined;
    const retryJson = await retryRes.json().catch(() => null);
    return retryJson;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(
      "[Prodata] Erro em chamada a API",
      res.status,
      res.statusText,
      body,
    );
    const err = new Error(
      `Erro ao consultar dados no sistema Prodata (${res.status}).`,
    );
    err.status = res.status;
    err.data = body;
    throw err;
  }

  if (res.status === 204) return undefined;
  const json = await res.json().catch(() => null);
  return json;
}

export { PRODATA_BASE_URL, PRODATA_AUTH_PATH };
