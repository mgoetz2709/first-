import type { SVGProps } from "react";

const IllustrationCaseStudyDaten = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="mgim-illustration mgim-illustration--case-study"
    viewBox="0 0 240 180"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="cs3-title cs3-desc"
    {...props}
  >
    <title id="cs3-title">{"Migration auf eine neue Plattform"}</title>
    <desc id="cs3-desc">{"Zwei Datenspeicher, verbunden durch einen Pfeil – Symbol für die Migration mehrerer Marken auf eine neue Plattform."}</desc>
    <g fill="none" stroke="var(--color-ink-700, #6D6E71)" strokeWidth={5}>
      <ellipse cx={60} cy={60} rx={28} ry={12} />
      <path d="M32,60 V110 A28,12 0 0 0 88,110 V60" />
      <ellipse cx={180} cy={60} rx={28} ry={12} />
      <path d="M152,60 V110 A28,12 0 0 0 208,110 V60" />
    </g>
    <path
      d="M100,90 H140"
      stroke="var(--color-accent-500, #3A9AC9)"
      strokeWidth={7}
      strokeLinecap="round"
      markerEnd="url(#arrow)"
    />
    <defs>
      <marker id="arrow" markerWidth={10} markerHeight={10} refX={6} refY={5} orient="auto">
        <path d="M0,0 L10,5 L0,10 Z" fill="var(--color-accent-500, #3A9AC9)" />
      </marker>
    </defs>
  </svg>
);
export default IllustrationCaseStudyDaten;
