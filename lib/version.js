import metadata from '../package.json' with { type: 'json' };

// esbuild embeds this value so installed version checks need no package.json.
export const version = metadata.version;
