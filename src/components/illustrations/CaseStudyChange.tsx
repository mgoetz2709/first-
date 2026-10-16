import type { SVGProps } from "react";

const IllustrationCaseStudyChange = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="mgim-illustration mgim-illustration--case-study"
    viewBox="0 0 240 180"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="cs4-title cs4-desc"
    {...props}
  >
    <title id="cs4-title">{"Team baut eigene AI-Agenten"}</title>
    <desc id="cs4-desc">{"Zwei Personen-Symbole – Symbol für ein Team, das im Training neue Fähigkeiten aufbaut."}</desc>
    <g fill="none" stroke="var(--color-ink-700, #6D6E71)" strokeWidth={5}>
      <circle cx={90} cy={58} r={18} />
      <path d="M58,132 a32,32 0 0 1 64,0" />
    </g>
    <g fill="none" stroke="var(--color-accent-500, #3A9AC9)" strokeWidth={5}>
      <circle cx={158} cy={70} r={16} />
      <path d="M130,132 a28,28 0 0 1 56,0" />
    </g>
  </svg>
);
export default IllustrationCaseStudyChange;
