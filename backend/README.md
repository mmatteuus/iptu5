# Backend IPTU (SIG Integracao)

API Express que orquestra chamadas ao SIG Integracao (Prodata) com rotas publicas para consulta, simulacao e geracao de DUAM/boletos.

## Configuracao

1) Copie `.env.example` para `.env` e preencha:
```
PRODATA_BASE_URL=https://seu-endpoint-sig.com
PRODATA_AUTH_PATH=/auth    # use /autenticacao se sua instancia exigir
PRODATA_USER=seu_usuario_ou_cpf
PRODATA_PASSWORD=sua_senha
# Se quiser token fixo, opcionalmente defina PRODATA_AUTH_TOKEN
PORT=3001
```
Demais variaveis opcionais estao no `.env.example` (paginacao, timeouts, caminhos de endpoints).

2) Instale dependencias:
```
cd backend
npm install
```

3) Suba o servidor:
```
npm run dev
# ou
npm start
```

4) Aponte o front (`.env` na raiz do React):
```
VITE_MUNICIPAL_API_URL=http://localhost:3001
```

## Endpoints expostos

Novos para o front publico:

- `POST /api/public/boletos/consulta`
  - Corpo: `{ "cpfCnpj": "...", "inscricaoImobiliaria": "...", "ano": 2025, "cci": "...", "ccp": "..." }`
  - Retorna lista de DUAMs com parcelas (linha digitavel/codigo de barras) filtrando por inscricao/CCI/CCP.

- `POST /api/public/boletos/simular`
  - Corpo segue o DTO do SIG `/arrecadacao/simulacaoRepactuacao` (campos obrigatorios validados). Responde com a simulacao do SIG.

- `POST /api/public/boletos/gerar`
  - Corpo segue o DTO do SIG `/arrecadacao/gerarDuamVirtual` (cpfCnpj, nomeContribuinte, anoRef, mesRef, parcelas, receitaPrincipal + opcionais). Retorna DUAM virtual normalizado (parcelas com linha digitavel/pix).

- `POST /api/public/boletos/imprimir`
  - Corpo: `{ "duam": 123, "parcelas": "1" ou "1,2", "ccp": 456, "isTodasParcela": false }`
  - Retorna PDF do DUAM real.

- `POST /api/public/boletos/imprimir-virtual`
  - Corpo: `{ "duam": 123, "parcela": 1, "imprimirTodasParcela": false }`
  - Retorna PDF do DUAM virtual.

Rotas legadas mantidas para compatibilidade:

- `POST /functions/consultarContribuinte`
- `POST /functions/consultarDebitos`
- `POST /functions/consultarDetalhesImovel`

Rotas de simulacao/emissao/pagamento na namespace `/functions` retornam `501` apenas para manter compatibilidade com o front antigo.

## Notas de implementacao

- Autenticacao Prodata com cache de token via `PRODATA_USER`/`PRODATA_PASSWORD` (caminho configuravel por `PRODATA_AUTH_PATH`). Se preferir token fixo, use `PRODATA_AUTH_TOKEN`.
- Validacao de CPF com digito verificador; CNPJ checa tamanho (14 digitos).
- Paginacao configuravel via `PRODATA_IMOVEIS_PAGE_SIZE` e `PRODATA_IMOVEIS_MAX_PAGES`.
- Timeout padrao de 10s (`PRODATA_TIMEOUT_MS`).
- `Authorization: Bearer <token>` enviado automaticamente apos login (ou via token fixo). Cada requisicao recebe `x-correlation-id` para rastreamento.
