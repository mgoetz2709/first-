import type { SVGProps } from "react";
import IsoCube from "./IsoCube";

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
    <desc id="ap1-desc">
      {
        "Drei aufsteigend geschichtete Volumenkörper, der oberste hervorgehoben – Symbol f\xFCr die pr\xE4zise Analyse des Status quo als ersten Schritt."
      }
    </desc>
    <g stroke="var(--color-ink-300, #A8A9AD)" strokeWidth={1.5} strokeLinecap="round" opacity={0.5}>
      <path d="M8,18 V8 H18" fill="none" />
      <path d="M152,142 V152 H142" fill="none" />
    </g>
    <IsoCube cx={58} cy={108} edge={22} variant="ink" />
    <IsoCube cx={86} cy={88} edge={24} variant="ink" />
    <IsoCube cx={104} cy={52} edge={26} variant="accent" />
  </svg>
);
export default IllustrationAnsatzDiagnose;
