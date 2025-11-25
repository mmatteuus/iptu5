# Backend IPTU (SIG Integracao)

API Express que orquestra chamadas ao SIG Integracao (Prodata):
- Buscar imoveis por CPF/CNPJ (`/functions/consultarContribuinte`)
- Consultar debitos e divida ativa por imovel (`/functions/consultarDebitos`)
- Consultar detalhes do imovel (`/functions/consultarDetalhesImovel`)

## Configuracao

1) Copie `.env.example` para `.env` e preencha:
```
PRODATA_BASE_URL=https://seu-endpoint-sig.com
PRODATA_AUTH_PATH=/auth    # use /autenticacao se sua instância exigir
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

- `POST /functions/consultarContribuinte`
  - Corpo: `{ "cpf": "12345678900" }` ou `{ "cnpj": "12345678000199" }`
  - Retorna: `{ totalImoveis, itens: [ { inscricao, cci, endereco, situacao, dividasAtivas, iptuPendentes, ... } ] }`

- `POST /functions/consultarDebitos`
  - Corpo: `{ "cci": "12345" }` (ou `inscricao`/`ccp`)
  - Retorna: `{ imovel, proprietario, itens: [duams], dividasAtivas, quantidadeDebitos, totalDebitos }`

- `POST /functions/consultarDetalhesImovel`
  - Corpo: `{ "cci": "12345" }` (ou `inscricao`)
  - Retorna dados cadastrais/endereco do imovel.

Rotas de simulacao/emissao/pagamento retornam `501` apenas para manter compatibilidade com o front.

## Notas de implementacao

- Autenticacao Prodata com cache de token via `PRODATA_USER`/`PRODATA_PASSWORD` (caminho configuravel por `PRODATA_AUTH_PATH`). Se preferir token fixo, use `PRODATA_AUTH_TOKEN`.
- Validacao de CPF com digito verificador; CNPJ checa tamanho (14 digitos).
- Paginacao configuravel via `PRODATA_IMOVEIS_PAGE_SIZE` e `PRODATA_IMOVEIS_MAX_PAGES`.
- Timeout padrao de 10s (`PRODATA_TIMEOUT_MS`).
- `Authorization: Bearer <token>` enviado automaticamente apos login (ou via token fixo). Cada requisicao recebe `x-correlation-id` para rastreamento.
