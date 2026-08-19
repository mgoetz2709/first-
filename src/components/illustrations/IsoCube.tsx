/**
 * Gemeinsamer Baustein für die isometrischen Illustrationen (Ansatz-Phasen,
 * Case-Study-Themen): ein extrudierter Würfel aus drei schattierten Flächen
 * (hell oben, mittel links, dunkel rechts), gebaut ausschließlich aus den
 * bestehenden CI-Farb-Tokens (globals.css) — keine eigene Illustrations-
 * Palette mehr wie zuvor (--mgim-ink/-brass/-steel).
 */
type IsoCubeProps = {
  cx: number;
  cy: number;
  edge: number;
  variant?: "ink" | "accent";
};

const PALETTES = {
  ink: {
    top: "var(--color-ink-500, #A8A9AD)",
    left: "var(--color-ink-700, #6D6E71)",
    right: "var(--color-ink-900, #231F20)",
  },
  accent: {
    top: "var(--color-accent-400, #75B8D9)",
    left: "var(--color-accent-500, #3A9AC9)",
    right: "var(--color-accent-700, #1F6A9A)",
  },
};

export default function IsoCube({ cx, cy, edge, variant = "ink" }: IsoCubeProps) {
  const ex = edge * 0.866;
  const palette = PALETTES[variant];
  const top = `${cx},${cy - edge} ${cx + ex},${cy - edge * 0.5} ${cx},${cy} ${cx - ex},${cy - edge * 0.5}`;
  const left = `${cx - ex},${cy - edge * 0.5} ${cx},${cy} ${cx},${cy + edge} ${cx - ex},${cy + edge * 1.5}`;
  const right = `${cx + ex},${cy - edge * 0.5} ${cx},${cy} ${cx},${cy + edge} ${cx + ex},${cy + edge * 1.5}`;
  return (
    <g>
      <polygon points={left} fill={palette.left} />
      <polygon points={right} fill={palette.right} />
      <polygon points={top} fill={palette.top} />
    </g>
  );
}
