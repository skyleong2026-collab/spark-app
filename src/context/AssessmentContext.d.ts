import type { ReactNode } from 'react';

export function AssessmentProvider(props: { children: ReactNode }): JSX.Element;

export function useAssessment(): {
  heartType: unknown;
  setHeartType: (v: unknown) => void;
  heartResult: unknown;
  setHeartResult: (v: unknown) => void;
  headType: unknown;
  setHeadType: (v: unknown) => void;
  headResult: unknown;
  setHeadResult: (v: unknown) => void;
  handResult: unknown;
  setHandResult: (v: unknown) => void;
  /** @deprecated Use handResult instead. */
  handType: unknown;
  /** @deprecated Use setHandResult instead. */
  setHandType: (v: unknown) => void;
  /** @deprecated Use handResult instead. */
  handGeniusTypes: unknown;
  /** @deprecated Use setHandResult instead. */
  setHandGeniusTypes: (v: unknown) => void;
  /** @deprecated Use handResult instead. */
  handFrustrationTypes: unknown;
  /** @deprecated Use setHandResult instead. */
  setHandFrustrationTypes: (v: unknown) => void;
  clearAll: () => void;
};
