import type { Capture } from '../lib/contracts.ts';
import { must } from './support.ts';
import { readFileSync } from 'node:fs';
import { normalizeCapture } from '../lib/normalize.ts';
// Native provider fields deliberately remain open at the capture boundary.
// Optional known fields describe the synthetic records used by the tests;
// invalid contract mutations use Reflect.set/deleteProperty at the call site.
export interface TestData {
  [key: string]: unknown;
  id?: string | undefined;
  uuid?: string | undefined;
  node_id?: string | undefined;
  number?: number | undefined;
  title?: string | undefined;
  description?: string | null | undefined;
  body?: string | null | undefined;
  url?: string | undefined;
  html_url?: string | undefined;
  parentId?: string | undefined;
  relations?: {
    blocks?: TestData[];
    blockedBy?: TestData[];
    relatedTo?: TestData[];
    duplicateOf?: TestData | null;
  };
}
export interface TestLinks {
  parent?: TestData | null;
  children?: TestData[];
  blocks?: TestData[];
  blockedBy?: TestData[];
}
export type TestRecord = Omit<Capture['records'][number], 'data' | 'links'> & {
  data: TestData;
  links?: TestLinks;
};
export type TestCapture = Omit<Capture, 'records'> & { records: TestRecord[] };
export const mixedCapture = (): TestCapture =>
  JSON.parse(
    readFileSync(
      new URL('../examples/mixed-capture.json', import.meta.url),
      'utf8',
    ),
  ) as TestCapture;
export function mixedMap(capture = mixedCapture()) {
  const map = normalizeCapture(capture);
  map.domains = [
    {
      id: 'research',
      label: 'Research',
      description: 'Observatory experiments',
    },
    {
      id: 'operations',
      label: 'Operations',
      description: 'Control and delivery reliability',
    },
  ];
  map.categories = [
    {
      id: 'transit',
      domain: 'research',
      label: 'Transit detection',
      basis: 'Transit calibration and evaluation',
    },
    {
      id: 'control',
      domain: 'operations',
      label: 'Telescope control',
      basis: 'Runtime control behavior',
    },
    {
      id: 'delivery',
      domain: 'operations',
      label: 'Delivery operations',
      basis: 'Shared delivery infrastructure',
    },
  ];
  for (const issue of map.issues.filter((i) => i.scope === 'assigned')) {
    const category =
      issue.sourceId === 'linear-observatory'
        ? 'transit'
        : issue.title.includes('retry')
          ? 'control'
          : 'delivery';
    issue.classification = {
      category,
      rationale: must(map.categories.find((c) => c.id === category)).basis,
      origin: 'agent',
    };
  }
  return map;
}
