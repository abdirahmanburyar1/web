# AquaTrack Web

**Domain: [aquatrack.so](https://aquatrack.so)**

Root domain = platform portal (login, dashboard, tenants). Companies use their subdomain (e.g. acme.aquatrack.so); tenant from session. API for the Flutter collector app.

## Setup

1. **Environment**

   Copy or ensure `web/.env` has:

   - `DATABASE_URL` – PostgreSQL connection string (Neon or local)
   - `JWT_SECRET` (optional) – set in production for secure tokens (defaults to a dev value)

2. **Dependencies**

   ```bash
   cd web && npm install
   ```

3. **Database**

   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

   This creates tables, then seeds permissions and a **platform admin** user:

   - Email: `admin@aquatrack.so`
   - Password: `admin123`

4. **Run**

   ```bash
   npm run dev
   ```

   **Development:**
   - **Root = platform:** http://localhost:3000 → redirects to /login. Use /dashboard, /tenants. No separate "platform portal" — root is the platform.
   - **Tenant (simulate subdomain):** http://localhost:3000/login?tenant=acme (tenant from session after login).

   **Production (aquatrack.so):**
   - **Root domain is the platform by default:** https://aquatrack.so → /login, /dashboard, /tenants. No "tenant portal" vs "platform portal" — root is the platform.
   - **Companies use their subdomain:** e.g. https://acme.aquatrack.so/login. Tenant is from the user's session (JWT). Info: https://aquatrack.so/enter

   Create a tenant (and its first tenant admin) from the Platform dashboard or the Tenants page.

## Deploy on Vercel

1. **Connect the repo** – Push only the `web` folder (e.g. `git subtree push --prefix=web origin main`) or use a repo that has this app at the root. Connect that repo to a new Vercel project.

2. **Environment variables** (Vercel → Project → Settings → Environment Variables):
   - `DATABASE_URL` – PostgreSQL connection string (e.g. Neon). Use the **pooled** URL for serverless.
   - `JWT_SECRET` – Set a strong secret in production (e.g. `openssl rand -base64 32`).

3. **Domains** (Vercel → Project → Settings → Domains):
   - Add `aquatrack.so` (root = platform).
   - Add `*.aquatrack.so` so tenant subdomains (e.g. `acme.aquatrack.so`) resolve to the same project.

4. **Build** – Default `npm run build` runs `prisma generate && next build`. No extra config needed.

5. **Database** – Run migrations and seed once (from your machine or a one-off script):  
   `npx prisma migrate deploy` (or `db push`) and `npx prisma db seed` with the same `DATABASE_URL`.

## Currency

- The system is **USD-based**. All amounts (subscription billing, revenue, payments volume) are in US dollars.

## Revenue model

- **$0.1 per transaction** – Platform metrics use payment count × 0.1 for revenue (USD).
- Tenant subscription limits: `maxStaff`, `maxCustomers`, `maxTransactions` (optional, per tenant).

## Flutter collector app

- App uses the same API: login, customers, dashboard, record payment.
- Set `API_BASE_URL` for your backend:
  - **Production (default):** `https://aquatrack.so`
  - Local dev: build with `--dart-define=API_BASE_URL=http://10.0.2.2:3000` (Android) or `http://localhost:3000` (iOS)
- Tenant suspension disables login and shows a “Tenant suspended” message.
