import metadata from '../package.json' with { type: 'json' };

// The build projects the root JSON import to { version }; source uses it directly.
export const version = metadata.version;
