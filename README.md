# AquaTrack Web – Platform & Tenant Portals

**Domain: [aquatrack.so](https://aquatrack.so)**

Next.js app with Platform Admin and Tenant portals, plus API for the Flutter collector app.

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
   - Home: http://localhost:3000  
   - Platform Admin: http://localhost:3000/platform/login  
   - Tenant Portal: go to http://localhost:3000/enter, enter tenant slug, then use `/login?tenant=acme` (or open that URL directly).

   **Production (aquatrack.so):**
   - Home: https://aquatrack.so (no login; tenants cannot log in on the root domain).
   - Platform Admin: https://aquatrack.so/platform/login  
   - Tenant Portal: **subdomain per tenant** — e.g. https://acme.aquatrack.so/login, https://acme.aquatrack.so/dashboard. Tenant is identified by subdomain and `tenant_id` in session (JWT). Root domain has no tenant login; use **/enter** to type your tenant subdomain and get redirected to `https://{slug}.aquatrack.so`.

   Create a tenant (and its first tenant admin) from the Platform dashboard or the Tenants page.

## Revenue model

- **$0.1 per transaction** – Platform metrics use payment count × 0.1 for revenue.
- Tenant subscription limits: `maxStaff`, `maxCustomers`, `maxTransactions` (optional, per tenant).

## Flutter collector app

- App uses the same API: login, customers, dashboard, record payment.
- Set `API_BASE_URL` for your backend:
  - **Production (default):** `https://aquatrack.so`
  - Local dev: build with `--dart-define=API_BASE_URL=http://10.0.2.2:3000` (Android) or `http://localhost:3000` (iOS)
- Tenant suspension disables login and shows a “Tenant suspended” message.
