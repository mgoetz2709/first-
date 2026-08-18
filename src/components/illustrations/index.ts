import type { ComponentType, SVGProps } from "react";
import CaseStudyAutomatisierung from "./CaseStudyAutomatisierung";
import CaseStudySkalierung from "./CaseStudySkalierung";
import CaseStudyDaten from "./CaseStudyDaten";
import CaseStudyChange from "./CaseStudyChange";
import AnsatzDiagnose from "./AnsatzDiagnose";
import AnsatzStrategie from "./AnsatzStrategie";
import AnsatzUmsetzung from "./AnsatzUmsetzung";
import AnsatzUebergabe from "./AnsatzUebergabe";

export {
  CaseStudyAutomatisierung,
  CaseStudySkalierung,
  CaseStudyDaten,
  CaseStudyChange,
  AnsatzDiagnose,
  AnsatzStrategie,
  AnsatzUmsetzung,
  AnsatzUebergabe,
};

export const illustrations: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  CaseStudyAutomatisierung,
  CaseStudySkalierung,
  CaseStudyDaten,
  CaseStudyChange,
  AnsatzDiagnose,
  AnsatzStrategie,
  AnsatzUmsetzung,
  AnsatzUebergabe,
};
