export const formatThousand = (value: number) => {
  return value.toLocaleString();
};

export const formatMetric = (number: number) => {
  const absNumber = Math.abs(number);

  if (absNumber < 1_000) {
    return number.toString();
  } else if (absNumber < 1_000_000) {
    return formatShort(number, 1_000, "K");
  } else if (absNumber < 1_000_000_000) {
    return formatShort(number, 1_000_000, "M");
  } else {
    return formatShort(number, 1_000_000_000, "B");
  }
};

function formatShort(num: number, divisor: number, suffix: string): string {
  const value = num / divisor;
  return value % 1 === 0
    ? `${value.toFixed(0)}${suffix}`
    : `${value.toFixed(1)}${suffix}`;
}

export const getNumberFormat = ({
  value,
  fixed,
  prefix = "",
  suffix = "",
  isSign = false,
  notation = "standard",
}: {
  value: number;
  fixed: number;
  prefix: string;
  suffix: string;
  isSign: boolean;
  notation?: "thousand" | "metric" | "standard";
}) => {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isZero = value === 0;
  const fixedValue = parseFloat(Math.abs(value).toFixed(fixed));

  let formattedValue = "";

  switch (notation) {
    case "thousand":
      formattedValue = formatThousand(fixedValue);
      break;
    case "metric":
      formattedValue = formatMetric(fixedValue);
      break;
    case "standard":
      formattedValue = fixedValue.toString();
      break;
    default:
      formattedValue = fixedValue.toString();
  }

  return {
    style: {
      positive: isPositive,
      negative: isNegative,
      zero: value === 0,
    },
    text: `${
      isZero ? "" : isPositive ? (isSign ? "+" : "") : "-"
    }${prefix}${formattedValue}${suffix}`,
  };
};
