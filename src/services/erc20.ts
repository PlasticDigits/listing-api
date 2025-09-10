import { ethers } from "ethers";
import { CHAINS, DEFAULT_CHAIN_ID } from "../config/chains";
import { DEAD_ADDRESS, ZERO_ADDRESS, TokenConfig } from "../config/tokens";

// Minimal ERC20 ABI for required calls
const ERC20_ABI = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

export interface SupplyBreakdown {
  chainId: string;
  tokenAddress: string;
  symbol: string;
  decimals: number;
  totalSupplyRaw: string; // raw uint256 string
  burnedZeroRaw: string;
  burnedDeadRaw: string;
  totalSupplyAdjustedRaw: string; // total - burns
  circulatingSupplyRaw: string; // alias of adjusted for now
}

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<SupplyBreakdown>>();
const DEFAULT_TTL_MS = 60_000; // 1 minute

function getProvider(
  chainKey: string = DEFAULT_CHAIN_ID
): ethers.JsonRpcProvider {
  const chain = CHAINS[chainKey as keyof typeof CHAINS];
  if (!chain) {
    throw new Error(`Unknown chain: ${chainKey}`);
  }
  // Use the first RPC URL
  return new ethers.JsonRpcProvider(chain.rpcUrls[0]);
}

function formatCacheKey(tokenAddress: string, chainKey: string): string {
  return `${chainKey}:${tokenAddress.toLowerCase()}`;
}

export async function getErc20Supply(
  token: TokenConfig,
  options?: { ttlMs?: number; chainKey?: string }
): Promise<SupplyBreakdown> {
  const chainKey = options?.chainKey ?? token.chainId ?? DEFAULT_CHAIN_ID;
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;

  const cacheKey = formatCacheKey(token.address, chainKey);
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const provider = getProvider(chainKey);
  const contract = new ethers.Contract(token.address, ERC20_ABI, provider);

  const [totalSupply, burnedZero, burnedDead, decimals, symbol] =
    await Promise.all([
      contract.totalSupply() as Promise<bigint>,
      contract.balanceOf(ZERO_ADDRESS) as Promise<bigint>,
      contract.balanceOf(DEAD_ADDRESS) as Promise<bigint>,
      // prefer provided decimals in config; fallback to on-chain
      (async () => token.decimals ?? (await contract.decimals()))(),
      (async () => token.symbol ?? (await contract.symbol()))(),
    ]);

  const totalBurned = burnedZero + burnedDead;
  const adjustedRaw = totalSupply - totalBurned;
  const adjusted = adjustedRaw < 0n ? 0n : adjustedRaw;

  const result: SupplyBreakdown = {
    chainId: chainKey,
    tokenAddress: token.address,
    symbol: symbol as string,
    decimals: Number(decimals),
    totalSupplyRaw: totalSupply.toString(),
    burnedZeroRaw: burnedZero.toString(),
    burnedDeadRaw: burnedDead.toString(),
    totalSupplyAdjustedRaw: adjusted.toString(),
    circulatingSupplyRaw: adjusted.toString(),
  };

  cache.set(cacheKey, { value: result, expiresAt: now + ttlMs });

  return result;
}

export function clearSupplyCache(): void {
  cache.clear();
}
