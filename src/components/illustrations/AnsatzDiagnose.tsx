import type { SVGProps } from "react";

const IllustrationAnsatzDiagnose = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="mgim-illustration mgim-illustration--approach"
    viewBox="0 0 160 160"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="ap1-title ap1-desc"
    {...props}
  >
    <title id="ap1-title">{"Standortbestimmung & Diagnose"}</title>
    <desc id="ap1-desc">{"Eine Lupe – Symbol für die genaue Analyse des Status quo als ersten Schritt."}</desc>
    <circle
      cx={66}
      cy={66}
      r={34}
      fill="none"
      stroke="var(--color-ink-700, #6D6E71)"
      strokeWidth={6}
    />
    <line
      x1={90}
      y1={90}
      x2={122}
      y2={122}
      stroke="var(--color-accent-500, #3A9AC9)"
      strokeWidth={7}
      strokeLinecap="round"
    />
  </svg>
);
export default IllustrationAnsatzDiagnose;
