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
    <title id="ap4-title">{"Übergabe & Befähigung"}</title>
    <desc id="ap4-desc">{"Ein Haken im Kreis – Symbol dafür, dass die Verantwortung am Ende vollständig an das Unternehmen zurückgeht."}</desc>
    <circle
      cx={80}
      cy={80}
      r={44}
      fill="none"
      stroke="var(--color-ink-700, #6D6E71)"
      strokeWidth={6}
    />
    <polyline
      points="58,82 73,98 104,62"
      fill="none"
      stroke="var(--color-accent-500, #3A9AC9)"
      strokeWidth={8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export default IllustrationAnsatzUebergabe;
