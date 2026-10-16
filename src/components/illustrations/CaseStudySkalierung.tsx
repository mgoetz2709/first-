import type { SVGProps } from "react";

const IllustrationCaseStudySkalierung = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="mgim-illustration mgim-illustration--case-study"
    viewBox="0 0 240 180"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="cs2-title cs2-desc"
    {...props}
  >
    <title id="cs2-title">{"Skalierung mehrerer paralleler Projekte"}</title>
    <desc id="cs2-desc">{"Vier ansteigende Balken – Symbol für die strukturierte Skalierung mehrerer paralleler Projekte."}</desc>
    <g stroke="var(--color-ink-700, #6D6E71)" strokeWidth={10} strokeLinecap="round">
      <line x1={60} y1={140} x2={60} y2={110} />
      <line x1={100} y1={140} x2={100} y2={90} />
      <line x1={140} y1={140} x2={140} y2={65} />
    </g>
    <line
      x1={180}
      y1={140}
      x2={180}
      y2={40}
      stroke="var(--color-accent-500, #3A9AC9)"
      strokeWidth={10}
      strokeLinecap="round"
    />
    <line
      x1={40}
      y1={140}
      x2={200}
      y2={140}
      stroke="var(--color-ink-300, #A8A9AD)"
      strokeWidth={3}
    />
  </svg>
);
export default IllustrationCaseStudySkalierung;
