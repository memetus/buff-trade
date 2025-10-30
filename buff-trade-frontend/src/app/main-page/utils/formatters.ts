export const formatMarketCap = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "$0";
  }
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export const formatPercent = (value?: number, fractionDigits = 2) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "0%";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(fractionDigits)}%`;
};

export const formatSolAmount = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "0";
  }
  if (value >= 1) {
    return value.toFixed(2);
  }
  return value.toPrecision(2);
};

export const formatChange = (value?: number, fractionDigits = 0) => {
  const v = value ?? 0;
  const arrow = v >= 0 ? "▲" : "▼";
  const display = Math.abs(v).toFixed(fractionDigits);
  return `${arrow} ${display}%`;
};

export const formatSymbol = (value?: string) => {
  if (!value) return "";
  return value.startsWith("$") ? value : `$${value}`;
};
