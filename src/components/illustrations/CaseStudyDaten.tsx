import type { SVGProps } from "react";
import IsoCube from "./IsoCube";

const IllustrationCaseStudyDaten = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="mgim-illustration mgim-illustration--case-study"
    viewBox="0 0 240 180"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="cs3-title cs3-desc"
    {...props}
  >
    <title id="cs3-title">{"Launch-Management für die Migration mehrerer Partnermarken"}</title>
    <desc id="cs3-desc">
      {
        "Vier kleine Volumenk\xF6rper links, verbunden \xFCber einen Pfeil mit einem einzelnen gr\xF6\xDFeren Volumenk\xF6rper rechts – Symbol f\xFCr die Migration mehrerer Marken auf eine gemeinsame neue Plattform."
      }
    </desc>
    <g stroke="var(--color-ink-300, #A8A9AD)" strokeWidth={1.5} strokeLinecap="round" opacity={0.55}>
      <path d="M10,22 V10 H22" fill="none" />
      <path d="M230,158 V170 H218" fill="none" />
    </g>
    <IsoCube cx={44} cy={56} edge={13} variant="ink" />
    <IsoCube cx={76} cy={56} edge={13} variant="ink" />
    <IsoCube cx={44} cy={104} edge={13} variant="ink" />
    <IsoCube cx={76} cy={104} edge={13} variant="ink" />
    <g stroke="var(--color-ink-900, #231F20)" strokeWidth={3} strokeLinecap="round">
      <line x1={100} y1={90} x2={150} y2={90} />
      <path d="M142,82 L150,90 L142,98" fill="none" strokeLinejoin="round" />
    </g>
    <IsoCube cx={190} cy={90} edge={26} variant="accent" />
  </svg>
);
export default IllustrationCaseStudyDaten;
