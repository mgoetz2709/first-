import type { SVGProps } from "react";
const IllustrationCaseStudyDaten = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="mgim-illustration mgim-illustration--case-study"
    viewBox="0 0 240 180"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="cs3-title cs3-desc"
    {...props}
  >
    <title id="cs3-title">{"Datengetriebene Entscheidungsprozesse"}</title>
    <desc id="cs3-desc">
      {
        "Ein Pr\xE4zisionsmessger\xE4t mit Skala und Zeiger, der auf den optimalen Bereich zeigt \u2013 Symbol f\xFCr fundierte, datenbasierte Entscheidungen statt Bauchgef\xFChl."
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
      cx={120}
      cy={98}
      r={52}
      fill="none"
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={3}
    />
    <g
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={2.5}
      strokeLinecap="round"
    >
      <line x1={120} y1={50} x2={120} y2={58} />
      <line x1={163} y1={98} x2={155} y2={98} />
      <line x1={150} y1={128} x2={144} y2={122} />
      <line x1={90} y1={128} x2={96} y2={122} />
      <line x1={77} y1={98} x2={85} y2={98} />
      <line x1={90} y1={68} x2={96} y2={74} />
      <line x1={150} y1={68} x2={144} y2={74} />
    </g>
    <path
      d="M144,122 A52,52 0 0 0 150,68"
      fill="none"
      stroke="var(--mgim-brass, #B8905B)"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <line
      x1={120}
      y1={98}
      x2={146}
      y2={70}
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={3}
      strokeLinecap="round"
    />
    <circle cx={120} cy={98} r={6} fill="var(--mgim-brass, #B8905B)" />
    <g
      stroke="var(--mgim-steel, #6E8AA6)"
      strokeWidth={4}
      strokeLinecap="round"
    >
      <line x1={70} y1={168} x2={70} y2={158} />
      <line x1={86} y1={168} x2={86} y2={150} />
      <line x1={102} y1={168} x2={102} y2={160} />
      <line x1={118} y1={168} x2={118} y2={144} />
      <line x1={134} y1={168} x2={134} y2={152} />
      <line x1={150} y1={168} x2={150} y2={138} />
      <line x1={166} y1={168} x2={166} y2={156} />
    </g>
  </svg>
);
export default IllustrationCaseStudyDaten;
