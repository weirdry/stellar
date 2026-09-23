// Generated from canonical schemas; do not edit.

/**
 * @minItems 1
 */
export type Sources = Source[];

export interface StellarHostCapture {
  owner: string;
  /**
   * Fixed viewer language, chosen explicitly by the authoring agent or caller.
   */
  locale: "ko" | "en";
  view: View;
  sources: Sources;
  records: {
    sourceId: string;
    scope: "assigned" | "context";
    data: {
      [k: string]: unknown;
    };
    links?: {
      parent?: {
        [k: string]: unknown;
      } | null;
      children?: {
        [k: string]: unknown;
      }[];
      blocks?: {
        [k: string]: unknown;
      }[];
      blockedBy?: {
        [k: string]: unknown;
      }[];
    };
  }[];
}
export interface View {
  initialScope: "active" | "all" | "started" | "unstarted" | "backlog" | "completed" | "closed" | "unknown";
  exportName: string;
}
export interface Source {
  name: string;
  snapshotAt: string;
  notes: string;
  id: string;
  provider: string;
  namespace: string;
  scope: string;
  coverage: {
    issues: "complete" | "partial";
    relations: "complete" | "partial" | "unavailable";
  };
}
