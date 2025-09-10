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

- Rate limit (configurable): defaults to 60 requests per 30 minutes per IP.
  - `RATE_LIMIT_WINDOW_MS`: window size in ms (default: `1800000`)
  - `RATE_LIMIT_MAX`: max requests per IP per window (default: `60`)
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
