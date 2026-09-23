// Generated from canonical schemas; do not edit.

/**
 * Absolute HTTP(S) URL; validated with the URL parser. Unicode paths are allowed; embedded credentials are rejected.
 */
export type SourceUrl = string;
export type AttachmentUrl = string;

/**
 * Unreleased work-map contract. Relations are registered source facts; classification is interpretation.
 */
export interface StellarWorkMap {
  schemaVersion: 1;
  owner: string;
  view: {
    initialScope: "active" | "all" | "started" | "unstarted" | "backlog" | "completed" | "closed" | "unknown";
    exportName: string;
  };
  domains: {
    id: string;
    label: string;
    description: string;
  }[];
  categories: {
    id: string;
    domain: string;
    label: string;
    basis: string;
  }[];
  issues: {
    id: string;
    title: string;
    scope: "assigned" | "context";
    detail: "full" | "unqueried";
    status: {
      label: string;
      type: "started" | "unstarted" | "backlog" | "completed" | "canceled" | "duplicate" | "unknown";
    };
    classification?: {
      category: string;
      rationale: string;
      origin: "agent" | "user";
    };
    /**
     * Runner-set notice for a classification retained on unqueried context while earlier full-text evidence is remembered.
     */
    classificationEvidence?: "previous-observation";
    targets: string[];
    url?: SourceUrl;
    assignee?: string | null;
    assigneeId?: string | null;
    project?: string | null;
    team?: string | null;
    priority?: string | null;
    updatedAt?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
    archivedAt?: string | null;
    dueDate?: string | null;
    labels?: string[];
    sourceId: string;
    nativeId: string;
    identifier: string;
    description?: string | null;
  }[];
  relations: {
    kind: "parent" | "blocks" | "related" | "duplicate";
    source: string;
    target: string;
  }[];
  attachments?: {
    title: string;
    href: AttachmentUrl;
    note: string;
  }[];
  /**
   * Fixed viewer language, chosen explicitly by the authoring agent or caller.
   */
  locale: "ko" | "en";
  /**
   * @minItems 1
   */
  sources: Source[];
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
