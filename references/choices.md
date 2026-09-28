# Choices and authority

Use each current map/draft issue's canonical `id` as `issueId`, not its display
number or title. Choices contain domain/category upserts and issue classification
and/or target updates; never source fields or `origin`. The command sets origin.
At least one nonempty domains/categories/issues array is required, and each
issue update needs classification, targets or both. Use actual IDs; this example
only illustrates the shape. See the [choices schema](../schemas/choices.schema.json)
when authoring fields beyond this example or diagnosing a shape error.

```json
{
  "categories": [
    {
      "id": "research-tools",
      "domain": "research",
      "label": "Research tooling",
      "basis": "Reusable capabilities shared by research tracks"
    }
  ],
  "issues": [
    {
      "issueId": "the-internal-id-from-this-map",
      "classification": {
        "category": "research-tools",
        "rationale": "The user explicitly placed this reusable tool here."
      },
      "targets": ["Shared tooling"]
    }
  ]
}
```

Use actual IDs and domains; these are illustrative names. Omitted classification
or targets stay unchanged. Domains/categories are upserted by ID. Changing a
group definition affects all remembered issues using it, including absent ones.
There is no deletion, history pruning or identity-rebinding operation.

Agent decisions use `classify-draft` (first draft) or `classify` (saved state).
They cannot overwrite user classifications/targets or redefine existing groups.
Use `revise` only for explicit user changes, never to bypass agent rejection.
