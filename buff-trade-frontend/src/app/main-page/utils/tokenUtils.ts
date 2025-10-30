import { TokenData } from "../types";

export const buildTokenPath = (token: TokenData) => {
  const params = new URLSearchParams({
    fundId: token.fundId,
    from: "main",
  });
  if (token.poolAddress) {
    params.set("poolAddress", token.poolAddress);
  }
  const ticker = token.ticker || token.symbol;
  if (ticker) {
    params.set("symbol", ticker);
  }
  return `/tradingview?${params.toString()}`;
};

export const buildTokenUrl = (token: TokenData) => {
  if (typeof window === "undefined") {
    return buildTokenPath(token);
  }
  return `${window.location.origin}${buildTokenPath(token)}`;
};

export const isGraduated = (token: TokenData) => {
  return (
    token.survived === true &&
    token.realTrading === true &&
    (token.marketCap || 0) >= 1000 // Market Cap이 1000 이상
  );
};
