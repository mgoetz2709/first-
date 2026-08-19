import type { SVGProps } from "react";
import IsoCube from "./IsoCube";

const IllustrationAnsatzUebergabe = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="mgim-illustration mgim-illustration--approach"
    viewBox="0 0 160 160"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="ap4-title ap4-desc"
    {...props}
  >
    <title id="ap4-title">{"Übergabe & Befähigung"}</title>
    <desc id="ap4-desc">
      {
        "Zwei Volumenk\xF6rper, verbunden durch einen Pfeil von links nach rechts – Symbol daf\xFCr, dass der Interim-Manager die Verantwortung am Ende wieder vollst\xE4ndig an das Unternehmen \xFCbergibt."
      }
    </desc>
    <g stroke="var(--color-ink-300, #A8A9AD)" strokeWidth={1.5} strokeLinecap="round" opacity={0.5}>
      <path d="M8,18 V8 H18" fill="none" />
      <path d="M152,142 V152 H142" fill="none" />
    </g>
    <g stroke="var(--color-ink-900, #231F20)" strokeWidth={3} strokeLinecap="round">
      <line x1={70} y1={80} x2={90} y2={80} />
      <path d="M83,73 L90,80 L83,87" fill="none" strokeLinejoin="round" />
    </g>
    <IsoCube cx={46} cy={80} edge={26} variant="ink" />
    <IsoCube cx={114} cy={80} edge={26} variant="accent" />
  </svg>
);
export default IllustrationAnsatzUebergabe;
