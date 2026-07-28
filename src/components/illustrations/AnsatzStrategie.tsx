import type { SVGProps } from "react";
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
        "Eine Route mit klaren Wegpunkten und einem verworfenen Alternativpfad \u2013 Symbol f\xFCr einen bewusst gew\xE4hlten, realistischen Umsetzungsplan."
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
    <path
      d="M32,120 C55,110 60,90 50,75"
      fill="none"
      stroke="var(--mgim-steel, #6E8AA6)"
      strokeWidth={2}
      strokeDasharray="3 5"
      strokeLinecap="round"
    />
    <path
      d="M32,120 C50,100 45,80 68,68 C88,58 98,50 118,36"
      fill="none"
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={3.5}
      strokeLinecap="round"
    />
    <circle
      cx={32}
      cy={120}
      r={6}
      fill="none"
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={3}
    />
    <circle cx={60} cy={82} r={5} fill="var(--mgim-brass, #B8905B)" />
    <circle cx={88} cy={58} r={5} fill="var(--mgim-brass, #B8905B)" />
    <path
      d="M112,30 L120,36 L112,44"
      fill="none"
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export default IllustrationAnsatzStrategie;
