import type { SVGProps } from "react";
const IllustrationCaseStudyAutomatisierung = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="mgim-illustration mgim-illustration--case-study"
    viewBox="0 0 240 180"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="cs1-title cs1-desc"
    {...props}
  >
    <title id="cs1-title">{"Prozessautomatisierung in der Fertigung"}</title>
    <desc id="cs1-desc">
      {
        "Ein un\xFCbersichtlicher manueller Prozess links wird \xFCber einen Pfeil in ein sauber laufendes, einzelnes Zahnrad rechts \xFCberf\xFChrt \u2013 Symbol f\xFCr Automatisierung bestehender Abl\xE4ufe."
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
    <path
      d="M35,90 C29,76 44,64 55,74 C66,84 54,99 64,106 C74,113 60,122 47,114 C34,106 41,94 35,90 Z"
      fill="none"
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <g stroke="var(--mgim-ink, #232A31)" strokeWidth={3} strokeLinecap="round">
      <line x1={92} y1={92} x2={146} y2={92} />
      <path d="M138,84 L148,92 L138,100" fill="none" strokeLinejoin="round" />
    </g>
    <g
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={3}
      strokeLinecap="round"
      fill="none"
    >
      <circle cx={178} cy={90} r={22} />
      <g strokeWidth={3}>
        <line x1={178} y1={64} x2={178} y2={56} />
        <line x1={178} y1={116} x2={178} y2={124} />
        <line x1={152} y1={90} x2={144} y2={90} />
        <line x1={204} y1={90} x2={212} y2={90} />
        <line x1={160} y1={72} x2={154} y2={66} />
        <line x1={196} y1={108} x2={202} y2={114} />
        <line x1={196} y1={72} x2={202} y2={66} />
        <line x1={160} y1={108} x2={154} y2={114} />
      </g>
    </g>
    <circle cx={178} cy={90} r={5} fill="var(--mgim-brass, #B8905B)" />
    <g
      stroke="var(--mgim-steel, #6E8AA6)"
      strokeWidth={1.5}
      strokeDasharray="2 4"
      strokeLinecap="round"
    >
      <line x1={35} y1={148} x2={200} y2={148} />
      <line x1={35} y1={142} x2={35} y2={154} />
      <line x1={200} y1={142} x2={200} y2={154} />
    </g>
  </svg>
);
export default IllustrationCaseStudyAutomatisierung;
