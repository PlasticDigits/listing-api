import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { formatUnits } from "ethers";
import { CHAINS } from "./config/chains";
import { TOKENS } from "./config/tokens";
import { getErc20Supply } from "./services/erc20";

const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting (configurable via env): default 360 reqs per 30 minutes per IP
const RATE_LIMIT_WINDOW_MS = Number(
  process.env.RATE_LIMIT_WINDOW_MS || 30 * 60 * 1000
);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 360);

app.use(
  rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/chains", (_req, res) => {
  res.json({ chains: CHAINS });
});

app.get("/tokens", (_req, res) => {
  res.json({ tokens: TOKENS });
});

// Legacy simple endpoint
app.get("/supply/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const token = TOKENS.find(
      (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
    );
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }
    const data = await getErc20Supply(token);
    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Internal error" });
  }
});

// CoinGecko-friendly endpoint
app.get("/api/v1/supply/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const token = TOKENS.find(
      (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
    );
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }
    const s = await getErc20Supply(token);
    res.json({
      symbol: s.symbol,
      address: s.tokenAddress,
      chain: s.chainId,
      decimals: s.decimals,
      total_supply: s.totalSupplyRaw,
      burned_zero: s.burnedZeroRaw,
      burned_dead: s.burnedDeadRaw,
      total_supply_adjusted: s.totalSupplyAdjustedRaw,
      circulating_supply: s.circulatingSupplyRaw,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Internal error" });
  }
});

// CoinGecko minimal result endpoint: { "result": "<decimal string>" }
app.get("/api/v3/supply/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const token = TOKENS.find(
      (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
    );
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }
    const s = await getErc20Supply(token);
    const resultStr = formatUnits(BigInt(s.circulatingSupplyRaw), s.decimals);
    res.json({ result: resultStr });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Internal error" });
  }
});

// CoinGecko total supply endpoint
app.get("/api/v3/supply/total/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const token = TOKENS.find(
      (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
    );
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }
    const s = await getErc20Supply(token);
    const resultStr = formatUnits(BigInt(s.totalSupplyAdjustedRaw), s.decimals);
    res.json({ result: resultStr });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Internal error" });
  }
});

// CoinGecko circulating supply endpoint
app.get("/api/v3/supply/circulating/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const token = TOKENS.find(
      (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
    );
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }
    const s = await getErc20Supply(token);
    const resultStr = formatUnits(BigInt(s.circulatingSupplyRaw), s.decimals);
    res.json({ result: resultStr });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Internal error" });
  }
});

export function startServer(port: number = Number(process.env.PORT) || 3000) {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer();
}
