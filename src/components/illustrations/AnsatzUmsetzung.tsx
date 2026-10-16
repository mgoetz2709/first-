import type { SVGProps } from "react";

const TEETH = Array.from({ length: 8 }, (_, i) => i * 45);

const IllustrationAnsatzUmsetzung = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="mgim-illustration mgim-illustration--approach"
    viewBox="0 0 160 160"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="ap3-title ap3-desc"
    {...props}
  >
    <title id="ap3-title">{"Umsetzung & Piloting"}</title>
    <desc id="ap3-desc">{"Ein Zahnrad – Symbol für iterative, kontrollierte Umsetzung statt Big-Bang-Einführung."}</desc>
    <g stroke="var(--color-ink-700, #6D6E71)" strokeWidth={6} strokeLinecap="round">
      {TEETH.map((angle) => (
        <line
          key={angle}
          x1={80}
          y1={28}
          x2={80}
          y2={16}
          transform={`rotate(${angle} 80 80)`}
        />
      ))}
    </g>
    <circle
      cx={80}
      cy={80}
      r={32}
      fill="none"
      stroke="var(--color-ink-700, #6D6E71)"
      strokeWidth={6}
    />
    <circle cx={80} cy={80} r={10} fill="var(--color-accent-500, #3A9AC9)" />
  </svg>
);
export default IllustrationAnsatzUmsetzung;
