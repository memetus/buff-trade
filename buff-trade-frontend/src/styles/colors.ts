// Central color tokens derived from the shared design reference.
// Values are hex strings so they can be used directly in CSS-in-JS or inline styles.
export const colorPalette = {
  neutral: {
    token11: "#000000", // BG, CTA text
    token10: "#0D0D0D", // Surface 01
    token09: "#101010", // Surface 02
    token08: "#1B1C1D", // Surface 03
    token07: "#242629", // Stroke, button
    token06: "#2F3337", // Stroke, button alt
    token05: "#585F67", // Disabled text
    token04: "#757C82", // Secondary text 03
    token03: "#A1A6AA", // Secondary text 02
    token02: "#D1D9E0", // Secondary text 01
    token01: "#F5F5F5", // Primary text, CTA btn
  },
  accent: {
    point01: "#FF6A2F",
    point02: "#C7430F",
    green01: "#55F678",
    green02: "#162218",
    red01: "#F65555",
    red02: "#221616",
  },
} as const;

export type NeutralColorToken = keyof typeof colorPalette.neutral;
export type AccentColorToken = keyof typeof colorPalette.accent;
export type ColorToken =
  | NeutralColorToken
  | AccentColorToken;

export const getColor = (token: ColorToken) =>
  token in colorPalette.neutral
    ? colorPalette.neutral[token as NeutralColorToken]
    : colorPalette.accent[token as AccentColorToken];

const toCSSVarName = (scope: "neutral" | "accent", token: string) =>
  `--color-${scope}-${token}`;

const buildCSSVariables = () => {
  const lines: string[] = [];

  (Object.keys(colorPalette) as Array<"neutral" | "accent">).forEach(
    (scope) => {
      Object.entries(colorPalette[scope]).forEach(([token, value]) => {
        lines.push(`${toCSSVarName(scope, token)}: ${value};`);
      });
    }
  );

  return `:root{${lines.join("")}}`;
};

export const colorCSSVariables = buildCSSVariables();

type CreateVarRecord<T extends Record<string, string>> = {
  [K in keyof T]: `var(${string})`;
};

const mapToCSSVars = <T extends Record<string, string>>(
  scope: "neutral" | "accent",
  collection: T
) =>
  Object.fromEntries(
    Object.keys(collection).map((token) => [
      token,
      `var(${toCSSVarName(scope, token)})`,
    ])
  ) as CreateVarRecord<T>;

export const colorVars = {
  neutral: mapToCSSVars("neutral", colorPalette.neutral),
  accent: mapToCSSVars("accent", colorPalette.accent),
} as const;
