import {normalizeCapture} from './baseline/lib/normalize.js';
import {readWorkMap,writeArtifact} from './baseline/lib/render.js';
try {
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw new Error('Usage: normalize INPUT OUTPUT');
 const map=normalizeCapture(await readWorkMap(input,'capture'));
 await writeArtifact(input,output,JSON.stringify(map,null,2)+'\n');
 console.log(JSON.stringify({normalized:true,issues:map.issues.length,relations:map.relations.length,needsClassification:map.issues.filter(i=>i.scope==='assigned').length}));
}catch(error){console.error(error.diagnostics?JSON.stringify({valid:false,diagnostics:error.diagnostics},null,2):error.message);process.exitCode=1;}
