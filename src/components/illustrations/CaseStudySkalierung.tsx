import type { SVGProps } from "react";
import IsoCube from "./IsoCube";

const IllustrationCaseStudySkalierung = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="mgim-illustration mgim-illustration--case-study"
    viewBox="0 0 240 180"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="cs2-title cs2-desc"
    {...props}
  >
    <title id="cs2-title">{"Neun parallele Netzausbau-Projekte neu strukturiert"}</title>
    <desc id="cs2-desc">
      {
        "Ein einzelner Ausgangsknoten verzweigt sich in ein Netz aus mehreren Volumenk\xF6rpern, einer davon verzweigt weiter – Symbol f\xFCr die strukturierte Steuerung vieler paralleler Projekte aus einem Programm heraus."
      }
    </desc>
    <g stroke="var(--color-ink-300, #A8A9AD)" strokeWidth={1.5} strokeLinecap="round" opacity={0.55}>
      <path d="M10,22 V10 H22" fill="none" />
      <path d="M230,158 V170 H218" fill="none" />
    </g>
    <g stroke="var(--color-ink-300, #A8A9AD)" strokeWidth={1.8}>
      <line x1={50} y1={90} x2={150} y2={42} />
      <line x1={50} y1={90} x2={150} y2={78} />
      <line x1={50} y1={90} x2={150} y2={114} />
      <line x1={50} y1={90} x2={150} y2={150} />
      <line x1={150} y1={78} x2={196} y2={60} />
      <line x1={150} y1={78} x2={196} y2={96} />
    </g>
    <IsoCube cx={50} cy={90} edge={20} variant="ink" />
    <IsoCube cx={150} cy={42} edge={14} variant="ink" />
    <IsoCube cx={150} cy={78} edge={14} variant="accent" />
    <IsoCube cx={150} cy={114} edge={14} variant="ink" />
    <IsoCube cx={150} cy={150} edge={14} variant="ink" />
    <IsoCube cx={196} cy={60} edge={9} variant="ink" />
    <IsoCube cx={196} cy={96} edge={9} variant="ink" />
  </svg>
);
export default IllustrationCaseStudySkalierung;
