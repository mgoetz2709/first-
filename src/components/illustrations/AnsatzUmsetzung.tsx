import type { SVGProps } from "react";
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
        "Drei modulare Bausteine, von denen zwei bereits verbunden sind und der dritte gerade andockt \u2013 Symbol f\xFCr iterative, kontrollierte Umsetzung statt Big-Bang-Einf\xFChrung."
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
    <rect
      x={34}
      y={88}
      width={34}
      height={34}
      rx={4}
      fill="none"
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={3}
    />
    <rect
      x={72}
      y={88}
      width={34}
      height={34}
      rx={4}
      fill="none"
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={3}
    />
    <line
      x1={68}
      y1={105}
      x2={72}
      y2={105}
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={3}
    />
    <rect
      x={112}
      y={52}
      width={30}
      height={30}
      rx={4}
      fill="none"
      stroke="var(--mgim-brass, #B8905B)"
      strokeWidth={3}
    />
    <path
      d="M110,74 C102,80 96,84 92,90"
      fill="none"
      stroke="var(--mgim-brass, #B8905B)"
      strokeWidth={2.5}
      strokeDasharray="2 5"
      strokeLinecap="round"
    />
    <path
      d="M96,84 L92,90 L100,90"
      fill="none"
      stroke="var(--mgim-brass, #B8905B)"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export default IllustrationAnsatzUmsetzung;
