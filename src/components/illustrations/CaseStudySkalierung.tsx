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
    <title id="cs2-title">{"KI-Piloten in den Regelbetrieb skaliert"}</title>
    <desc id="cs2-desc">
      {
        "Ein einzelner Ausgangsknoten verzweigt sich \xFCber pr\xE4zise Linien in ein Netz aus mehreren Knoten \u2013 Symbol f\xFCr die kontrollierte Skalierung eines Piloten in den breiten Rollout."
      }
    </desc>
    <g
      stroke="var(--mgim-steel, #6E8AA6)"
      strokeWidth={1.5}
      strokeLinecap="round"
      opacity={0.55}
    >
      <path d="M10,22 V10 H22" fill="none" />
      <path d="M230,158 V170 H218" fill="none" />
    </g>
    <g
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={2.5}
      strokeLinecap="round"
    >
      <line x1={46} y1={90} x2={150} y2={42} />
      <line x1={46} y1={90} x2={150} y2={78} />
      <line x1={46} y1={90} x2={150} y2={114} />
      <line x1={46} y1={90} x2={150} y2={148} />
    </g>
    <circle cx={46} cy={90} r={8} fill="var(--mgim-brass, #B8905B)" />
    <g fill="none" stroke="var(--mgim-ink, #232A31)" strokeWidth={3}>
      <circle cx={150} cy={42} r={6} />
      <circle cx={150} cy={78} r={6} />
      <circle cx={150} cy={114} r={6} />
      <circle cx={150} cy={148} r={6} />
    </g>
    <circle cx={150} cy={78} r={3} fill="var(--mgim-brass, #B8905B)" />
    <g
      stroke="var(--mgim-steel, #6E8AA6)"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <line x1={156} y1={78} x2={196} y2={60} />
      <line x1={156} y1={78} x2={196} y2={96} />
    </g>
    <g fill="none" stroke="var(--mgim-steel, #6E8AA6)" strokeWidth={2.5}>
      <circle cx={196} cy={60} r={4.5} />
      <circle cx={196} cy={96} r={4.5} />
    </g>
    <g stroke="var(--mgim-steel, #6E8AA6)" strokeWidth={1.2} opacity={0.6}>
      <line x1={30} y1={164} x2={30} y2={170} />
      <line x1={60} y1={164} x2={60} y2={170} />
      <line x1={90} y1={164} x2={90} y2={170} />
      <line x1={120} y1={164} x2={120} y2={170} />
      <line x1={150} y1={164} x2={150} y2={170} />
      <line x1={180} y1={164} x2={180} y2={170} />
      <line x1={210} y1={164} x2={210} y2={170} />
      <line x1={30} y1={167} x2={210} y2={167} />
    </g>
  </svg>
);
export default IllustrationCaseStudySkalierung;
