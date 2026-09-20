import json,subprocess,pathlib,hashlib,os
ROOT=pathlib.Path(__file__).resolve().parent
NODE=os.environ['PROBE_NODE']
def command(engine,src,dst):
 if engine=='node-cli':return [NODE,str(ROOT/'baseline/bin/stellar.mjs'),'normalize',str(src),str(dst)]
 if engine=='node-focused':return [NODE,str(ROOT/'bin/node-focused.mjs'),str(src),str(dst)]
 return [str(ROOT/f'bin/{engine}-core'),str(src),str(dst),str(ROOT/'baseline/schemas')]
def diff(a,b,path='$'):
 if type(a)!=type(b):return f'{path}: type {type(a).__name__} != {type(b).__name__}'
 if isinstance(a,dict):
  if a.keys()!=b.keys():return f'{path}: keys {a.keys()-b.keys()} / {b.keys()-a.keys()}'
  for k in a:
   if (d:=diff(a[k],b[k],path+'.'+k)):return d
 elif isinstance(a,list):
  if len(a)!=len(b):return f'{path}: lengths {len(a)} / {len(b)}'
  for i,(x,y) in enumerate(zip(a,b)):
   if (d:=diff(x,y,f'{path}[{i}]')):return d
 elif a!=b:return f'{path}: {str(a)[:100]!r} != {str(b)[:100]!r}'
 return None

def main():
 engines=os.environ.get('PROBE_ENGINES','node-cli,node-focused,go,rust').split(','); results=[]
 work=ROOT/'results/differential';work.mkdir(exist_ok=True)
 cases=sorted((ROOT/'cases').glob('*.json'))+sorted((ROOT/'extracted').glob('*.json'))
 for src in cases:
  if src.name=='manifest.json':continue
  record={'case':str(src.relative_to(ROOT)),'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'engines':{}}; reference=None
  for engine in engines:
   dst=work/(engine+'.json');dst.write_text('SENTINEL')
   p=subprocess.run(command(engine,src,dst),capture_output=True,text=True,timeout=30)
   output=json.loads(dst.read_text()) if p.returncode==0 else None
   receipt={'exit':p.returncode,'stderr':p.stderr[:800],'preserved_on_failure':p.returncode==0 or dst.read_text()=='SENTINEL'}
   if engine=='node-cli':reference=(p.returncode,output,p.stdout)
   else:
    receipt['acceptance_matches']=(p.returncode==0)==(reference[0]==0)
    receipt['output_difference']=diff(reference[1],output) if p.returncode==reference[0]==0 else None
    receipt['summary_matches']=json.loads(p.stdout)==json.loads(reference[2]) if p.returncode==reference[0]==0 else None
    if not receipt['acceptance_matches'] or receipt['output_difference'] or receipt['summary_matches']==False or not receipt['preserved_on_failure']:
     print(record['case'],engine,json.dumps(receipt,ensure_ascii=True),flush=True)
   record['engines'][engine]=receipt
  results.append(record)
 (ROOT/'results'/os.environ.get('PROBE_RECEIPT','differential.json')).write_text(json.dumps(results,indent=2))
 print('CASES',len(results),flush=True)
if __name__=='__main__':main()
