# Portal IPTU Digital

Aplicacao React (Vite) para consulta de contribuintes, simulacao de parcelamentos,
acompanhamento de debitos e emissao de guias de pagamento do IPTU.

## Requisitos

- Node.js 18 ou superior
- npm 10 ou superior

## Variaveis de ambiente

Crie um arquivo `.env` (ou `.env.local`) na raiz do projeto com os valores corretos:

```bash
VITE_MUNICIPAL_API_URL=https://seu-backend/municipal
VITE_AUTH_URL=https://seu-backend/login
```

- `VITE_MUNICIPAL_API_URL`: endpoint usado pelo cliente `municipalApi` para consultar contribuinte,
  simular debitos, gerar DUAM etc.
- `VITE_AUTH_URL`: URL para onde o usuario sera redirecionado em fluxos de autenticacao.

## Executando localmente

```bash
npm install
npm run dev
```

O servidor sobe em `http://localhost:5173` por padrao.

## Build para producao

```bash
npm run build
```

Os artefatos finais ficam em `dist/`. Publique esse conteudo em qualquer ambiente que sirva
arquivos estaticos (Nginx, Vercel, Cloudflare Pages etc.).

## Como utilizar o portal

1. Acesse a pagina inicial e informe CPF ou CNPJ no campo principal. O sistema valida formato
   automaticamente antes de permitir a busca.
2. Utilize filtros avancados (endereco, inscricao, status) para refinar os resultados carregados.
3. Nos cards de cada imovel escolha:
   - **Ver Debitos** para listar parcelas em aberto e emitir guias.
   - **Detalhes do Imovel** para visualizar informacoes cadastrais e situacao geral.
4. Use a aba **Simulacao** para calcular parcelamentos. Informe o valor desejado e o sistema consulta
   o backend via `municipalApi.functions.invoke('simularParcelamento')`.
5. Em **Pagamento Online** selecione PIX ou cartao. As requisicoes sao encaminhadas via
   `municipalApi.functions.invoke('processarPagamentoOnline')`.
6. Monitore o status dos pagamentos e das integracoes em **StatusPagamentos** e **MonitoramentoAPI**,
   que consomem as funcoes `consultarStatusPagamentos` e `getApiMetrics`.
7. No menu do usuario acesse **Configuracoes** para atualizar dados pessoais, limpar historico ou
   salvar metodos de pagamento. Tudo e sincronizado com `municipalApi.auth`.

Em caso de duvidas ou sugestoes, utilize os canais oficiais da equipe responsavel
pelo Portal IPTU Digital.
