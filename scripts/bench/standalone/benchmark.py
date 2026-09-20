import os,sys,time,json,random,pathlib,hashlib,statistics,platform,subprocess
from differential import ROOT,command,diff
ENGINES=['node-cli','node-focused','go','rust']
SIZES=[int(n) for n in os.environ['PROBE_SIZES'].split(',')]
TRIALS=int(os.environ['PROBE_TRIALS'])

def run(engine,src,dst):
 stdout=ROOT/'results/run.stdout';stderr=ROOT/'results/run.stderr'
 args=command(engine,src,dst)
 actions=[(os.POSIX_SPAWN_OPEN,fd,str(path),os.O_CREAT|os.O_WRONLY|os.O_TRUNC,0o600) for fd,path in [(1,stdout),(2,stderr)]]
 start=time.perf_counter_ns();pid=os.posix_spawn(args[0],args,os.environ,file_actions=actions)
 _,status,usage=os.wait4(pid,0);wall=(time.perf_counter_ns()-start)/1e6
 code=os.waitstatus_to_exitcode(status)
 if code:raise RuntimeError(f'{engine} exit {code}: '+stderr.read_text()[:2000])
 return {'wall_ms':wall,'cpu_ms':1000*(usage.ru_utime+usage.ru_stime),'peak_rss_mib':usage.ru_maxrss/1048576,'output_bytes':dst.stat().st_size,'summary':json.loads(stdout.read_text())}
def main():
 results=[];rng=random.Random(20260921);out=ROOT/'results/timed-output.json'
 for n in SIZES:
  src=ROOT/f'inputs/{n}/initial-capture.json';ref=json.loads((src.parent/'draft.json').read_text())
  for warmup,roundno in [(True,0)]+[(False,i+1) for i in range(TRIALS)]:
   order=ENGINES.copy();rng.shuffle(order)
   for engine in order:
    out.unlink(missing_ok=True);r=run(engine,src,out);r.update(size=n,engine=engine,round=roundno,warmup=warmup)
    actual=json.loads(out.read_text());delta=diff(ref,actual)
    if delta:raise RuntimeError(f'{engine} {n}: {delta}')
    r['semantic_match']=True;r['sha256']=hashlib.sha256(out.read_bytes()).hexdigest();out.unlink();del actual
    results.append(r);(ROOT/'results/benchmark.json').write_text(json.dumps(results,indent=2))
    print(f'{n:5} {engine:12} {"warmup" if warmup else roundno!s:6} {r["wall_ms"]:9.1f} ms {r["peak_rss_mib"]:8.1f} MiB',flush=True)
  del ref
 summary=[]
 for n in SIZES:
  for e in ENGINES:
   rows=[r for r in results if r['size']==n and r['engine']==e and not r['warmup']]
   s={'size':n,'engine':e,'n':len(rows)}
   for k in ['wall_ms','cpu_ms','peak_rss_mib']:
    s[k]={'median':statistics.median(r[k] for r in rows),'min':min(r[k] for r in rows),'max':max(r[k] for r in rows)}
   summary.append(s)
 (ROOT/'results/summary.json').write_text(json.dumps(summary,indent=2))
if __name__=='__main__':main()
