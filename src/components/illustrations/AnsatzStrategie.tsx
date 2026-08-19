import type { SVGProps } from "react";
import IsoCube from "./IsoCube";

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
    <desc id="ap2-desc">
      {
        "Vier Volumenk\xF6rper entlang eines ansteigenden Pfads, der letzte hervorgehoben – Symbol f\xFCr einen bewusst gew\xE4hlten, realistischen Umsetzungsplan mit klarem Zielpunkt."
      }
    </desc>
    <g stroke="var(--color-ink-300, #A8A9AD)" strokeWidth={1.5} strokeLinecap="round" opacity={0.5}>
      <path d="M8,18 V8 H18" fill="none" />
      <path d="M152,142 V152 H142" fill="none" />
    </g>
    <path
      d="M30,118 L62,98 L94,78 L126,50"
      fill="none"
      stroke="var(--color-ink-300, #A8A9AD)"
      strokeWidth={2}
      strokeDasharray="2 6"
      strokeLinecap="round"
    />
    <IsoCube cx={30} cy={118} edge={15} variant="ink" />
    <IsoCube cx={62} cy={98} edge={15} variant="ink" />
    <IsoCube cx={94} cy={78} edge={15} variant="ink" />
    <IsoCube cx={126} cy={50} edge={18} variant="accent" />
  </svg>
);
export default IllustrationAnsatzStrategie;
