// Generated from canonical schemas; do not edit.

export type Targets = string[];
export type ReviewReason = "new-issue" | "purpose-text-changed" | "identity-uncertain";

/**
 * Private state for manual refresh. Only map is sent to the viewer; memory retains absent choices.
 */
export interface StellarSavedClassificationState {
  schemaVersion: 1;
  map: StellarWorkMap;
  memory: {
    provider: string;
    namespace: string;
    nativeId: string;
    identifier: string;
    classification?: Classification;
    targets: Targets;
    targetsOrigin: "agent" | "user";
    reviewReason?: ReviewReason;
    evidence?: {
      title: string;
      description?: string | null;
    };
  }[];
  changes: {
    added: string[];
    returned: string[];
    updated: {
      issueId: string;
      fields: string[];
    }[];
    notObserved: {
      provider: string;
      namespace: string;
      nativeId: string;
    }[];
    review: {
      issueId: string;
      reason: ReviewReason;
    }[];
    preservedUser: string[];
  };
}
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
    classification?: Classification;
    /**
     * Runner-set notice for a classification retained on unqueried context while earlier full-text evidence is remembered.
     */
    classificationEvidence?: "previous-observation";
    targets: Targets;
    /**
     * Absolute HTTP(S) URL; validated with the URL parser. Unicode paths are allowed; embedded credentials are rejected.
     */
    url?: string;
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
    href: string;
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
export interface Classification {
  category: string;
  rationale: string;
  origin: "agent" | "user";
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
