"""Optional whole-command comparison: baseline Node versus Node/Go and Node/Rust."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import random
import statistics
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]

def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def save(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')

parser = argparse.ArgumentParser(description=__doc__)
for name in ['node', 'build', 'benchmark', 'output']:
    parser.add_argument('--' + name, required=True, type=Path)
parser.add_argument('--trials', type=int, default=5)
args = parser.parse_args()
if args.trials < 1 or sys.platform not in ('darwin', 'linux'):
    parser.error('Requires positive trials and macOS/Linux.')
for name in ['node', 'build', 'benchmark', 'output']:
    setattr(args, name, getattr(args, name).resolve())
if args.output.exists():
    parser.error('Output exists; choose a fresh directory.')
for key in ['NODE_OPTIONS', 'NODE_V8_COVERAGE', 'STELLAR_NATIVE_WORKER', 'STELLAR_NATIVE_RECEIPT']:
    if key in os.environ:
        parser.error(f'Unset {key} before comparing.')
try:
    build_sources = json.loads((args.build / 'stage/build-sources.json').read_text())
    for name, expected in build_sources.items():
        if digest(REPO / name) != expected:
            raise ValueError(f'Build source changed: {name}; rebuild explicitly.')
    reference = json.loads((args.benchmark / 'results.json').read_text())
    manifest = json.loads((args.build / 'stage/bin/stellar.manifest.json').read_text())
    if reference['runtime_files'] != manifest['files']:
        raise ValueError('Runtime differs from retained baseline.')
    for name, expected in manifest['files'].items():
        if digest(args.build / 'stage' / name) != expected:
            raise ValueError(f'Staged runtime mismatch: {name}')
    if reference['protocol']['fixture'] != digest(HERE.parent / 'fixtures.mjs'):
        raise ValueError('Fixture generator differs.')
    sizes = reference['protocol']['sizes']
    for n in sizes:
        for name in ['initial-capture.json', 'draft.json']:
            key = f'{n}/{name}'
            if digest(args.benchmark / 'data' / key) != reference['artifacts'][key]:
                raise ValueError(f'Reference artifact differs: {key}')
    for engine in ['go', 'rust']:
        if not os.access(args.build / f'{engine}-worker', os.X_OK):
            raise ValueError(f'Missing executable: {engine}')
except (OSError, ValueError, KeyError, TypeError) as error:
    parser.error(str(error))
# Fail before workloads when process-tree sampling is unavailable.
try:
    subprocess.run(['ps', '-axo', 'pid=,ppid=,rss='], check=True, stdout=subprocess.DEVNULL)
except (OSError, subprocess.CalledProcessError):
    parser.error('Process-tree RSS sampling requires permission to run ps.')
args.output.mkdir()
root = args.output
rows, parity, memory = [], [], []
engines = ['node', 'probe-node', 'go', 'rust']


def command(engine, capture, dest, receipt):
    env = os.environ.copy()
    cli = args.build / 'stage/bin' / ('stellar.mjs' if engine == 'node' else 'probe.mjs')
    if engine in ('go', 'rust'):
        env['STELLAR_NATIVE_WORKER'] = str(args.build / f'{engine}-worker')
        env['STELLAR_NATIVE_RECEIPT'] = str(receipt)
    return [str(args.node), str(cli), 'normalize', str(capture), str(dest)], env


def invoke(engine, capture, dest, tag, sample_memory=False):
    receipt = root / (tag + '.receipt.json')
    cmd, env = command(engine, capture, dest, receipt)
    observed, samples = 0, 0
    with (root / (tag + '.stdout')).open('wb') as out, (root / (tag + '.stderr')).open('wb') as err:
        start = time.perf_counter_ns()
        proc = subprocess.Popen(cmd, env=env, stdout=out, stderr=err)
        try:
            while True:
                pid, status, usage = os.wait4(proc.pid, os.WNOHANG if sample_memory else 0)
                if pid:
                    break
                # Separate memory runs: sampled simultaneous sum, not sum of
                # individual peaks. ps/sampling overhead is excluded from timings.
                listing = subprocess.check_output(['ps', '-axo', 'pid=,ppid=,rss='], text=True)
                table = [tuple(map(int, line.split())) for line in listing.splitlines() if line.strip()]
                family = {proc.pid}
                while True:
                    more = {pid for pid, ppid, _ in table if ppid in family}
                    if more <= family:
                        break
                    family |= more
                observed = max(observed, sum(rss for pid, _, rss in table if pid in family) / 1024)
                samples += 1
                time.sleep(0.02)
        except BaseException:
            proc.kill()
            os.wait4(proc.pid, 0)
            raise
        elapsed = (time.perf_counter_ns() - start) / 1e6
        proc.returncode = os.waitstatus_to_exitcode(status)
    result = {
        'exit': proc.returncode,
        'stdout': (root / (tag + '.stdout')).read_bytes(),
        'stderr': (root / (tag + '.stderr')).read_bytes(),
        'receipt': json.loads(receipt.read_text()) if receipt.exists() else None,
        'wall_ms': elapsed,
        # wait4 includes CPU of descendants waited for by the exiting child.
        'cpu_ms': (usage.ru_utime + usage.ru_stime) * 1000,
        'wait4_peak_rss_mib': usage.ru_maxrss / (1048576 if sys.platform == 'darwin' else 1024),
        'sampled_tree_peak_mib': observed, 'memory_samples': samples,
    }
    return result


def verify_success(result, engine, dest, expected):
    if result['exit'] != 0 or result['stderr']:
        raise RuntimeError(f'{engine} failed: {result["stderr"][:2000]}')
    if engine in ('go', 'rust') and result['receipt'] != {'outcome': 'native'}:
        raise RuntimeError(f'{engine} fell back: {result["receipt"]}')
    if digest(dest) != digest(expected):
        raise RuntimeError(f'{engine} output mismatch: {dest.name}')


# All existing normalization assertions, redirected to the isolated implementation.
for engine in engines:
    env = os.environ.copy()
    if engine in ('go', 'rust'):
        env['STELLAR_NATIVE_WORKER'] = str(args.build / f'{engine}-worker')
    with (root / f'{engine}-canonical-tests.txt').open('w') as log:
        suite = subprocess.run([str(args.node), '--test', str(args.build / 'stage/test/normalize.test.js')], env=env, stdout=log, stderr=subprocess.STDOUT)
    if suite.returncode:
        raise RuntimeError(f'{engine} failed canonical assertions')

# Differential corpus. Existing synthetic output is a sentinel on every failure.
subprocess.run([str(args.node), str(HERE / 'cases.mjs'), str(root / 'cases')], check=True)
for case in json.loads((root / 'cases/manifest.json').read_text()):
    name = case['name']
    baseline = None
    for engine in engines:
        dest = root / f'{name}-{engine}.json'
        dest.write_bytes(b'synthetic previous output\n')
        result = invoke(engine, root / 'cases' / (name + '.json'), dest, f'parity-{name}-{engine}')
        signature = (result['exit'], result['stdout'], result['stderr'], dest.read_bytes())
        if engine == 'node':
            baseline = signature
        elif signature != baseline:
            raise RuntimeError(f'Differential mismatch: {name}/{engine}')
        if case['native'] and engine in ('go', 'rust') and result['receipt'] != {'outcome': 'native'}:
            raise RuntimeError(f'Expected actual native work: {name}/{engine}')
        parity.append({'case': name, 'engine': engine, 'exit': result['exit'], 'output_sha256': digest(dest), 'receipt': result['receipt']})
        dest.unlink()
print(f'Canonical suites and {len(parity)} differential comparisons passed.', flush=True)

# One untimed warm-up per engine and size; fresh process for every invocation.
for n in sizes:
    capture = args.benchmark / f'data/{n}/initial-capture.json'
    expected = args.benchmark / f'data/{n}/draft.json'
    for engine in engines:
        dest = root / f'warmup-{n}-{engine}.json'
        result = invoke(engine, capture, dest, dest.stem)
        verify_success(result, engine, dest, expected)
        dest.unlink()
    order = list(engines)
    rng = random.Random(20260920 + n)
    for trial in range(args.trials):
        rng.shuffle(order)
        for engine in order:
            dest = root / f'timed-{n}-{trial}-{engine}.json'
            result = invoke(engine, capture, dest, dest.stem)
            verify_success(result, engine, dest, expected)
            rows.append({'size': n, 'trial': trial, 'engine': engine, **{k: result[k] for k in ['wall_ms', 'cpu_ms', 'wait4_peak_rss_mib']}, 'output_sha256': digest(dest), 'native': result['receipt']})
            dest.unlink()
            print(f'{n}/{trial}/{engine}: {result["wall_ms"]:.1f} ms', flush=True)
    for engine in engines:
        dest = root / f'memory-{n}-{engine}.json'
        result = invoke(engine, capture, dest, dest.stem, sample_memory=True)
        verify_success(result, engine, dest, expected)
        memory.append({'size': n, 'engine': engine, 'sampled_tree_peak_mib': result['sampled_tree_peak_mib'], 'samples': result['memory_samples']})
        dest.unlink()

summary = []
for n in sizes:
    for engine in engines:
        samples = [r for r in rows if r['size'] == n and r['engine'] == engine]
        summary.append({'size': n, 'engine': engine, 'median_wall_ms': statistics.median(r['wall_ms'] for r in samples), 'min_wall_ms': min(r['wall_ms'] for r in samples), 'max_wall_ms': max(r['wall_ms'] for r in samples), 'median_cpu_ms': statistics.median(r['cpu_ms'] for r in samples)})
files = [p for p in HERE.rglob('*') if p.is_file() and p.suffix != '.md']
result = {
    'protocol': {'sizes': sizes, 'trials': args.trials, 'boundary': 'Node validation and atomic writer; native alias/identity, issue materialization and relation deduplication; JSON stdin/stdout', 'warmup': 1, 'memory': 'one separate ps-sampled process-tree run per case, 20 ms sleep plus ps duration; lower bound, not exact peak', 'seed': 20260920},
    'environment': {'platform': platform.platform(), 'machine': platform.machine(), 'cpus': os.cpu_count(), 'node': subprocess.check_output([str(args.node), '--version'], text=True).strip(), 'python': platform.python_version(), 'go': (args.build / 'go-version.txt').read_text().strip(), 'rust': (args.build / 'rust-version.txt').read_text().strip(), 'cargo': (args.build / 'cargo-version.txt').read_text().strip()},
    'revision': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip(),
    'harness_files': {str(p.relative_to(REPO)): digest(p) for p in sorted(files)},
    'build_sources': build_sources,
    'baseline_result_sha256': digest(args.benchmark / 'results.json'),
    'runtime_files': manifest['files'],
    'probe_sha256': digest(args.build / 'stage/bin/probe.mjs'),
    'workers': {engine: {'sha256': digest(args.build / f'{engine}-worker'), 'bytes': (args.build / f'{engine}-worker').stat().st_size} for engine in ['go', 'rust']},
    'artifacts': {f'{n}/{name}': digest(args.benchmark / 'data' / str(n) / name) for n in sizes for name in ['initial-capture.json','draft.json']},
    'parity': parity, 'rows': rows, 'summary': summary, 'memory': memory,
}
save(root / 'results.json', result)
print(json.dumps(summary, indent=2))
