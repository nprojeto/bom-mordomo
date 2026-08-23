# Bom Mordomo

Controle financeiro da casa. Frontend em Nuxt 3, publicado no GitHub Pages.
Backend no Supabase (Postgres + Edge Function `api`).

## Publicar

1. Envie estes arquivos para o repositório `bom-mordomo` na branch `main`.
2. No GitHub: **Settings → Pages → Source: GitHub Actions**.
3. A cada envio, o site é gerado e publicado automaticamente.

Endereço final: `https://nprojeto.github.io/bom-mordomo/`

## Onde ficam as configurações

- `nuxt.config.ts` → endereço do Supabase, chave pública e `baseURL`.
- Se o repositório mudar de nome, altere `app.baseURL` para `/novo-nome/`.

## Páginas

| Rota | O que faz |
|---|---|
| `/login` | Entrada com e-mail e senha |
| `/` | Painel do mês |
| `/calendario` | Visão mensal de contas e entradas |
| `/contas` | Cadastro de fixas, parceladas e entradas |
| `/transacoes` | Gastos importados do banco |
| `/reservas` | Investimentos e fundo de reserva |
| `/ajustes` | E-mail diário, categorias, sair |
