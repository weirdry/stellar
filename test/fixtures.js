import { readFileSync } from 'node:fs';
import { normalizeCapture } from '../lib/normalize.js';
export const mixedCapture = () =>
  JSON.parse(
    readFileSync(
      new URL('../examples/mixed-capture.json', import.meta.url),
      'utf8',
    ),
  );
export function mixedMap() {
  const map = normalizeCapture(mixedCapture());
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
      rationale: map.categories.find((c) => c.id === category).basis,
      origin: 'agent',
    };
  }
  return map;
}
