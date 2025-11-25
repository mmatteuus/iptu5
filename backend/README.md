# Backend IPTU (SIG Integração)

API Express que orquestra as chamadas ao SIG Integração (Prodata) para:
- Buscar imóveis por CPF/CNPJ (`/functions/consultarContribuinte`)
- Consultar débitos e dívida ativa por imóvel (`/functions/consultarDebitos`)
- Consultar detalhes do imóvel (`/functions/consultarDetalhesImovel`)

## Configuração

1) Copie o arquivo `.env.example` para `.env` e preencha:
```
PRODATA_BASE_URL=https://seu-endpoint-sig.com
PRODATA_AUTH_TOKEN=seu-token
PORT=3001
```
Outras variáveis opcionais estão no exemplo (.env.example) para ajustar paginação e caminhos dos endpoints.

2) Instale as dependências do backend:
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

4) Aponte o front para o backend (arquivo `.env` na raiz do projeto React):
```
VITE_MUNICIPAL_API_URL=http://localhost:3001
```

## Endpoints expostos

- `POST /functions/consultarContribuinte`  
  Corpo: `{ "cpf": "12345678900" }` ou `{ "cnpj": "12345678000199" }`  
  Retorna: `{ totalImoveis, itens: [ { inscricao, cci, endereco, situacao, dividasAtivas, iptuPendentes, ... } ] }`

- `POST /functions/consultarDebitos`  
  Corpo: `{ "cci": "12345" }` (ou `inscricao`/`ccp`)  
  Retorna: `{ imovel, proprietario, itens: [duams], dividasAtivas, quantidadeDebitos, totalDebitos }`

- `POST /functions/consultarDetalhesImovel`  
  Corpo: `{ "cci": "12345" }` (ou `inscricao`)  
  Retorna dados cadastrais/endereço do imóvel.

Rotas de simulação/emissão/pagamento retornam `501` apenas para manter compatibilidade de URL com o front.

## Notas de implementação

- Validação de CPF com dígito verificador; CNPJ checa apenas tamanho (14 dígitos).
- Paginação configurável via `PRODATA_IMOVEIS_PAGE_SIZE` e `PRODATA_IMOVEIS_MAX_PAGES`.
- Timeout padrão de 10s (`PRODATA_TIMEOUT_MS`).
- Cabeçalho `Authorization: Bearer <token>` é enviado se `PRODATA_AUTH_TOKEN` ou `PRODATA_API_KEY` estiver definido.
- Cada requisição recebe `x-correlation-id` para rastreamento em logs.
