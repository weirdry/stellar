"""Optional POSIX benchmark; Python standard library only, outside CI timing gates."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import random
import shutil
import statistics
import subprocess
import sys
import time


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--node', required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--reference', type=Path)
parser.add_argument('--sizes', default='1000,10000,50000')
parser.add_argument('--trials', type=int, default=3)
args = parser.parse_args()
sizes = [int(n) for n in args.sizes.split(',')]
if (sys.platform not in ('darwin', 'linux') or sys.version_info < (3, 11)
        or not sizes or len(set(sizes)) != len(sizes)
        or any(n < 100 or n % 20 for n in sizes) or args.trials < 1):
    parser.error('Requires macOS/Linux, Python >=3.11, distinct sizes >=100 divisible by 20, and positive trials.')

repo = Path(__file__).resolve().parents[2]
reference = json.loads(args.reference.read_text()) if args.reference else None
protocol = {'sizes': sizes, 'trials': args.trials, 'fixture': digest(Path(__file__).with_name('fixtures.mjs'))}
if reference and reference['protocol'] != protocol:
    parser.error('Reference protocol differs (sizes, trials or fixture source).')
root = args.output.resolve()
root.mkdir()  # Fresh directory only; never reuse or clean a caller-owned path.
(root / 'data').mkdir()
(root / 'runs').mkdir()
stage = root / 'staged-skill'
(stage / 'bin').mkdir(parents=True)
for name in ['stellar.mjs', 'stellar.manifest.json']:
    shutil.copyfile(repo / 'bin' / name, stage / 'bin' / name)
for name in ['schemas', 'assets']:
    shutil.copytree(repo / name, stage / name)
manifest = json.loads((stage / 'bin/stellar.manifest.json').read_text())
for name, expected in manifest['files'].items():
    if digest(stage / name) != expected:
        raise RuntimeError(f'Staged resource differs from manifest: {name}')

cli = [args.node, str(stage / 'bin/stellar.mjs')]
rows, receipts, fingerprints = [], [], {}


def invoke(command, tag):
    stdout, stderr = root / 'runs' / (tag + '.stdout'), root / 'runs' / (tag + '.stderr')
    with stdout.open('wb') as out, stderr.open('wb') as err:
        start = time.perf_counter_ns()
        proc = subprocess.Popen(cli + list(map(str, command)), stdout=out, stderr=err)
        try:
            _, status, usage = os.wait4(proc.pid, 0)
        except BaseException:
            proc.kill()
            os.wait4(proc.pid, 0)
            raise
        elapsed = (time.perf_counter_ns() - start) / 1e6
        proc.returncode = os.waitstatus_to_exitcode(status)
    if proc.returncode:
        raise RuntimeError(f'{tag} exited {proc.returncode}: {stderr.read_text()[:2000]}')
    result = json.loads(stdout.read_text())
    stdout.unlink()
    stderr.unlink()
    return {
        'wall_ms': elapsed,
        'cpu_ms': (usage.ru_utime + usage.ru_stime) * 1000,
        'peak_rss_mib': usage.ru_maxrss / (1048576 if sys.platform == 'darwin' else 1024),
    }, result


def fixture(*arguments):
    subprocess.run([args.node, str(Path(__file__).with_name('fixtures.mjs')), *map(str, arguments)], check=True)


def fingerprint(name, path):
    actual = digest(path)
    if reference and reference['artifacts'].get(name) != actual:
        raise RuntimeError(f'Reference artifact differs: {name}')
    fingerprints[name] = actual


def verify(n, run, capture, label):
    _, result = invoke(['verify-run', capture, run / 'work-map.json', run / 'stellar.html', run / 'state.json'], f'{n}-{label}-verify')
    expected = {name: 'pass' for name in ['captureFacts', 'embeddedMap', 'bundledViewer', 'stateMap']}
    if not result['valid'] or result['checks'] != expected:
        raise RuntimeError(f'Failed verification: {result}')
    receipts.append({'size': n, 'kind': label, 'checks': result['checks']})


fixture('generate', root / 'data', args.sizes)
for n in sizes:
    data = root / 'data' / str(n)
    for mode in ['initial', 'steady', 'churn']:
        fingerprint(f'{n}/{mode}-capture.json', data / f'{mode}-capture.json')
    invoke(['normalize', data / 'initial-capture.json', data / 'draft.json'], f'{n}-setup-normalize')
    fixture('author', data / 'draft.json', data / 'initial-map.json')
    invoke(['remember', data / 'initial-map.json', data / 'prior'], f'{n}-setup-remember')
    invoke(['refresh', data / 'prior/state.json', data / 'steady-capture.json', data / 'steady'], f'{n}-setup-refresh')
    invoke(['render', data / 'steady/work-map.json', data / 'steady/stellar.html'], f'{n}-setup-render')
    fixture('continuity', data / 'prior/state.json', data / 'steady/state.json')
    verify(n, data / 'steady', data / 'steady-capture.json', 'steady')
    operations = ['normalize', 'refresh', 'render']
    if n <= 10000:
        invoke(['refresh', data / 'prior/state.json', data / 'churn-capture.json', data / 'churn'], f'{n}-churn-refresh')
        fixture('choices', data / 'churn/state.json', data / 'choices.json')
        invoke(['classify', data / 'churn/state.json', data / 'choices.json', data / 'reviewed'], f'{n}-churn-classify')
        invoke(['render', data / 'reviewed/work-map.json', data / 'reviewed/stellar.html'], f'{n}-churn-render')
        fixture('continuity', data / 'prior/state.json', data / 'reviewed/state.json')
        verify(n, data / 'reviewed', data / 'churn-capture.json', 'churn')
        operations.append('classify')
    # Hash all fixture inputs and baseline outputs, including non-renderable churn.
    for path in sorted(data.rglob('*.json')) + sorted(data.rglob('*.html')):
        fingerprint(str(path.relative_to(root / 'data')), path)
    rng = random.Random(20260920 + n)
    for trial in range(args.trials):
        rng.shuffle(operations)
        for operation in operations:
            dest = root / 'runs' / f'{n}-{operation}-{trial}'
            if operation == 'normalize':
                command = [operation, data / 'initial-capture.json', dest]
                pairs = [(dest, data / 'draft.json')]
            elif operation == 'render':
                command = [operation, data / 'steady/work-map.json', dest]
                pairs = [(dest, data / 'steady/stellar.html')]
            else:
                prior = 'prior' if operation == 'refresh' else 'churn'
                other = 'steady-capture.json' if operation == 'refresh' else 'choices.json'
                expected = 'steady' if operation == 'refresh' else 'reviewed'
                command = [operation, data / prior / 'state.json', data / other, dest]
                pairs = [(dest / f, data / expected / f) for f in ['state.json', 'work-map.json', 'changes.json']]
            measurement, _ = invoke(command, dest.name)
            for actual, expected in pairs:
                if digest(actual) != digest(expected):
                    raise RuntimeError(f'Non-deterministic output: {dest.name}/{actual.name}')
            rows.append({'size': n, 'operation': operation, 'trial': trial, **measurement})
            print(f'{dest.name}: {measurement["wall_ms"]:.2f} ms, {measurement["peak_rss_mib"]:.2f} MiB', flush=True)
            # Only remove these just-created synthetic trial outputs after comparing.
            if dest.is_dir():
                shutil.rmtree(dest)
            else:
                dest.unlink()

if reference and fingerprints.keys() != reference['artifacts'].keys():
    raise RuntimeError('Reference artifact inventory differs.')
summary = []
for n in sizes:
    for operation in ['normalize', 'refresh', 'render', 'classify']:
        samples = [r for r in rows if r['size'] == n and r['operation'] == operation]
        if not samples:
            continue
        wall = [r['wall_ms'] for r in samples]
        summary.append({'size': n, 'operation': operation, 'median_ms': statistics.median(wall), 'min_ms': min(wall), 'max_ms': max(wall), 'peak_rss_mib': statistics.median(r['peak_rss_mib'] for r in samples)})
result = {
    'protocol': protocol,
    'environment': {'platform': platform.platform(), 'machine': platform.machine(), 'logical_cpus': os.cpu_count(), 'node': subprocess.check_output([args.node, '--version'], text=True).strip(), 'python': platform.python_version()},
    'revision': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip(),
    'runtime_files': manifest['files'],
    'runner_version': manifest['version'],
    'harness': {p.name: digest(p) for p in [Path(__file__), Path(__file__).with_name('fixtures.mjs')]},
    'reference_matched': bool(reference),
    'artifacts': fingerprints, 'rows': rows, 'summary': summary, 'receipts': receipts,
}
write_json(root / 'results.json', result)
print(f'Passed {len(rows)} timed output comparisons and {len(receipts)} four-part verification receipts. Results: {root / "results.json"}')
