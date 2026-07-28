import type { SVGProps } from "react";
const IllustrationAnsatzUebergabe = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="mgim-illustration mgim-illustration--approach"
    viewBox="0 0 160 160"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="ap4-title ap4-desc"
    {...props}
  >
    <title id="ap4-title">{"\xDCbergabe & Bef\xE4higung"}</title>
    <desc id="ap4-desc">
      {
        "Ein Schl\xFCssel wandert entlang einer gestrichelten Bahn von der einen zur anderen Halterung \u2013 Symbol daf\xFCr, dass der Interim-Manager die Verantwortung am Ende wieder vollst\xE4ndig an das Unternehmen \xFCbergibt."
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
      d="M40,100 v20 a10,10 0 0 0 10,10 h6"
      fill="none"
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={3}
      strokeLinecap="round"
    />
    <path
      d="M120,100 v20 a10,10 0 0 1 -10,10 h-6"
      fill="none"
      stroke="var(--mgim-ink, #232A31)"
      strokeWidth={3}
      strokeLinecap="round"
    />
    <path
      d="M56,95 Q80,70 104,95"
      fill="none"
      stroke="var(--mgim-steel, #6E8AA6)"
      strokeWidth={1.8}
      strokeDasharray="2 5"
      strokeLinecap="round"
    />
    <g transform="translate(80,72)">
      <circle
        cx={0}
        cy={0}
        r={9}
        fill="none"
        stroke="var(--mgim-brass, #B8905B)"
        strokeWidth={3}
      />
      <line
        x1={7}
        y1={6}
        x2={22}
        y2={21}
        stroke="var(--mgim-brass, #B8905B)"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <line
        x1={16}
        y1={20}
        x2={22}
        y2={14}
        stroke="var(--mgim-brass, #B8905B)"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </g>
  </svg>
);
export default IllustrationAnsatzUebergabe;
