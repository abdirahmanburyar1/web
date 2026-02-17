# Backend API requirements for the mobile (collector) app

The collector app talks to the **tenant portal** base URL (e.g. `https://water.aquatrack.so`). All requests use that base + path. The backend must accept requests from native mobile clients (no CORS for non-browser; ensure auth and body format are correct).

---

## 1. Login (no auth required)

**POST** `{base}/api/auth/login`

**Headers:**
- `Content-Type: application/json`
- `Accept: application/json`
- `User-Agent: AquaTrack/1.0` (optional but recommended)

**Body (JSON):**
- `username` (string) – collector username, or
- `email` (string) – alternative to username
- `password` (string) – required
- `tenantSlug` (string, optional) – e.g. `"water"` from `water.aquatrack.so`; backend should validate user belongs to this tenant when provided

**Success (200):**
```json
{
  "token": "<JWT>",
  "user": {
    "id": "...",
    "email": "...",
    "username": "...",
    "fullName": "...",
    "roleType": "COLLECTOR",
    "tenantId": "...",
    "tenantSlug": "water",
    "tenantName": "...",
    "tenantStatus": "ACTIVE"
  }
}
```

**Errors:** `400` (body/validation), `401` (invalid credentials), `403` (deactivated, suspended, or tenant mismatch).

---

## 2. Authenticated APIs (after login)

All other requests must include:

**Headers:**
- `Authorization: Bearer <token>` – JWT from login
- `Content-Type: application/json`
- `Accept: application/json`
- `User-Agent: AquaTrackCollector/1.0` (optional)

The backend uses `getTenantUserOrNull(req)`: it reads the Bearer token, verifies the JWT, loads the user and tenant, and returns `null` if token missing/invalid or tenant not ACTIVE. Return `401` when auth is required and user is null.

---

## 3. Endpoints used by the collector app

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/login` | No | Login; returns `token` and `user` |
| GET | `/api/tenant/collector/my-meters` | Bearer | List meters assigned to the collector. Query: `search` (optional), `limit` (default 50) |
| POST | `/api/tenant/meter-readings` | Bearer | Submit a reading. Body: `{ "meterId": "...", "value": number, "unit": "m³" (optional) }` |

---

## 4. What the backend must provide

1. **Login**
   - Accept POST with JSON body: `username` or `email`, `password`, optional `tenantSlug`.
   - Validate credentials, optionally enforce `tenantSlug` against the user’s tenant.
   - Return JWT and user object including `tenantId`, `tenantStatus` (and optionally `tenantSlug`, `tenantName`).

2. **JWT**
   - Issued with tenant context; verified by existing auth middleware.
   - Tenant APIs must reject suspended tenants and require `tenantId` in the token.

3. **No extra CORS for mobile**
   - CORS is for browsers. Mobile app is a native client; ensure the server allows requests to `/api/auth/login` and `/api/tenant/*` (no special CORS needed for the app itself, but keep CORS correct for the tenant web app on the same origin).

4. **Network**
   - Server must be reachable from the internet (or same network as the device for dev). If the request never reaches the server, the problem is usually DNS, firewall, or device network (e.g. Android INTERNET permission, network security config).

---

## 5. If the mobile app “does not reach the server”

- Confirm the device can resolve the host (e.g. open `https://water.aquatrack.so` in the device browser).
- Check server logs: no log entry for the request means the request never arrived (network/DNS/firewall or client-side failure before send).
- On Android: `INTERNET` permission and, if using HTTP or custom certs, `networkSecurityConfig` / `usesCleartextTraffic` as needed.
- App logs: `[Login] request failed: ...` and stack trace show the client-side error (e.g. `SocketException`, `HandshakeException`, timeout).
