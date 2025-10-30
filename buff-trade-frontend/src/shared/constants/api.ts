/**
 * API 관련 상수 정의
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://dev-buff-main-webserver.bufftrade.store";
export const DEXSCREENER_API_URL =
  process.env.NEXT_PUBLIC_DEXSCREENER_API_URL || "https://api.dexscreener.com";
export const JUPITER_API_URL =
  process.env.NEXT_PUBLIC_JUPITER_API_URL || "https://lite-api.jup.ag";

export const API_ENDPOINTS = {
  // Agent related
  AGENT_DASHBOARD: `${API_BASE_URL}/agent-data/agent-dashboard`,
  AGENT_CARD: (fundId: string) =>
    `${API_BASE_URL}/agent-data/agent-card/${fundId}`,
  AGENT_STAT: (fundId: string) =>
    `${API_BASE_URL}/agent-data/agent-stat/${fundId}`,
  AGENT_METADATA: (fundId: string) =>
    `${API_BASE_URL}/agent-data/agent-metadata/${fundId}`,
  AGENT_ACTIVITY: (fundId: string) =>
    `${API_BASE_URL}/agent-data/activity/${fundId}`,
  AGENT_PORTFOLIO: (fundId: string) =>
    `${API_BASE_URL}/agent-data/portfolio/${fundId}`,
  TOP_PORTFOLIOS: (fundId: string) =>
    `${API_BASE_URL}/agent-data/top-portfolios/${fundId}`,
  TOKEN_HOLDERS: (fundId: string) =>
    `${API_BASE_URL}/agent-data/token-holders/${fundId}`,
  TOKEN_TRANSACTIONS: (fundId: string) =>
    `${API_BASE_URL}/agent-data/token-transactions/${fundId}`,
  TRANSACTION_TICKER: `${API_BASE_URL}/token/transaction-ticker`,

  // Token related
  TOKEN_PAIRS: `${DEXSCREENER_API_URL}/latest/dex/tokens`,
  TOKEN_CANDLES: `${DEXSCREENER_API_URL}/latest/dex/charts`,

  // Jupiter related
  JUPITER_QUOTE: `${JUPITER_API_URL}/swap/v1/quote`,

  // User related
  USER_LOGIN: `${API_BASE_URL}/users/login`,
  USER_DETAIL: `${API_BASE_URL}/users/detail`,
  USER_VERIFY_INVITED: `${API_BASE_URL}/users/verify-invited`,
  // Profile related
  PROFILE: `${API_BASE_URL}/profile`,
  PROFILE_BALANCE: `${API_BASE_URL}/profile/balance`,
  PROFILE_TOKEN: `${API_BASE_URL}/profile/token`,

  // Creator related
  CREATOR_POOLS_FEES: `${API_BASE_URL}/dev/get-pools-fees-by-creator`,
  CREATOR_CLAIM_TRADING_FEE: `${API_BASE_URL}/dev/claim-creator-trading-fee`,
} as const;

// API Helper functions
export const buildQueryString = (
  params: Record<string, string | number | boolean>
): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
};

export const buildUrl = (
  endpoint: string,
  params?: Record<string, string | number | boolean>
): string => {
  if (params) {
    const queryString = buildQueryString(params);
    return `${endpoint}?${queryString}`;
  }
  return endpoint;
};
