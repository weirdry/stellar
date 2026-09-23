// Generated from canonical schemas; do not edit.

export type StellarClassificationChoices = (
  | {
      /**
       * @minItems 1
       */
      domains: unknown[];
      [k: string]: unknown;
    }
  | {
      /**
       * @minItems 1
       */
      categories: unknown[];
      [k: string]: unknown;
    }
  | {
      /**
       * @minItems 1
       */
      issues: unknown[];
      [k: string]: unknown;
    }
) & {
  domains?: Domains;
  categories?: Categories;
  issues?: ((
    | {
        classification: unknown;
        [k: string]: unknown;
      }
    | {
        targets: unknown;
        [k: string]: unknown;
      }
  ) & {
    issueId: string;
    classification?: {
      category: string;
      rationale: string;
    };
    targets?: Targets;
  })[];
};
export type Domains = {
  id: string;
  label: string;
  description: string;
}[];
export type Categories = {
  id: string;
  domain: string;
  label: string;
  basis: string;
}[];
export type Targets = string[];
