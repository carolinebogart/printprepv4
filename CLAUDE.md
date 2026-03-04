# PrintPrep — Claude Project Context

## What This App Does
SaaS for Etsy digital printable sellers. Upload artwork → select print ratios → adjust crop → download 300 DPI print-ready files. Credit-based: 1 credit = 1 image processed, regardless of how many output sizes are generated.

## Tech Stack
- **Next.js 15** (App Router), **React 19**, **Tailwind CSS 4**
- **Supabase** — PostgreSQL (v17), auth, storage (project: `jgjwetpsghiudtpjzsto`, region: `us-west-2`)
- **Stripe** — subscriptions + webhooks
- **Sharp** — image processing (must stay in `serverExternalPackages` in next.config.mjs)
- **pdf-lib**, **archiver**, **react-cropper / cropperjs**

## Dev Commands
```bash
npm run dev    # http://localhost:3000
npm run build  # NODE_OPTIONS memory flag included
npm start      # next start with --expose-gc (for manual GC in process route)
npm run lint
```
**Hosting:** Hostinger Cloud Web Hosting (Node.js runtime, managed process + reverse proxy).
**Production domain:** `https://allgoodweb.com`
**Build memory:** `NODE_OPTIONS='--max-old-space-size=3072'` (set in package.json)
**Stripe:** Currently sandbox (test) keys — publishable + secret keys must be swapped for live keys before launch.
**Cleanup cron:** hPanel Cron Jobs, runs daily — `POST https://allgoodweb.com/api/cleanup` with `Authorization: Bearer <CRON_KEY>`

## Config Gotchas
- `MAX_UPLOAD_SIZE_MB=50` in `.env.local` is overridden in the upload route — actual limit is **400MB**
- `sharp` must stay in `serverExternalPackages` in `next.config.mjs` or SSR breaks
- Server action body size limit is 50MB in `next.config.mjs` (separate from upload limit)
- Stripe webhook secret changes on every `stripe listen` restart — update `.env.local` and restart dev server

## Conventions
- Path alias: `@/*` → `./` (jsconfig.json)
- All secrets in `.env.local` — never commit
- API routes: `route.js` (Next.js route handlers)
- No test suite — verify changes manually

## MCP Servers
- **Supabase MCP** — project `jgjwetpsghiudtpjzsto`
- **Stripe MCP** — Read only

## Rules (load when working in these areas)
| File | Load when working on |
|---|---|
| `.claude/rules/structure.md` | Exploring codebase, finding files |
| `.claude/rules/architecture.md` | Processing pipeline, SSR, client/server split |
| `.claude/rules/database.md` | `lib/supabase/**`, `supabase-setup.sql`, DB queries |
| `.claude/rules/auth.md` | `app/auth/**`, `middleware.js`, session handling |
| `.claude/rules/stripe.md` | `app/api/stripe/**`, `lib/stripe.js`, `lib/credits.js` |
| `.claude/rules/image-processing.md` | `lib/image-processor.js`, `app/api/process/**`, `app/crop/**` |
| `.claude/rules/admin.md` | `app/admin/**`, `app/api/admin/**` |
| `.claude/rules/api-routes.md` | `app/api/**` route table and auth requirements |
| `.claude/rules/security.md` | `app/api/**`, `app/auth/**`, error handling, env vars |

## Reference Docs
| File | Contains |
|---|---|
| `docs/schema.md` | Full SQL DDL for all tables + functions |
| `docs/ratios.md` | All ratio/size definitions with px dimensions |
| `docs/ui-spec.md` | UI/UX specification and design system |
| `docs/stripe-test-cards.md` | Stripe test card numbers |
| `docs/impl-order.md` | Recommended build order |
| `docs/cleanup.md` | Daily cleanup cron — file expiry, retention tiers, endpoint details |

# currentDate
Today's date is 2026-02-28.
