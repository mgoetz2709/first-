import type { SVGProps } from "react";
const IllustrationCaseStudyChange = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="mgim-illustration mgim-illustration--case-study"
    viewBox="0 0 240 180"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="cs4-title cs4-desc"
    {...props}
  >
    <title id="cs4-title">{"Change-Prozess und Team-Akzeptanz"}</title>
    <desc id="cs4-desc">
      {
        "Zwei sich \xFCberlappende Kreise \u2013 der bestehende Prozess und das neue System \u2013 deren Schnittmenge ineinandergreifende Zahnradz\xE4hne bildet, als Symbol f\xFCr gelungene Integration und Akzeptanz im Team."
      }
    </desc>
    <g
      stroke="var(--mgim-steel, #6E8AA6)"
      strokeWidth={1.5}
      strokeLinecap="round"
      opacity={0.55}
    >
      <path d="M10,22 V10 H22" fill="none" />
      <path d="M230,158 V170 H218" fill="none" />
    </g>
    <circle
      cx={96}
      cy={94}
      r={46}
      fill="none"
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={3}
    />
    <g fill="none" stroke="var(--mgim-ink, #232A31)" strokeWidth={3}>
      <circle cx={150} cy={94} r={46} />
      <g strokeWidth={2.5}>
        <line x1={150} y1={42} x2={150} y2={50} />
        <line x1={150} y1={138} x2={150} y2={146} />
        <line x1={188} y1={70} x2={181} y2={75} />
        <line x1={188} y1={118} x2={181} y2={113} />
        <line x1={196} y1={94} x2={188} y2={94} />
      </g>
    </g>
    <path
      d="M123,54 A46,46 0 0 1 123,134 A46,46 0 0 1 123,54 Z"
      fill="var(--mgim-brass, #B8905B)"
      opacity={0.18}
      stroke="var(--mgim-brass, #B8905B)"
      strokeWidth={2.5}
    />
    <circle cx={118} cy={80} r={3.5} fill="var(--mgim-brass, #B8905B)" />
    <circle cx={126} cy={94} r={3.5} fill="var(--mgim-brass, #B8905B)" />
    <circle cx={118} cy={108} r={3.5} fill="var(--mgim-brass, #B8905B)" />
    <g
      stroke="var(--mgim-steel, #6E8AA6)"
      strokeWidth={2}
      strokeLinecap="round"
      fill="none"
    >
      <path d="M60,150 A46,46 0 0 1 55,120" />
      <path d="M52,124 L55,120 L59,126" fill="none" strokeLinejoin="round" />
      <path d="M186,150 A46,46 0 0 0 191,120" />
      <path d="M194,124 L191,120 L187,126" fill="none" strokeLinejoin="round" />
    </g>
  </svg>
);
export default IllustrationCaseStudyChange;
