import type { SVGProps } from "react";
import IsoCube from "./IsoCube";

const IllustrationCaseStudyAutomatisierung = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="mgim-illustration mgim-illustration--case-study"
    viewBox="0 0 240 180"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="cs1-title cs1-desc"
    {...props}
  >
    <title id="cs1-title">{"Stakeholder- und Eskalationsmanagement"}</title>
    <desc id="cs1-desc">
      {
        "Ein zentraler Knoten mit vier verbundenen Stakeholdern, einer davon hervorgehoben – Symbol f\xFCr koordiniertes Stakeholder- und Eskalationsmanagement in einem komplexen Projekt."
      }
    </desc>
    <g stroke="var(--color-ink-300, #A8A9AD)" strokeWidth={1.5} strokeLinecap="round" opacity={0.55}>
      <path d="M10,22 V10 H22" fill="none" />
      <path d="M230,158 V170 H218" fill="none" />
    </g>
    <g stroke="var(--color-ink-300, #A8A9AD)" strokeWidth={1.8}>
      <line x1={120} y1={90} x2={50} y2={50} />
      <line x1={120} y1={90} x2={190} y2={50} />
      <line x1={120} y1={90} x2={50} y2={140} />
      <line x1={120} y1={90} x2={190} y2={140} />
    </g>
    <IsoCube cx={120} cy={90} edge={26} variant="ink" />
    <IsoCube cx={50} cy={50} edge={13} variant="ink" />
    <IsoCube cx={190} cy={50} edge={13} variant="ink" />
    <IsoCube cx={50} cy={140} edge={13} variant="ink" />
    <IsoCube cx={190} cy={140} edge={13} variant="accent" />
  </svg>
);
export default IllustrationCaseStudyAutomatisierung;
