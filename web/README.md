# Vantage web

Next.js 16 (App Router) front end for the Vantage missing persons platform.

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm lint
pnpm build
```

The app talks to the API through an authenticated same-origin proxy (`/api/backend/*`) so the JWT
stays in an HttpOnly cookie. Set `API_URL` in `.env.local`; see `.env.example`.

See the repository root `README.md` for architecture, demo credentials and API details.
