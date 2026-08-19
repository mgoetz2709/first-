import type { SVGProps } from "react";
import IsoCube from "./IsoCube";

const IllustrationAnsatzUmsetzung = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="mgim-illustration mgim-illustration--approach"
    viewBox="0 0 160 160"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="ap3-title ap3-desc"
    {...props}
  >
    <title id="ap3-title">{"Umsetzung & Piloting"}</title>
    <desc id="ap3-desc">
      {
        "Ein zentraler Baustein, an den drei kleinere Module andocken, eines davon hervorgehoben – Symbol f\xFCr iterative, kontrollierte Umsetzung statt Big-Bang-Einf\xFChrung."
      }
    </desc>
    <g stroke="var(--color-ink-300, #A8A9AD)" strokeWidth={1.5} strokeLinecap="round" opacity={0.5}>
      <path d="M8,18 V8 H18" fill="none" />
      <path d="M152,142 V152 H142" fill="none" />
    </g>
    <g stroke="var(--color-ink-300, #A8A9AD)" strokeWidth={1.8}>
      <line x1={80} y1={90} x2={40} y2={50} />
      <line x1={80} y1={90} x2={124} y2={48} />
      <line x1={80} y1={90} x2={120} y2={124} />
    </g>
    <IsoCube cx={80} cy={90} edge={30} variant="ink" />
    <IsoCube cx={40} cy={50} edge={13} variant="accent" />
    <IsoCube cx={124} cy={48} edge={13} variant="ink" />
    <IsoCube cx={120} cy={124} edge={13} variant="ink" />
  </svg>
);
export default IllustrationAnsatzUmsetzung;
