/**
 * Shuttle design: black + deep navy surfaces, electric blue primary,
 * silver text and green accents. Progress uses red / yellow / green.
 */
export const c = {
  bg: "#05070D",
  surface: "#0B1220",
  surfaceHi: "#111B2E",
  border: "#1C2A44",
  blue: "#2F7BFF",
  blueBright: "#5AA0FF",
  blueDeep: "#0A2A66",
  silver: "#C9D1DC",
  silverDim: "#8A94A6",
  silverFaint: "#4E5A6E",
  white: "#F4F7FB",
  green: "#22E28B",
  greenSoft: "rgba(34,226,139,0.14)",
  red: "#FF4D5E",
  yellow: "#FFC83D",
  track: "#1A2538",
};

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };

/** For goals you want to REACH (protein, water, workouts): red → yellow → green. */
export function reachColor(pct: number) {
  if (pct >= 0.9) return c.green;
  if (pct >= 0.5) return c.yellow;
  return c.red;
}

/** For LIMITS you shouldn't pass (calories): green while under, yellow just over, red well over. */
export function limitColor(pct: number) {
  if (pct <= 1) return c.green;
  if (pct <= 1.1) return c.yellow;
  return c.red;
}
