import json,subprocess,os

if not __debug__:
 raise SystemExit('Storage verification requires assertions; run without -O or PYTHONOPTIMIZE.')

from differential import ROOT,command
work=ROOT/'results/safety';work.mkdir()
results=[]
for engine in os.environ.get('PROBE_ENGINES','node-cli,node-focused,go,rust').split(','):
 d=work/engine
 d.mkdir();src=d/'capture.json';src.write_bytes((ROOT/'cases/mixed.json').read_bytes());original=src.read_bytes()
 def execute(name,dst,expect,env=None):
  before=set(d.rglob('*'))
  p=subprocess.run(command(engine,src,dst),capture_output=True,text=True,env=env,timeout=20)
  r={'engine':engine,'case':name,'exit':p.returncode,'expected_success':expect,'input_preserved':src.read_bytes()==original,'stderr':p.stderr[:200]}
  assert (p.returncode==0)==expect and r['input_preserved'],r
  expected=before.copy()
  if expect:
   expected.update(path for path in (dst,*dst.parents) if path!=d and path.is_relative_to(d))
  after=set(d.rglob('*'))
  assert after==expected,dict(r,
   unexpected_paths=sorted(str(path.relative_to(d)) for path in after-expected),
   missing_paths=sorted(str(path.relative_to(d)) for path in expected-after))
  results.append(r)
 dst=d/'nested/new/output.json';execute('new private file',dst,True);assert dst.stat().st_mode&0o777==0o600
 dst.write_text('SENTINEL');execute('replace existing output',dst,True);assert json.loads(dst.read_text())['schemaVersion']==1
 execute('same input path',src,False)
 alias=d/'alias.json';alias.symlink_to(src);execute('symlink to input',alias,False)
 bad=d/'directory.json';bad.mkdir(exist_ok=True);execute('output is directory',bad,False);assert bad.is_dir()
 if engine in ['go','rust']:execute('no Node discoverable on PATH',d/'no-node.json',True,dict(os.environ,PATH='/nonexistent'))
(ROOT/'results/safety.json').write_text(json.dumps(results,indent=2));print(f'{len(results)} file safety/standalone checks passed')
