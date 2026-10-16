import type { SVGProps } from "react";

const IllustrationAnsatzStrategie = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="mgim-illustration mgim-illustration--approach"
    viewBox="0 0 160 160"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="ap2-title ap2-desc"
    {...props}
  >
    <title id="ap2-title">{"Strategie & Fahrplan"}</title>
    <desc id="ap2-desc">{"Ein Kompass – Symbol für einen bewusst gewählten, realistischen Umsetzungsplan mit klarer Richtung."}</desc>
    <circle
      cx={80}
      cy={80}
      r={44}
      fill="none"
      stroke="var(--color-ink-700, #6D6E71)"
      strokeWidth={6}
    />
    <polygon points="80,48 92,80 80,80" fill="var(--color-accent-500, #3A9AC9)" />
    <polygon points="80,112 68,80 80,80" fill="var(--color-ink-300, #A8A9AD)" />
  </svg>
);
export default IllustrationAnsatzStrategie;
