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
    <title id="cs1-title">{"Stakeholder- und Eskalationsmanagement"}</title>
    <desc id="cs1-desc">{"Ein zentraler Knoten mit vier verbundenen Stakeholdern – Symbol für koordiniertes Stakeholder- und Eskalationsmanagement."}</desc>
    <g stroke="var(--color-ink-500, #A8A9AD)" strokeWidth={3}>
      <line x1={120} y1={90} x2={60} y2={50} />
      <line x1={120} y1={90} x2={180} y2={50} />
      <line x1={120} y1={90} x2={60} y2={130} />
      <line x1={120} y1={90} x2={180} y2={130} />
    </g>
    <circle cx={60} cy={50} r={12} fill="none" stroke="var(--color-ink-700, #6D6E71)" strokeWidth={5} />
    <circle cx={180} cy={50} r={12} fill="none" stroke="var(--color-ink-700, #6D6E71)" strokeWidth={5} />
    <circle cx={60} cy={130} r={12} fill="none" stroke="var(--color-ink-700, #6D6E71)" strokeWidth={5} />
    <circle cx={180} cy={130} r={12} fill="none" stroke="var(--color-ink-700, #6D6E71)" strokeWidth={5} />
    <circle cx={120} cy={90} r={20} fill="var(--color-accent-500, #3A9AC9)" />
  </svg>
);
export default IllustrationCaseStudyAutomatisierung;
