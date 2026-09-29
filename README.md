# Calendário Editorial

App web para organizar ideias de conteúdo (incluindo posts salvos do Instagram) e planejar o calendário editorial com as artes de cada post.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Supabase (Auth por link mágico, Postgres, Storage) — schema dedicado `editorial`

## Funcionalidades

- **Banco de ideias** (`/ideias`): salve ideias colando o link de um post do Instagram e/ou subindo um print, com notas e tags. O Instagram não oferece API pública para ler a sua lista de "salvos", por isso a importação é manual (colar o link e/ou print).
- **Calendário** (`/calendario`): visão mensal, cria/edita posts com data, plataforma, formato (feed/reel/stories/carrossel), legenda, tags, status (ideia → rascunho → arte pronta → agendado → publicado) e upload da arte final. Posts sem data ficam numa lista lateral.
- Uma ideia pode virar um post no calendário com um clique ("Usar no calendário").

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`. As credenciais do Supabase já estão em `.env.local` (não versionado).

## Backend (Supabase)

Projeto: `roberta28cepeda's Project` (`lqzrdjwyueyeapaabhwu`), num schema próprio `editorial` para não misturar com outras tabelas da conta:

- `editorial.ideas` — ideias de conteúdo
- `editorial.posts` — posts do calendário
- bucket de Storage `editorial-media` (privado) — prints e artes

Todas as tabelas e o bucket têm Row Level Security: cada usuário só acessa os próprios dados.

## Deploy

Recomendado: [Vercel](https://vercel.com). Configure as variáveis de ambiente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (valores em `.env.local`) no projeto da Vercel, e em Supabase → Authentication → URL Configuration adicione a URL de produção em "Redirect URLs" (`https://SEU-DOMINIO/auth/callback`).

## Limitação conhecida

Testes automatizados de ponta a ponta (login e leitura/escrita no banco) não puderam ser executados neste ambiente porque o acesso de saída direto ao Supabase está bloqueado pela política de rede do container. O app segue os padrões oficiais do Supabase para Next.js (`@supabase/ssr`); vale testar o fluxo completo assim que rodar localmente ou em produção.
