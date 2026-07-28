import type { SVGProps } from "react";
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
        "Eine Lupe \xFCber einem feinen Rasternetz \u2013 Symbol f\xFCr die pr\xE4zise Analyse des Status quo als ersten Schritt."
      }
    </desc>
    <g
      stroke="var(--mgim-steel, #6E8AA6)"
      strokeWidth={1.5}
      strokeLinecap="round"
      opacity={0.55}
    >
      <path d="M8,18 V8 H18" fill="none" />
      <path d="M152,142 V152 H142" fill="none" />
    </g>
    <g stroke="var(--mgim-steel, #6E8AA6)" strokeWidth={1.2} opacity={0.7}>
      <line x1={50} y1={70} x2={90} y2={70} />
      <line x1={50} y1={82} x2={90} y2={82} />
      <line x1={50} y1={94} x2={90} y2={94} />
      <line x1={58} y1={62} x2={58} y2={102} />
      <line x1={70} y1={62} x2={70} y2={102} />
      <line x1={82} y1={62} x2={82} y2={102} />
    </g>
    <circle
      cx={72}
      cy={82}
      r={30}
      fill="none"
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={3.5}
    />
    <line
      x1={94}
      y1={104}
      x2={122}
      y2={132}
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={5}
      strokeLinecap="round"
    />
    <circle cx={72} cy={82} r={6} fill="var(--mgim-brass, #B8905B)" />
  </svg>
);
export default IllustrationAnsatzDiagnose;
