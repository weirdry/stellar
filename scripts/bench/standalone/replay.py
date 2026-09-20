"""Replay the archived experiment in a new disposable directory on macOS."""

import argparse
import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

from check_archive import DATA, ROOT, SOURCE, check, fingerprint, load, public_correctness, verify_correctness

BASELINE = '77ee2b9ba2d62f6523f0f0272ca714b1b920fa3b'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--node', required=True)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--sizes', default='1000,10000,50000')
    parser.add_argument('--trials', type=int, default=5)
    args = parser.parse_args()
    try:
        sizes = [int(value) for value in args.sizes.split(',')]
        assert sizes and len(sizes) == len(set(sizes)) and all(n >= 100 and n % 20 == 0 for n in sizes)
        assert args.trials > 0
    except (ValueError, AssertionError):
        parser.error('sizes must be distinct multiples of 20, at least 100; trials must be positive')
    if platform.system() != 'Darwin':
        parser.error('this archived wait4 RSS protocol is macOS-only')
    for tool in ['git', 'tar', 'go', 'cargo', 'rustc']:
        if not shutil.which(tool):
            parser.error(f'{tool} is required; no global tools are installed by this command')
    node = Path(args.node).resolve(strict=True)
    output = args.output.absolute()
    if os.path.lexists(output) or not output.parent.is_dir():
        parser.error('output must be a fresh path with an existing parent')
    for name in ['NODE_OPTIONS', 'GOMAXPROCS', 'GOMEMLIMIT', 'GOGC', 'RUSTFLAGS']:
        if os.environ.get(name):
            parser.error(f'unset {name} to use the recorded runtime configuration')
    check()
    for name in ['package.json', 'pnpm-lock.yaml']:
        original = subprocess.check_output(['git', 'show', f'{BASELINE}:{name}'], cwd=ROOT)
        if original != (ROOT / name).read_bytes():
            parser.error('dependency manifests differ from the archived baseline; use the archival PR checkout')
    if not (ROOT / 'node_modules/esbuild/lib/main.js').is_file():
        parser.error('run just init before replaying the archive')
    node_version = subprocess.check_output([str(node), '--version'], text=True).strip()
    if not node_version.startswith('v24.'):
        parser.error('the reference requires Node 24.x')

    # The fresh directory is task-owned; later failures intentionally retain evidence.
    output.mkdir(mode=0o700)
    for name in ['bin', 'results', 'inputs', 'extracted', 'baseline']:
        (output / name).mkdir()
    for path in SOURCE.iterdir():
        if path.name == '__pycache__':
            continue
        if path.is_dir():
            shutil.copytree(path, output / path.name)
        else:
            shutil.copy2(path, output / path.name)
    baseline = output / 'baseline'
    with (output / 'baseline.tar').open('wb') as archive:
        subprocess.run(['git', 'archive', BASELINE, 'bin', 'lib', 'schemas', 'assets/viewer',
                        'examples/mixed-capture.json', 'examples/purpose-capture.json',
                        'test/normalize.test.js', 'test/fixtures.js',
                        'package.json', 'pnpm-lock.yaml', 'scripts/bench/fixtures.mjs'],
                       cwd=ROOT, stdout=archive, check=True)
    subprocess.run(['tar', '-xf', str(output / 'baseline.tar'), '-C', str(baseline)], check=True)
    (output / 'baseline.tar').unlink()
    for name, digest in load(DATA / 'baseline-identity.json')['files'].items():
        assert fingerprint(baseline / name)['sha256'] == digest, name
    (baseline / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
    env = dict(os.environ, PROBE_NODE=str(node), PROBE_SIZES=','.join(map(str, sizes)),
               PROBE_TRIALS=str(args.trials), PROBE_ENGINES='node-cli,node-focused,go,rust',
               PROBE_RECEIPT='differential.json', GOTOOLCHAIN='local',
               GOPATH=str(output / 'cache/gopath'), GOMODCACHE=str(output / 'cache/go-mod'),
               GOCACHE=str(output / 'cache/go-build'), CARGO_HOME=str(output / 'cache/cargo'),
               CARGO_TARGET_DIR=str(output / 'cache/rust-target'), PYTHONDONTWRITEBYTECODE='1')

    def run(command, log):
        print(f'Running {log}', flush=True)
        with (output / 'results' / log).open('w') as stream:
            subprocess.run(command, cwd=output, env=env, stdout=stream, stderr=subprocess.STDOUT, check=True)

    versions = {'node': node_version, 'platform': platform.platform(), 'python': platform.python_version()}
    for tool in ['go', 'rustc', 'cargo']:
        versions[tool] = subprocess.check_output([tool, 'version' if tool == 'go' else '--version'], text=True).strip()
    (output / 'results/environment.json').write_text(json.dumps(versions, indent=2) + '\n')
    run([str(node), '--test', str(baseline / 'test/normalize.test.js')], 'reference-suite.log')
    run([str(node), 'build-focused.mjs'], 'focused-build.log')
    run([str(node), 'cases.mjs', 'cases'], 'cases.log')
    for name, content in load(SOURCE / 'extra-cases.json').items():
        (output / 'cases' / name).write_text(content)
    collector = output / 'collector'
    shutil.copytree(baseline, collector, symlinks=True)
    normalizer = collector / 'lib/normalize.js'
    source = normalizer.read_text()
    anchor = 'export function normalizeCapture(capture) {'
    assert source.count(anchor) == 1
    source = "import {writeFileSync as probeWrite} from 'node:fs';\n" + source.replace(anchor, 'function referenceNormalizeCapture(capture) {')
    source += '''\nlet probeNumber = 0;
export function normalizeCapture(capture) {
  const file = new URL(`../../extracted/case-${++probeNumber}.json`, import.meta.url);
  probeWrite(file, JSON.stringify(capture));
  return referenceNormalizeCapture(capture);
}
'''
    normalizer.write_text(source)
    # Match the original collector: CLI assertions use the uninstrumented product bundle.
    shutil.copy2(baseline / 'bin/stellar.mjs', collector / 'bin/stellar.js')
    run([str(node), '--test', str(collector / 'test/normalize.test.js')], 'collector-suite.log')
    expected = load(DATA / 'correctness.json')
    actual_cases = {str(p.relative_to(output)) for folder in ['cases', 'extracted']
                    for p in (output / folder).glob('*.json') if p.name != 'manifest.json'}
    assert actual_cases == {row['case'] for row in expected}
    for row in expected:
        assert fingerprint(output / row['case'])['sha256'] == row['sha256'], row['case']
    run(['go', '-C', 'go', 'build', '-mod=readonly', '-trimpath', '-o', str(output / 'bin/go-core'), '.'], 'go-build.log')
    run(['cargo', 'build', '--release', '--locked', '--manifest-path', 'rust/Cargo.toml'], 'rust-build.log')
    shutil.copy2(output / 'cache/rust-target/release/stellar-standalone-probe', output / 'bin/rust-core')
    run([sys.executable, 'differential.py'], 'differential.log')
    actual = public_correctness(load(output / 'results/differential.json'))
    verify_correctness(actual)
    assert actual == expected, 'correctness receipts differ from the retained public projection'
    run([sys.executable, 'safety.py'], 'safety.log')
    safety = [{k: v for k, v in row.items() if k != 'stderr'} for row in load(output / 'results/safety.json')]
    assert safety == load(DATA / 'safety.json')
    run([str(node), str(baseline / 'scripts/bench/fixtures.mjs'), 'generate', 'inputs', args.sizes], 'fixtures.log')
    for size in sizes:
        capture = output / f'inputs/{size}/initial-capture.json'
        for mode in ['steady', 'churn']:
            (capture.parent / f'{mode}-capture.json').unlink()
        recorded_input = load(DATA / 'environment.json')['inputs'].get(str(size))
        if recorded_input:
            assert fingerprint(capture)['sha256'] == recorded_input['sha256']
        run([str(node), str(baseline / 'bin/stellar.mjs'), 'normalize', str(capture),
             str(capture.parent / 'draft.json')], f'expected-{size}.log')
    run([sys.executable, 'benchmark.py'], 'benchmark.log')
    measured = load(output / 'results/benchmark.json')
    assert len(measured) == len(sizes) * 4 * (args.trials + 1)
    assert all(row['semantic_match'] for row in measured)
    hashes = {str(p.relative_to(output)): fingerprint(p) for folder in ['bin', 'go', 'rust', 'inputs']
              for p in (output / folder).rglob('*') if p.is_file()}
    (output / 'results/artifacts.json').write_text(json.dumps(hashes, indent=2) + '\n')
    print(f'Replay passed: 169 cases, 22 storage checks, {len(measured)} benchmark invocations. Results: {output / "results"}')


if __name__ == '__main__':
    main()
