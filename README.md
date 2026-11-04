## Listing API

Express API that exposes ERC‑20 token supply endpoints (CoinGecko-compatible) with simple rate limiting and in‑memory caching.

### Quick start

```bash
# Use project Node version
nvm use

# Install dependencies
npm ci

# Run in dev (ts-node)
PORT=3000 npm run dev

# Build TypeScript → dist/
npm run build

# Run built server
PORT=3000 npm start
```

### Environment

- **PORT**: HTTP port (default 3000).
- RPC endpoints and chains are configured in `src/config/chains.ts`.
- Token registry is defined in `src/config/tokens.ts`.

### Rate limiting and caching

- Rate limit (configurable): defaults to 360 requests per 30 minutes per IP.
  - `RATE_LIMIT_WINDOW_MS`: window size in ms (default: `1800000`)
  - `RATE_LIMIT_MAX`: max requests per IP per window (default: `360`)
- In‑memory cache TTL: 60 seconds per token per chain.

### Routes

- `GET /health`
  - Healthcheck.
  - Response: `{ "status": "ok" }`

- `GET /chains`
  - Lists supported chains.
  - Response: `{ "chains": { "bsc": { id, name, rpcUrls, ... } } }`

- `GET /tokens`
  - Lists configured tokens.
  - Response: `{ "tokens": [ { symbol, address, chainId, decimals? }, ... ] }`

- `GET /supply/:symbol`
  - Legacy detailed object under `data`.
  - Response:
    ```json
    {
      "data": {
        "chainId": "bsc",
        "tokenAddress": "0x...",
        "symbol": "CL8Y",
        "decimals": 18,
        "totalSupplyRaw": "...",
        "burnedZeroRaw": "...",
        "burnedDeadRaw": "...",
        "totalSupplyAdjustedRaw": "...",
        "circulatingSupplyRaw": "..."
      }
    }
    ```

- `GET /api/v1/supply/:symbol`
  - CoinGecko‑friendly detailed object.
  - Response:
    ```json
    {
      "symbol": "CL8Y",
      "address": "0x...",
      "chain": "bsc",
      "decimals": 18,
      "total_supply": "...",
      "burned_zero": "...",
      "burned_dead": "...",
      "total_supply_adjusted": "...",
      "circulating_supply": "..."
    }
    ```

- `GET /api/v3/supply/:symbol`
  - CoinGecko minimal format. `result` is a decimal string of circulating supply.
  - Response: `{ "result": "123456.789" }`

- `GET /api/v3/supply/total/:symbol`
  - Minimal total (adjusted) supply.
  - Response: `{ "result": "123456.789" }`

- `GET /api/v3/supply/circulating/:symbol`
  - Minimal circulating supply (same as `/api/v3/supply/:symbol`).
  - Response: `{ "result": "123456.789" }`

Notes:

- `:symbol` is case‑insensitive and must exist in `src/config/tokens.ts` (e.g., `CL8Y`, `CZB`).
- 404 if token is not found, 500 for unexpected errors.

### Examples

```bash
# Health
curl -s http://localhost:3000/health

# List tokens
curl -s http://localhost:3000/tokens | jq

# Minimal circulating supply
curl -s http://localhost:3000/api/v3/supply/CL8Y | jq

# Detailed payload
curl -s http://localhost:3000/api/v1/supply/CZB | jq
```

### Configure tokens and chains

- Add or edit tokens in `src/config/tokens.ts`:
  ```ts
  { symbol: "TKN", address: "0x...", chainId: "bsc", decimals: 18 }
  ```
- Chains live in `src/config/chains.ts`. Default chain key is `bsc`.

### Deployment

- Production entrypoint is `dist/server.js` (script: `npm start`).
- A Render configuration is provided in `render.yaml` if deploying to Render.


**Runtime security (2026-10-22).** The Dockerfile pins Node.js 24.22.1 Bookworm by digest, builds TypeScript, and ships only production dependencies and compiled output under the non-root Node user. Deploy the existing Coolify application using Dockerfile build pack with base `/` and Dockerfile `/Dockerfile`; runtime environment and port remain managed by Coolify. Its Docker healthcheck requires patched Node24 and `/health`. CI uses the same pinned Node release. The Forgejo repository `code/listing-api` is authoritative and mirrors to GitHub; merge there before deploying a revision available on the GitHub source.

### Dependency security maintenance

Keep Express's resolved `body-parser` on a patched compatible release: the 2.x
line must be at least **2.4.0**. The lockfile update from 2.3.0 addresses
[CVE-2026-111181 / GHSA-27r3-jxmh-p828](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828),
a compressed-request denial of service affecting the default `express.json()`
middleware. No major dependency update or automatic merging is enabled.

Regenerate only the affected transitive package with
`npm update body-parser --package-lock-only --ignore-scripts --no-audit --no-fund`.
Review the lockfile diff, then use bounded `npm ci --ignore-scripts`,
`npm run build`, `timeout 15s python3 scripts/verify_body_parser.py`, and
`npm audit --omit=dev --audit-level=high`. The isolated loopback check covers
ordinary JSON, gzip JSON, the vendor's trailing-corrupt-bytes crash condition,
and a subsequent health request. Moderate findings
remain explicit follow-ups; a passing HIGH threshold does not mean no findings.
Do not send denial-of-service probes to production. Source/build/audit acceptance
does not establish the deployed revision; verify the existing application revision
and `/health` after an authorized deployment.

Remediation and onboarding evidence are linked from
[cl8y-security#21](https://git.cl8y.com/PlasticDigits/cl8y-security/issues/21) and
[#22](https://git.cl8y.com/PlasticDigits/cl8y-security/issues/22).
