import cors from "cors";
import express from "express";
import morgan from "morgan";
import { nanoid } from "nanoid";

const app = express();
const PORT = process.env.PORT || 3001;
const PRODATA_BASE_URL = (process.env.PRODATA_BASE_URL || "").replace(/\/$/, "");
const PRODATA_TIMEOUT = parseInt(process.env.PRODATA_TIMEOUT_MS || "10000", 10);

const ENDPOINTS = {
  imoveis:
    process.env.PRODATA_ENDPOINT_IMOVEIS ||
    "/arrecadacao/cargaDosRegistroImobiliario",
  dividaAtiva:
    process.env.PRODATA_ENDPOINT_DIVIDA_ATIVA ||
    "/arrecadacao/cargaDividaAtivaImovel",
  debitosAbertos:
    process.env.PRODATA_ENDPOINT_DEBITOS_ABERTOS ||
    "/arrecadacao/listarDebitosImovel",
  detalhesImovel:
    process.env.PRODATA_ENDPOINT_DETALHES_IMOVEL ||
    "/arrecadacao/registroImobiliario",
};

if (!PRODATA_BASE_URL) {
  console.warn(
    "ATENÇÃO: defina PRODATA_BASE_URL para que as consultas ao SIG Integração funcionem.",
  );
}

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const correlationId = req.header("x-correlation-id") || nanoid();
  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);
  next();
});

morgan.token("cid", (req) => req.correlationId || "-");
app.use(morgan(":method :url :status :response-time ms cid=:cid"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

function normalizeDocumento(value) {
  return (value || "").toString().replace(/\D/g, "");
}

function isValidCpf(cpf) {
  const digits = normalizeDocumento(cpf);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let rest = 11 - (sum % 11);
  rest = rest >= 10 ? 0 : rest;
  if (rest !== parseInt(digits.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  rest = 11 - (sum % 11);
  rest = rest >= 10 ? 0 : rest;
  return rest === parseInt(digits.charAt(10), 10);
}

function buildHeaders() {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const token = process.env.PRODATA_AUTH_TOKEN || process.env.PRODATA_API_KEY;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function callProdata(path, { method = "GET", searchParams = {}, body } = {}) {
  if (!PRODATA_BASE_URL) {
    const error = new Error("Configuração ausente: PRODATA_BASE_URL");
    error.status = 500;
    throw error;
  }

  const url = new URL(`${PRODATA_BASE_URL}${path}`);
  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PRODATA_TIMEOUT);

  try {
    const response = await fetch(url, {
      method,
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      const err = new Error(`Erro ao consultar Prodata (${response.status})`);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Timeout ao consultar serviço externo");
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function extractItems(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.itens)) return raw.itens;
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.result)) return raw.result;
  return [];
}

function shouldContinuePagination(raw, items, pageSize, page) {
  if (raw && typeof raw.quantidadeRestante === "number") {
    return raw.quantidadeRestante > 0;
  }
  if (raw && raw.total && pageSize && page) {
    return page * pageSize < raw.total;
  }
  return items.length === pageSize;
}

function resolveEndereco(item) {
  const enderecoCompleto =
    item.enderecoCompleto ||
    item.endereco_completo ||
    item.endereco ||
    item.logradouro;

  if (enderecoCompleto) return enderecoCompleto;

  const partes = [
    item.tipoLogradouro,
    item.logradouro,
    item.numero,
    item.bairro,
    item.complemento,
  ]
    .filter(Boolean)
    .join(", ");

  return partes || "Endereço não informado";
}

function mapImovelBasico(item) {
  return {
    inscricao: item.inscricaoImobiliaria || item.inscricao || item.inscricao_imobiliaria,
    inscricaoAnterior: item.inscricaoAnterior || item.inscricao_anterior,
    cci: item.cci || item.cciImovel || item.cci_imovel,
    ccp: item.ccp || item.ccpImovel || item.ccp_imovel,
    endereco: resolveEndereco(item),
    situacao: item.situacao || item.status || item.situacaoCadastral,
    proprietario: {
      nome: item.proprietario || item.nomeProprietario || item.nome_contribuinte,
      documento: item.cpfCnpj || item.documento || item.documentoContribuinte,
    },
  };
}

function mapDividaAtiva(item) {
  return {
    processo: item.processo || item.numeroProcesso || item.numero || item.id,
    ano: item.exercicio || item.ano || item.anoReferencia,
    valor: Number(item.valor || item.valorTotal || item.saldo || 0),
    situacao: item.situacao || item.status || "PENDENTE",
    descricao: item.descricao || item.motivo || item.observacao,
  };
}

function mapDuam(item) {
  const numero = item.numeroDuam || item.numero || item.id || item.duam;
  const parcela = item.parcela || item.nrParcela || item.parcelaAtual || "1";

  return {
    id: `${numero}-${parcela}`,
    duam: numero,
    descricao: item.descricao || item.receitaDescricao || item.referencia || "IPTU",
    exercicio: item.exercicio || item.ano,
    parcela,
    valorOriginal: Number(item.valorOriginal || item.valorLancado || item.valor || 0),
    desconto: Number(item.desconto || item.valorDesconto || 0),
    valor: Number(item.valorAtualizado || item.valorAPagar || item.valor || 0),
    vencimento: item.vencimento || item.dataVencimento || item.dtVenc || null,
  };
}

async function fetchImoveisPorDocumento(documento, isCpf) {
  const pageSize = parseInt(process.env.PRODATA_IMOVEIS_PAGE_SIZE || "200", 10);
  const maxPages = parseInt(process.env.PRODATA_IMOVEIS_MAX_PAGES || "20", 10);

  let page = 1;
  const coletados = [];

  while (page <= maxPages) {
    const resposta = await callProdata(ENDPOINTS.imoveis, {
      searchParams: {
        [isCpf ? "cpf" : "cnpj"]: documento,
        pagina: page,
        itens: pageSize,
      },
    });

    const itens = extractItems(resposta);
    coletados.push(...itens.map(mapImovelBasico));

    const continuar = shouldContinuePagination(resposta, itens, pageSize, page);
    if (!continuar) break;
    page += 1;
  }

  const vistos = new Set();
  return coletados.filter((imovel) => {
    const chave = imovel.cci || imovel.inscricao || imovel.ccp;
    if (!chave) return true;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

async function fetchDividasAtivas(cci) {
  if (!cci) return [];
  const resposta = await callProdata(ENDPOINTS.dividaAtiva, {
    searchParams: { cci, inscricao: cci },
  });
  return extractItems(resposta).map(mapDividaAtiva);
}

async function fetchDebitosEmAberto(identificador) {
  if (!identificador) return [];
  const resposta = await callProdata(ENDPOINTS.debitosAbertos, {
    searchParams: { cci: identificador, inscricao: identificador },
  });
  return extractItems(resposta).map(mapDuam);
}

async function fetchDetalhesImovel({ cci, inscricao }) {
  const resposta = await callProdata(ENDPOINTS.detalhesImovel, {
    searchParams: {
      ...(cci ? { cci } : {}),
      ...(inscricao ? { inscricao } : {}),
    },
  });
  return resposta;
}

function mapDetalhesImovel(raw) {
  if (!raw) return {};
  const endereco =
    raw.endereco ||
    raw.enderecoCompleto ||
    raw.endereco_completo ||
    raw.dadosEndereco ||
    {};

  const logradouro =
    endereco.logradouro ||
    endereco.logradouro_nome ||
    raw.logradouro ||
    raw.logradouro_nome;

  return {
    inscricao:
      raw.inscricaoImobiliaria || raw.inscricao || raw.inscricao_imobiliaria,
    inscricaoAnterior: raw.inscricaoAnterior || raw.inscricao_anterior,
    cci: raw.cci || raw.cciImovel || raw.cci_imovel,
    ccp: raw.ccp || raw.ccpImovel || raw.ccp_imovel,
    dadosCadastrais: {
      tipoImovel:
        raw.tipoImovel ||
        raw.dadosCadastrais?.tipoImovel ||
        raw.tipo_imovel,
      areaLote:
        raw.dadosCadastrais?.areaLote ||
        raw.areaLote ||
        raw.area_lote ||
        null,
      areaConstruida:
        raw.dadosCadastrais?.areaConstruida ||
        raw.areaConstruida ||
        raw.area_construida ||
        null,
      valorVenal:
        raw.dadosCadastrais?.valorVenal ||
        raw.valorVenal ||
        raw.valor_venal ||
        0,
    },
    endereco: {
      enderecoCompleto:
        endereco.enderecoCompleto ||
        endereco.endereco_completo ||
        logradouro ||
        raw.enderecoCompleto ||
        raw.endereco_completo,
      logradouro,
      bairroInfo: {
        nome:
          endereco.bairro ||
          endereco.bairro_nome ||
          raw.bairro ||
          raw.bairro_nome ||
          null,
      },
    },
    proprietario: {
      nome:
        raw.proprietario?.nome ||
        raw.proprietario ||
        raw.nomeContribuinte ||
        raw.nome_contribuinte,
    },
    situacao: raw.situacao || raw.status || raw.situacaoCadastral,
  };
}

app.post("/functions/consultarContribuinte", async (req, res, next) => {
  try {
    const documento = normalizeDocumento(req.body?.cpf || req.body?.cnpj);
    const isCpf = documento.length === 11;

    if (!documento) {
      return res.status(400).json({ error: "CPF é obrigatório." });
    }
    if (isCpf && !isValidCpf(documento)) {
      return res.status(400).json({ error: "CPF informado é inválido." });
    }
    if (!isCpf && documento.length !== 14) {
      return res.status(400).json({ error: "CNPJ informado é inválido." });
    }

    const imoveis = await fetchImoveisPorDocumento(documento, isCpf);

    if (!imoveis.length) {
      return res.status(404).json({
        mensagem: "Nenhum imóvel encontrado para este documento.",
        totalImoveis: 0,
        itens: [],
      });
    }

    const agregados = await Promise.all(
      imoveis.map(async (imovel) => {
        const chave = imovel.cci || imovel.inscricao || imovel.ccp;
        const [dividasAtivas, iptuPendentes] = await Promise.all([
          fetchDividasAtivas(chave),
          fetchDebitosEmAberto(chave),
        ]);
        return {
          ...imovel,
          dividasAtivas,
          iptuPendentes,
        };
      }),
    );

    res.json({
      totalImoveis: agregados.length,
      itens: agregados,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/functions/consultarDebitos", async (req, res, next) => {
  try {
    const { inscricao, cci, ccp } = req.body || {};
    const identificador = normalizeDocumento(cci || inscricao || ccp);

    if (!identificador) {
      return res.status(400).json({
        error: "É necessário informar inscrição ou CCI do imóvel.",
      });
    }

    const [duams, dividasAtivas] = await Promise.all([
      fetchDebitosEmAberto(identificador),
      fetchDividasAtivas(identificador),
    ]);

    if (!duams.length && !dividasAtivas.length) {
      return res
        .status(404)
        .json({ error: "Nenhum débito encontrado para este imóvel." });
    }

    const detalhes = await fetchDetalhesImovel({
      cci: cci || identificador,
      inscricao: inscricao || identificador,
    });
    const detalhesMapeados = mapDetalhesImovel(detalhes);

    const totalDuams = duams.reduce(
      (sum, item) => sum + (Number.isFinite(item.valor) ? item.valor : 0),
      0,
    );

    res.json({
      imovel: {
        cci: detalhesMapeados.cci || identificador,
        inscricao: detalhesMapeados.inscricao || null,
        ccp: detalhesMapeados.ccp || ccp || null,
        endereco:
          detalhesMapeados.endereco?.enderecoCompleto ||
          detalhesMapeados.endereco?.logradouro ||
          null,
      },
      proprietario: detalhesMapeados.proprietario || {},
      itens: duams,
      dividasAtivas,
      quantidadeDebitos: duams.length + dividasAtivas.length,
      totalDebitos: totalDuams,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/functions/consultarDetalhesImovel", async (req, res, next) => {
  try {
    const { inscricao, cci } = req.body || {};
    if (!inscricao && !cci) {
      return res
        .status(400)
        .json({ error: "Informe inscrição ou CCI para consultar o imóvel." });
    }

    const detalhes = await fetchDetalhesImovel({ inscricao, cci });

    if (!detalhes) {
      return res.status(404).json({ error: "Imóvel não encontrado." });
    }

    const detalhesMapeados = mapDetalhesImovel(detalhes);
    res.json(detalhesMapeados);
  } catch (error) {
    next(error);
  }
});

// Rotas ainda não implementadas, mantidas para compatibilidade com o front
app.post("/functions/simularParcelamento", (_req, res) => {
  res.status(501).json({ error: "Simulação não implementada neste backend." });
});

app.post("/functions/emitirDuam", (_req, res) => {
  res.status(501).json({ error: "Emissão de DUAM não implementada." });
});

app.post("/functions/processarPagamentoOnline", (_req, res) => {
  res
    .status(501)
    .json({ error: "Pagamento online não implementado neste backend." });
});

app.post("/functions/consultarStatusPagamentos", (_req, res) => {
  res.status(501).json({ error: "Consulta de status não implementada." });
});

app.post("/functions/getApiMetrics", (_req, res) => {
  res.status(200).json({ status: "ok", origem: "backend iptu5" });
});

app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const doc = normalizeDocumento(req.body?.cpf || req.body?.cnpj || "");
  const maskedDoc =
    doc.length === 11
      ? doc.replace(/(\d{3})\d{5}(\d{3})/, "$1*****$2")
      : doc.length === 14
        ? doc.replace(/(\d{2})\d{8}(\d{2})/, "$1********$2")
        : "n/d";

  console.error(
    `[${req.correlationId}] Erro:`,
    err.message,
    "status=",
    status,
    "cpf=",
    maskedDoc,
    err.data ? `payload=${JSON.stringify(err.data).slice(0, 500)}` : "",
  );

  if (status === 504) {
    return res
      .status(504)
      .json({ error: "Serviço temporariamente indisponível. Tente novamente." });
  }

  if (status === 404) {
    return res
      .status(404)
      .json({ error: "Registro não encontrado para os parâmetros informados." });
  }

  if (status >= 500) {
    return res.status(status).json({
      error: "Ocorreu um erro ao consultar os dados de IPTU. Tente novamente.",
    });
  }

  return res.status(status).json({
    error: err.message || "Erro ao processar requisição.",
    detalhes: err.data,
  });
});

app.listen(PORT, () => {
  console.log(`Backend IPTU rodando em http://localhost:${PORT}`);
});
