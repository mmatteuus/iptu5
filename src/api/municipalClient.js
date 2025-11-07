const API_BASE_URL = normalizeBase(import.meta.env.VITE_MUNICIPAL_API_URL || "/api");
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_URL || "/login";

function normalizeBase(baseUrl) {
  if (!baseUrl) return "";
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function buildApiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function request(path, options = {}) {
  const {
    method = "GET",
    body,
    headers = {},
    ...rest
  } = options;

  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    credentials: "include",
    ...rest,
  };

  if (body !== undefined && body !== null) {
    config.body = body instanceof FormData ? body : JSON.stringify(body);
    if (body instanceof FormData) {
      delete config.headers["Content-Type"];
    }
  }

  const response = await fetch(buildApiUrl(path), config);

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      console.warn("Resposta JSON inválida para", path, error);
    }
  }

  if (!response.ok) {
    const message = data?.message || `Erro ao acessar ${path}`;
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

function resolveAuthUrl(returnTo) {
  if (AUTH_BASE_URL.startsWith("http")) {
    const url = new URL(AUTH_BASE_URL);
    if (returnTo) {
      url.searchParams.set("redirect_to", returnTo);
    }
    return url.toString();
  }

  if (typeof window === "undefined") {
    return AUTH_BASE_URL;
  }

  const url = new URL(AUTH_BASE_URL, window.location.origin);
  if (returnTo) {
    url.searchParams.set("redirect_to", returnTo);
  }
  return url.toString();
}

export const municipalApi = {
  functions: {
    async invoke(name, payload = {}) {
      const data = await request(`/functions/${name}`, {
        method: "POST",
        body: payload,
      });
      return { data };
    },
  },
  auth: {
    async me() {
      return request("/auth/me");
    },
    async updateMe(payload) {
      return request("/auth/me", {
        method: "PATCH",
        body: payload,
      });
    },
    redirectToLogin(returnUrl) {
      if (typeof window === "undefined") return;
      const redirectTarget = resolveAuthUrl(returnUrl || window.location.href);
      window.location.href = redirectTarget;
    },
  },
};

