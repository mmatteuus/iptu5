import cors from "cors";
import express from "express";
import morgan from "morgan";
import { nanoid } from "nanoid";
import { prodataFetch, PRODATA_BASE_URL } from "./prodataAuth.js";

const app = express();
const PORT = process.env.PORT || 3001;
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
  consultaDuams:
    process.env.PRODATA_ENDPOINT_CONSULTA_DUAMS ||
    "/arrecadacao/consultaDuams",
  simularParcelamento:
    process.env.PRODATA_ENDPOINT_SIMULAR_PARCELAMENTO ||
    "/arrecadacao/simulacaoRepactuacao",
  gerarDuamVirtual:
    process.env.PRODATA_ENDPOINT_GERAR_DUAM_VIRTUAL ||
    "/arrecadacao/gerarDuamVirtual",
  imprimirDuam:
    process.env.PRODATA_ENDPOINT_IMPRIMIR_DUAM ||
    "/arrecadacao/imprimirDuam",
  imprimirDuamVirtual:
    process.env.PRODATA_ENDPOINT_IMPRIMIR_DUAM_VIRTUAL ||
    "/arrecadacao/imprimirDuamVirtual",
  consultaContribuinte:
    process.env.PRODATA_ENDPOINT_CONSULTA_CONTRIBUINTE ||
    "/arrecadacao/consultaContribuinte",
  consultaImobiliaria:
    process.env.PRODATA_ENDPOINT_CONSULTA_IMOBILIARIA ||
    "/arrecadacao/consultaImobiliaria",
};

if (!PRODATA_BASE_URL) {
  console.warn(
    "ATENCAO: defina PRODATA_BASE_URL para que as consultas ao SIG Integracao funcionem.",
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

function maskDocumento(value) {
  const doc = normalizeDocumento(value || "");
  if (doc.length === 11) {
    return doc.replace(/(\d{3})\d{5}(\d{3})/, "$1*****$2");
  }
  if (doc.length === 14) {
    return doc.replace(/(\d{2})\d{8}(\d{2})/, "$1********$2");
  }
  return "n/d";
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

function buildPath(path, searchParams = {}) {
  const url = new URL(path, PRODATA_BASE_URL || "http://localhost");
  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.pathname + url.search;
}

async function callProdata(
  path,
  { method = "GET", searchParams = {}, body, accept } = {},
) {
  const finalPath = buildPath(path, searchParams);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PRODATA_TIMEOUT);

  const headers = {};
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  if (accept) {
    headers.Accept = accept;
  }

  try {
    const data = await prodataFetch(finalPath, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Timeout ao consultar servico externo");
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

  return partes || "Endereco nao informado";
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

function mapDuamParcelaCompleta(parcela) {
  if (!parcela) return {};
  return {
    parcela: parcela.parcela || parcela.pacela || parcela.nrParcela || null,
    vencimento:
      parcela.dataVenc ||
      parcela.dataVencimento ||
      parcela.dataVencPgto ||
      parcela.dataVencAtu ||
      parcela.dataVencPagamento ||
      null,
    valor: Number(
      parcela.valorPrincipal ||
        parcela.valor ||
        parcela.valorDivida ||
        parcela.valorSaldo ||
        0,
    ),
    valorPago: Number(parcela.valorPago || 0),
    valorAtualizacao: Number(
      parcela.valorAtualizacao || parcela.valorConvertido || 0,
    ),
    codigoBarras: parcela.cdBarra || parcela.cdBarras || null,
    linhaDigitavel: parcela.strBarra || parcela.strBarras || null,
    aviso: parcela.aviso || null,
    processoDivida: parcela.processoDivida || null,
  };
}

function mapDuamCompleto(item) {
  if (!item) return {};
  const parcelas = Array.isArray(item.duamParcelas)
    ? item.duamParcelas.map(mapDuamParcelaCompleta)
    : [];
  const total = parcelas.reduce(
    (sum, p) => sum + (Number.isFinite(p.valor) ? p.valor : 0),
    0,
  );

  return {
    duam: item.duam || item.numeroDuam || item.id || null,
    exercicio: item.anoRef || item.ano || item.exercicio || null,
    mesRef: item.mesRef || null,
    receita: item.nomeReceita || item.receita || null,
    cci: item.cci || null,
    ccp: item.ccp || null,
    inscricaoMunicipal: item.inscMunicipal || item.inscricao || null,
    nomeContribuinte: item.nomeContribuinte || null,
    parcelas,
    valorTotal: total,
  };
}

function mapDuamVirtual(raw) {
  if (!raw) return {};
  const itens = Array.isArray(raw.duamVirtualItem) ? raw.duamVirtualItem : [];
  const parcelas = itens.map((item) => ({
    parcela: item.pacela || item.parcela || null,
    vencimento: item.dataVencimento || null,
    valor: Number(
      item.valorPrincipal ||
        item.valor ||
        item.valorDivida ||
        item.valorSaldo ||
        0,
    ),
    codigoBarras: item.cdBarras || item.strBarras || null,
    linhaDigitavel: item.strBarras || null,
    qrcodePix: item.qrcodePix || null,
    linkQrcodePix: item.linkQrcodePix || null,
    receitaPrincipal: item.receitaPrincipal || null,
    nomeReceitaPrincipal: item.nomeReceitaPrincipal || null,
  }));

  const total = parcelas.reduce(
    (sum, p) => sum + (Number.isFinite(p.valor) ? p.valor : 0),
    0,
  );

  return {
    duamReferencia: raw.duamReferencia || raw.duam || null,
    cpfCnpj: raw.cpfCnpj || null,
    nomeContribuinte: raw.nomeContribuinte || null,
    receita: raw.nomeReceita || raw.nomeReceitaPrincipal || null,
    observacao: raw.observacao || null,
    parcelas,
    valorTotal: total,
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

async function consultarDuamsSig(params = {}) {
  const resposta = await callProdata(ENDPOINTS.consultaDuams, {
    searchParams: {
      ccp: params.ccp,
      cci: params.cci,
      inscricao: params.inscricao,
      ano: params.ano,
      mes: params.mes,
      receita: params.receita,
      somenteDivida: params.somenteDivida,
    },
  });
  const duams = resposta?.duams || resposta?.itens || resposta?.data || [];
  return {
    duams: duams.map(mapDuamCompleto),
  };
}

async function consultarContribuinteSig(cpfCnpj) {
  if (!cpfCnpj) return null;
  return callProdata(ENDPOINTS.consultaContribuinte, {
    searchParams: { cpfCnpj },
  });
}

async function simularParcelamentoSig(payload) {
  return callProdata(ENDPOINTS.simularParcelamento, {
    method: "POST",
    body: payload,
  });
}

async function gerarDuamVirtualSig(payload) {
  const resposta = await callProdata(ENDPOINTS.gerarDuamVirtual, {
    method: "POST",
    body: payload,
  });
  return mapDuamVirtual(resposta);
}

async function imprimirDuamSig({ duam, parcelas, ccp, isTodasParcela }) {
  return callProdata(ENDPOINTS.imprimirDuam, {
    searchParams: { duam, parcelas, ccp, isTodasParcela },
    accept: "application/pdf",
  });
}

async function imprimirDuamVirtualSig(body) {
  return callProdata(ENDPOINTS.imprimirDuamVirtual, {
    method: "POST",
    body,
    accept: "application/pdf",
  });
}

app.post("/api/public/boletos/consulta", async (req, res, next) => {
  try {
    const body = req.body || {};
    const cpfCnpj = normalizeDocumento(body.cpfCnpj || body.cpf || body.cnpj);
    const inscricao =
      normalizeDocumento(body.inscricaoImobiliaria || body.inscricao) || null;
    const cci = normalizeDocumento(body.cci || "");
    const ccp = body.ccp ? Number(body.ccp) : undefined;
    const ano = body.ano ? Number(body.ano) : undefined;
    const mes = body.mes ? Number(body.mes) : undefined;
    const receita = body.receita || body.receitaPrincipal;

    if (!cpfCnpj) {
      return res.status(400).json({ error: "cpfCnpj e obrigatorio." });
    }
    if (cpfCnpj.length === 11 && !isValidCpf(cpfCnpj)) {
      return res.status(400).json({ error: "CPF informado e invalido." });
    }
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      return res.status(400).json({ error: "CPF/CNPJ deve ter 11 ou 14 digitos." });
    }

    if (!inscricao && !cci && !ccp) {
      return res.status(400).json({
        error: "Informe inscricao, CCI ou CCP do imovel para consultar debitos.",
      });
    }

    // valida vinculo (best-effort, nao bloqueia)
    await consultarContribuinteSig(cpfCnpj).catch((err) => {
      console.warn(
        "[SIG][consultaContribuinte][warn]",
        err.message || err,
        "cpf=",
        maskDocumento(cpfCnpj),
      );
      return null;
    });

    const consulta = await consultarDuamsSig({
      ccp,
      cci: cci || undefined,
      inscricao: inscricao || cci || ccp,
      ano,
      mes,
      receita,
      somenteDivida: false,
    });

    const duams = consulta.duams || [];
    if (!duams.length) {
      return res
        .status(404)
        .json({ error: "Nenhum debito encontrado para os parametros informados." });
    }

    const total = duams.reduce(
      (sum, item) => sum + (Number.isFinite(item.valorTotal) ? item.valorTotal : 0),
      0,
    );

    res.json({
      cpfCnpj,
      inscricao: inscricao || null,
      quantidadeDebitos: duams.length,
      totalDebitos: total,
      debitos: duams,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/public/boletos/simular", async (req, res, next) => {
  try {
    const payload = req.body || {};
    const requiredCampos = [
      "codigoBaixa",
      "codigoCondicaoRefis",
      "codigoRefis",
      "dataFinal",
      "dataInicial",
      "devedor",
      "duams",
      "obs",
      "outrasReceitas",
      "percentualValorEntrada",
      "receitaRepactuacao",
      "receitas",
      "tipoDebito",
      "tipoDevedor",
      "tipoEntrada",
      "tipoPesquisa",
      "tipoSimulacao",
      "usuario",
      "valorParcelas",
      "vencimento",
    ];
    const missing = requiredCampos.filter(
      (campo) =>
        payload[campo] === undefined ||
        payload[campo] === null ||
        payload[campo] === "",
    );
    if (missing.length) {
      return res.status(400).json({
        error: "Campos obrigatorios ausentes para simulacao.",
        campos: missing,
      });
    }

    const simulacao = await simularParcelamentoSig(payload);
    res.json({ simulacao });
  } catch (error) {
    next(error);
  }
});

app.post("/api/public/boletos/gerar", async (req, res, next) => {
  try {
    const payload = req.body || {};
    const dto = {
      ...payload,
      cpfCnpj: normalizeDocumento(payload.cpfCnpj),
    };
    const requiredCampos = [
      "cpfCnpj",
      "nomeContribuinte",
      "anoRef",
      "mesRef",
      "parcelas",
      "receitaPrincipal",
    ];
    const missing = requiredCampos.filter(
      (campo) =>
        dto[campo] === undefined || dto[campo] === null || dto[campo] === "",
    );
    if (missing.length) {
      return res.status(400).json({
        error: "Campos obrigatorios ausentes para geracao do DUAM virtual.",
        campos: missing,
      });
    }

    const duamVirtual = await gerarDuamVirtualSig(dto);
    res.json(duamVirtual);
  } catch (error) {
    next(error);
  }
});

app.post("/api/public/boletos/imprimir", async (req, res, next) => {
  try {
    const { duam, parcelas, ccp, isTodasParcela } = req.body || {};
    if (!duam || !parcelas || !ccp) {
      return res.status(400).json({
        error: "Informe duam, parcelas (ex: 1 ou 1,2) e ccp para imprimir.",
      });
    }

    const pdf = await imprimirDuamSig({
      duam,
      parcelas,
      ccp,
      isTodasParcela,
    });

    if (!pdf) {
      return res
        .status(404)
        .json({ error: "Nao foi possivel gerar o PDF do DUAM." });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.send(pdf);
  } catch (error) {
    next(error);
  }
});

app.post("/api/public/boletos/imprimir-virtual", async (req, res, next) => {
  try {
    const { duam, parcela, imprimirTodasParcela } = req.body || {};
    if (!duam || parcela === undefined) {
      return res.status(400).json({
        error: "Informe duam e parcela para imprimir o DUAM virtual.",
      });
    }

    const pdf = await imprimirDuamVirtualSig({
      duam,
      parcela,
      imprimirTodasParcela: Boolean(imprimirTodasParcela),
    });

    if (!pdf) {
      return res
        .status(404)
        .json({ error: "Nao foi possivel gerar o PDF do DUAM virtual." });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.send(pdf);
  } catch (error) {
    next(error);
  }
});

app.post("/functions/consultarContribuinte", async (req, res, next) => {
  try {
    const documento = normalizeDocumento(req.body?.cpf || req.body?.cnpj);
    const isCpf = documento.length === 11;

    if (!documento) {
      return res.status(400).json({ error: "CPF ou CNPJ e obrigatorio." });
    }
    if (isCpf && !isValidCpf(documento)) {
      return res.status(400).json({ error: "CPF informado e invalido." });
    }
    if (!isCpf && documento.length !== 14) {
      return res.status(400).json({ error: "CNPJ informado e invalido." });
    }

    const imoveis = await fetchImoveisPorDocumento(documento, isCpf);

    if (!imoveis.length) {
      return res.status(404).json({
        mensagem: "Nenhum imovel encontrado para este documento.",
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
        error: "Informe inscricao ou CCI do imovel.",
      });
    }

    const [duams, dividasAtivas] = await Promise.all([
      fetchDebitosEmAberto(identificador),
      fetchDividasAtivas(identificador),
    ]);

    if (!duams.length && !dividasAtivas.length) {
      return res
        .status(404)
        .json({ error: "Nenhum debito encontrado para este imovel." });
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
        .json({ error: "Informe inscricao ou CCI para consultar o imovel." });
    }

    const detalhes = await fetchDetalhesImovel({ inscricao, cci });

    if (!detalhes) {
      return res.status(404).json({ error: "Imovel nao encontrado." });
    }

    const detalhesMapeados = mapDetalhesImovel(detalhes);
    res.json(detalhesMapeados);
  } catch (error) {
    next(error);
  }
});

// Rotas nao implementadas, mantidas para compatibilidade com o front
app.post("/functions/simularParcelamento", (_req, res) => {
  res.status(501).json({ error: "Simulacao nao implementada neste backend." });
});

app.post("/functions/emitirDuam", (_req, res) => {
  res.status(501).json({ error: "Emissao de DUAM nao implementada." });
});

app.post("/functions/processarPagamentoOnline", (_req, res) => {
  res
    .status(501)
    .json({ error: "Pagamento online nao implementado neste backend." });
});

app.post("/functions/consultarStatusPagamentos", (_req, res) => {
  res.status(501).json({ error: "Consulta de status nao implementada." });
});

app.post("/functions/getApiMetrics", (_req, res) => {
  res.status(200).json({ status: "ok", origem: "backend iptu5" });
});

app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const doc = normalizeDocumento(req.body?.cpf || req.body?.cnpj || "");
  const maskedDoc = maskDocumento(doc);

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
      .json({ error: "Servico temporariamente indisponivel. Tente novamente." });
  }

  if (status === 404) {
    return res
      .status(404)
      .json({ error: "Registro nao encontrado para os parametros informados." });
  }

  if (status === 401) {
    return res
      .status(401)
      .json({
        error: "Falha na autenticacao com o sistema Prodata. Verifique as credenciais.",
      });
  }

  if (status >= 500) {
    return res.status(status).json({
      error: "Ocorreu um erro ao consultar os dados de IPTU. Tente novamente.",
    });
  }

  return res.status(status).json({
    error: err.message || "Erro ao processar requisicao.",
    detalhes: err.data,
  });
});

app.listen(PORT, () => {
  console.log(`Backend IPTU rodando em http://localhost:${PORT}`);
});
