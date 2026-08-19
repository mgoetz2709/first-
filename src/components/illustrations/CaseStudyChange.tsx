import type { SVGProps } from "react";
import IsoCube from "./IsoCube";

const IllustrationCaseStudyChange = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="mgim-illustration mgim-illustration--case-study"
    viewBox="0 0 240 180"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="cs4-title cs4-desc"
    {...props}
  >
    <title id="cs4-title">{"Ein Innovationsteam lernt, eigene AI-Agenten zu bauen"}</title>
    <desc id="cs4-desc">
      {
        "Ein zentraler, hervorgehobener Volumenk\xF6rper mit vier verbundenen kleineren K\xF6rpern ringsherum – Symbol f\xFCr ein Team, das ausgehend von einer gemeinsamen Methodik jeweils eigene, individuelle AI-Agenten baut."
      }
    </desc>
    <g stroke="var(--color-ink-300, #A8A9AD)" strokeWidth={1.5} strokeLinecap="round" opacity={0.55}>
      <path d="M10,22 V10 H22" fill="none" />
      <path d="M230,158 V170 H218" fill="none" />
    </g>
    <g stroke="var(--color-ink-300, #A8A9AD)" strokeWidth={1.8} strokeDasharray="2 5">
      <line x1={120} y1={90} x2={60} y2={50} />
      <line x1={120} y1={90} x2={180} y2={50} />
      <line x1={120} y1={90} x2={60} y2={130} />
      <line x1={120} y1={90} x2={180} y2={130} />
    </g>
    <IsoCube cx={60} cy={50} edge={12} variant="ink" />
    <IsoCube cx={180} cy={50} edge={12} variant="ink" />
    <IsoCube cx={60} cy={130} edge={12} variant="ink" />
    <IsoCube cx={180} cy={130} edge={12} variant="ink" />
    <IsoCube cx={120} cy={90} edge={28} variant="accent" />
  </svg>
);
export default IllustrationCaseStudyChange;
