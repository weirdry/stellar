"""Profile synthetic benchmark artifacts separately from uninstrumented timings."""

import argparse
from collections import defaultdict
import hashlib
import json
import os
from pathlib import Path
import platform
import random
import subprocess
import sys
import time


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def frame_key(frame, stage, script):
    url = frame.get('url', '')
    if url.startswith(stage.as_uri() + '/'):
        url = url[len(stage.as_uri()) + 1:]
    elif url == script.as_uri():
        url = 'profiler/heap-sample.mjs'
    elif url.startswith('file:'):
        # Raw profiles stay local; never retain machine-specific absolute paths.
        url = 'external-file/' + url.rsplit('/', 1)[-1]
    return (frame.get('functionName', ''), url, frame.get('lineNumber', -1) + 1,
            frame.get('columnNumber', -1) + 1)


def ranked(values, unit):
    return [{'function': key[0], 'url': key[1], 'line': key[2], 'column': key[3],
             unit: value} for key, value in sorted(values.items(), key=lambda pair: (-pair[1], pair[0]))]


def cpu_summary(profile, stage, script):
    nodes = {n['id']: n for n in profile['nodes']}
    parents = {child: node['id'] for node in profile['nodes'] for child in node.get('children', [])}
    own, inclusive = defaultdict(int), defaultdict(int)
    samples, deltas = profile['samples'], profile['timeDeltas']
    if len(samples) != len(deltas) or any(delta < 0 for delta in deltas):
        raise ValueError('CPU samples and nonnegative time deltas must align.')
    for node_id, delta in zip(samples, deltas):
        own[frame_key(nodes[node_id]['callFrame'], stage, script)] += delta
        seen = set()
        while node_id is not None:
            key = frame_key(nodes[node_id]['callFrame'], stage, script)
            if key not in seen:
                inclusive[key] += delta
                seen.add(key)
            node_id = parents.get(node_id)
    return {'sample_count': len(samples), 'sampled_us': sum(deltas),
            'profile_duration_us': profile['endTime'] - profile['startTime'],
            'self': ranked(own, 'us'), 'inclusive': ranked(inclusive, 'us')}


def heap_summary(document, stage, script):
    own, inclusive = defaultdict(int), defaultdict(int)
    def visit(node, ancestors):
        key = frame_key(node['callFrame'], stage, script)
        chain = ancestors | {key}
        own[key] += node['selfSize']
        for ancestor in chain:
            inclusive[ancestor] += node['selfSize']
        for child in node.get('children', []):
            visit(child, chain)
    visit(document['profile']['head'], set())
    return {'parameters': document['parameters'], 'estimated_allocated_bytes': sum(own.values()),
            'self': ranked(own, 'bytes'), 'inclusive': ranked(inclusive, 'bytes')}


def compact(summary, mode):
    # Keep raw profiles locally; retain dominant frames and named product paths.
    unit = 'us' if mode == 'cpu' else 'bytes'
    phases = {'normalizeCapture', 'refreshState', 'applyChoices', 'assertState',
              'validateWorkMap', 'readWorkMap', 'writeRun', 'renderWorkMap',
              'structuredClone', 'serialize', '(garbage collector)', '(idle)'}
    return {**summary, 'self': summary['self'][:20],
            'unlisted_self_' + unit: sum(f[unit] for f in summary['self'][20:]),
            'inclusive': [f for i, f in enumerate(summary['inclusive'])
                          if i < 30 or f['function'] in phases]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--node', required=True)
    parser.add_argument('--benchmark', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--trials', type=int, default=3)
    args = parser.parse_args()
    if sys.platform not in ('darwin', 'linux') or sys.version_info < (3, 11) or args.trials < 1:
        parser.error('Requires macOS/Linux, Python >=3.11 and positive trials.')
    repo = Path(__file__).resolve().parents[2]
    benchmark = args.benchmark.resolve()
    stage = benchmark / 'staged-skill'
    script = Path(__file__).with_name('heap-sample.mjs').resolve()
    result_path = benchmark / 'results.json'
    baseline = json.loads(result_path.read_text())
    manifest = json.loads((repo / 'bin/stellar.manifest.json').read_text())
    if baseline['runtime_files'] != manifest['files']:
        parser.error('Benchmark runtime differs from this checkout.')
    if baseline['protocol']['fixture'] != digest(Path(__file__).with_name('fixtures.mjs')):
        parser.error('Benchmark fixture source differs from this checkout.')
    for name, expected in manifest['files'].items():
        if digest(stage / name) != expected:
            parser.error(f'Staged runtime hash differs: {name}')
    for name, expected in baseline['artifacts'].items():
        path = (benchmark / 'data' / name).resolve()
        if not path.is_relative_to(benchmark / 'data') or digest(path) != expected:
            parser.error('Benchmark input/setup artifact differs.')
    available = baseline['protocol']['sizes']
    # Small startup-dominated control and large paths, with real churn choices.
    selected = {(min(available), 'normalize'), (min(available), 'refresh'),
                (max(available), 'normalize'), (max(available), 'refresh'),
                (max(available), 'render')}
    choice_sizes = [n for n in available if n <= 10000]
    if choice_sizes:
        selected.add((max(choice_sizes), 'classify'))
    selected = sorted(selected)
    tool_hashes = {p.name: digest(p) for p in [Path(__file__), script]}
    baseline_hash = digest(result_path)
    output = args.output.resolve()
    try:
        output.mkdir()
    except FileExistsError:
        parser.error('Output directory already exists; choose a fresh path.')
    rows = []
    cases = [(mode, trial, size, op) for mode in ['cpu', 'heap']
             for trial in range(args.trials) for size, op in selected]
    random.Random(20260920).shuffle(cases)
    for mode, trial, size, op in cases:
        data = benchmark / 'data' / str(size)
        tag = f'{size}-{op}-{mode}-{trial}'
        run = output / tag
        run.mkdir()
        dest = run / 'output'
        if op == 'normalize':
            arguments = [op, data / 'initial-capture.json', dest]
            pairs = [(dest, data / 'draft.json')]
        elif op == 'render':
            arguments = [op, data / 'steady/work-map.json', dest]
            pairs = [(dest, data / 'steady/stellar.html')]
        else:
            prior, other, expected = ('prior', 'steady-capture.json', 'steady') if op == 'refresh' else ('churn', 'choices.json', 'reviewed')
            arguments = [op, data / prior / 'state.json', data / other, dest]
            pairs = [(dest / name, data / expected / name) for name in ['state.json', 'work-map.json', 'changes.json']]
        raw = run / ('cpu.cpuprofile' if mode == 'cpu' else 'heap.json')
        environment = os.environ.copy()
        flags = [f'--cpu-prof-dir={run}', '--cpu-prof-name=cpu.cpuprofile', '--cpu-prof-interval=1000', '--cpu-prof']
        if mode == 'heap':
            flags = ['--import', str(script)]
            environment['STELLAR_HEAP_PROFILE'] = str(raw)
        with (run / 'stdout').open('wb') as out, (run / 'stderr').open('wb') as err:
            start = time.perf_counter_ns()
            proc = subprocess.Popen([args.node, *flags, str(stage / 'bin/stellar.mjs'), *map(str, arguments)], stdout=out, stderr=err, env=environment)
            try:
                _, status, usage = os.wait4(proc.pid, 0)
            except BaseException:
                proc.kill()
                os.wait4(proc.pid, 0)
                raise
            elapsed = (time.perf_counter_ns() - start) / 1e6
            proc.returncode = os.waitstatus_to_exitcode(status)
        if proc.returncode:
            raise RuntimeError(f'{tag} exited {proc.returncode}; inspect its local stderr.')
        comparisons = {}
        for actual, expected in pairs:
            actual_hash = digest(actual)
            expected_hash = baseline['artifacts'][str(expected.relative_to(benchmark / 'data'))]
            if actual_hash != expected_hash:
                raise RuntimeError(f'Profiled output differs: {tag}/{actual.name}')
            comparisons[str(actual.relative_to(run))] = actual_hash
        raw_profile = json.loads(raw.read_text())
        summary = cpu_summary(raw_profile, stage, script) if mode == 'cpu' else heap_summary(raw_profile, stage, script)
        rows.append({'size': size, 'operation': op, 'mode': mode, 'trial': trial,
                     'instrumented_wall_ms': elapsed,
                     'instrumented_cpu_ms': (usage.ru_utime + usage.ru_stime) * 1000,
                     'instrumented_peak_rss_mib': usage.ru_maxrss / (1048576 if sys.platform == 'darwin' else 1024),
                     'raw_profile_sha256': digest(raw), 'output_hashes': comparisons, **compact(summary, mode)})
        print(f'{tag}: output parity passed', flush=True)
    if digest(result_path) != baseline_hash or any(digest(p) != tool_hashes[p.name] for p in [Path(__file__), script]):
        raise RuntimeError('Profiler or baseline identity changed during execution.')
    result = {'revision': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip(),
              'benchmark_results_sha256': baseline_hash, 'runtime_files': manifest['files'],
              'benchmark_protocol': baseline['protocol'],
              'environment': {'platform': platform.platform(), 'machine': platform.machine(), 'logical_cpus': os.cpu_count(),
                              'node': subprocess.check_output([args.node, '--version'], text=True).strip(), 'python': platform.python_version()},
              'profiler_files': tool_hashes,
              'protocol': {'trials_per_case_and_mode': args.trials, 'cpu_interval_us': 1000, 'heap_interval_bytes': 524288,
                           'include_collected_allocations': True, 'serial_execution': True, 'shuffle_seed': 20260920,
                           'retained_frames': 'top 20 self; top 30 inclusive plus named product paths'},
              'cases': [{'size': n, 'operation': op} for n, op in selected], 'rows': rows}
    (output / 'results.json').write_text(json.dumps(result, indent=2) + '\n')
    print(f'Passed {len(rows)} profiled command comparisons. Results: {output / "results.json"}')


if __name__ == '__main__':
    main()
