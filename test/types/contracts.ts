// Compile-only contract examples. Runtime schemas still own formats, graph
// semantics, extra-property rejection and nonempty collection requirements.
import type {
  Capture,
  Choices,
  Issue,
  State,
  WorkMap,
} from '../../lib/contracts.ts';

type Extends<A, B> = [A] extends [B] ? true : false;
type Assert<T extends true> = T;
export type CaptureSourcesAgree = Assert<
  Extends<Capture['sources'], WorkMap['sources']>
>;
export type StateMapAgrees = Assert<Extends<State['map'], WorkMap>>;
export type MapFitsState = Assert<Extends<WorkMap, State['map']>>;
export type RawTitleIsUnknown = Assert<
  Extends<unknown, Capture['records'][number]['data']['title']>
>;

export const domainChoice: Choices = {
  domains: [
    { id: 'research', label: 'Research', description: 'Synthetic work' },
  ],
};
export const classificationChoice: Choices = {
  issues: [
    {
      issueId: 'one',
      classification: { category: 'research', rationale: 'Synthetic purpose' },
    },
  ],
};
export const targetsChoice: Choices = {
  issues: [{ issueId: 'one', targets: ['Two'] }],
};
export const nullableDescription: Issue['description'] = null;
export const optionalDescription: Issue['description'] = undefined;
export const optionalClassification: Issue['classification'] = undefined;

// @ts-expect-error Version 1 is the only current wire discriminator.
export const invalidVersion: WorkMap['schemaVersion'] = 2;
// @ts-expect-error The viewer supports exactly the schema's locale union.
export const invalidLocale: WorkMap['locale'] = 'fr';
// @ts-expect-error A work map must have all schema-required fields.
export const missingFields: WorkMap = { schemaVersion: 1, locale: 'en' };
// @ts-expect-error At least one choices alternative must be present.
export const emptyChoice: Choices = {};
// @ts-expect-error Each issue choice requires classification or targets.
export const emptyIssueChoice: Choices = { issues: [{ issueId: 'one' }] };
// @ts-expect-error Optional classification is not nullable.
export const nullClassification: Issue['classification'] = null;
// @ts-expect-error Present optional fields cannot be explicitly undefined.
export const explicitUndefined: Pick<Issue, 'description'> = {
  description: undefined,
};

export function readNativeTitle(capture: Capture): string | undefined {
  const record = capture.records[0];
  if (!record) return;
  const value = record.data['title'];
  // @ts-expect-error Native payload fields remain unknown until narrowed.
  const unchecked: string = value;
  void unchecked;
  return typeof value === 'string' ? value : undefined;
}
