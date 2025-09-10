import { ChainId } from "./chains";

export interface TokenConfig {
  symbol: string;
  address: string;
  chainId: ChainId;
  decimals?: number; // default 18 unless specified
}

// Global token registry. For now only BSC as requested.
export const TOKENS: TokenConfig[] = [
  {
    symbol: "CL8Y",
    address: "0x8F452a1fdd388A45e1080992eFF051b4dd9048d2",
    chainId: "bsc"
  },
  {
    symbol: "CZB",
    address: "0xD963b2236D227a0302E19F2f9595F424950dc186",
    chainId: "bsc"
  }
];

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

