export type ChainId = "bsc";

export interface ChainConfig {
  id: ChainId;
  name: string;
  rpcUrls: string[];
  explorerUrl?: string;
  chainIdNumeric?: number;
}

export const CHAINS: Record<ChainId, ChainConfig> = {
  bsc: {
    id: "bsc",
    name: "BNB Smart Chain",
    rpcUrls: [
      // Primary RPC as provided
      "https://bsc-dataseed.bnbchain.org"
    ],
    explorerUrl: "https://bscscan.com",
    chainIdNumeric: 56
  }
};

export const DEFAULT_CHAIN_ID: ChainId = "bsc";

