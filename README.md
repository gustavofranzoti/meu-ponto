# Meu Ponto

App web que mostra os próximos ônibus de um ponto de São Paulo com dados reais da **API Olho Vivo (SPTrans)**.

## O que faz
- Busca pontos por nome ou endereço.
- Painel com os próximos ônibus, em minutos, atualizado a cada 30 segundos.
- Filtro "só veículos acessíveis" e destaque ♿ nos veículos acessíveis.
- Mapa (Leaflet) com o ponto e a posição dos ônibus previstos.
- Pontos favoritos salvos no navegador.
- Modo de alto contraste com fonte grande.

## Como funciona
A API Olho Vivo exige login com cookie de sessão e não permite chamadas diretas do navegador (CORS).
Por isso o front-end (`index.html`, `style.css`, `app.js`) chama a função serverless `api/olhovivo.js`,
que autentica com o token (guardado em variável de ambiente) e repassa a consulta.

## Como executar
1. Gere seu token em *Meus Aplicativos* na área de desenvolvedores da SPTrans.
2. Instale a CLI: `npm i -g vercel`
3. Na pasta do projeto, crie `.env` com `OLHOVIVO_TOKEN=seu_token` e rode `vercel dev`.
4. Abra `http://localhost:3000`.

## Deploy no Vercel
1. Suba o repositório no GitHub e importe em **Add New → Project**.
2. Em **Settings → Environment Variables**, crie `OLHOVIVO_TOKEN` com o seu token.
3. Clique em **Deploy** (se já tiver feito deploy antes, faça *Redeploy* após criar a variável).

## Créditos
Dados: SPTrans – API Olho Vivo. Mapa: OpenStreetMap e Leaflet.
