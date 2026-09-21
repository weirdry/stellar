"""Check retained evidence without compiling prototypes or running benchmarks."""

import hashlib
import json
import random
import statistics
from pathlib import Path

if not __debug__:
    raise SystemExit('Archive verification requires assertions; run without -O or PYTHONOPTIMIZE.')

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'scripts/bench/standalone'
DATA = ROOT / 'docs/validation/data/2026-09-21-standalone-normalize'
ENGINES = ['node-cli', 'node-focused', 'go', 'rust']
EXPECTED_SOURCES = {
    'go/cli.go', 'go/core.go', 'go/go.mod', 'go/go.sum',
    'rust/Cargo.lock', 'rust/Cargo.toml', 'rust/src/cli.rs', 'rust/src/main.rs',
    'cases.mjs', 'focused-entry.mjs',
}


def load(path):
    return json.loads(path.read_text())


def fingerprint(path):
    content = path.read_bytes()
    return {'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()}


def public_correctness(rows):
    return [dict(row, engines={
        engine: {key: value for key, value in receipt.items() if key != 'stderr'}
        for engine, receipt in row['engines'].items()
    }) for row in rows]


def verify_correctness(rows):
    assert len(rows) == 169 and len({row['case'] for row in rows}) == 169
    assert sum(row['engines']['node-cli']['exit'] == 0 for row in rows) == 68
    mismatches = []
    for row in rows:
        assert list(row['engines']) == ENGINES
        for engine, receipt in row['engines'].items():
            assert receipt['preserved_on_failure']
            if engine == 'node-cli':
                continue
            assert receipt['output_difference'] is None
            assert receipt['summary_matches'] is not False
            if not receipt['acceptance_matches']:
                assert row['engines']['node-cli']['exit'] == 0
                assert receipt['exit'] != 0
                mismatches.append((row['case'], engine))
    assert mismatches == [
        ('cases/lone-surrogate.json', 'go'),
        ('cases/lone-surrogate.json', 'rust'),
    ], mismatches


def check():
    artifacts = load(DATA / 'artifacts.json')
    sources = {name for name in artifacts
               if name.startswith(('go/', 'rust/')) or name in ['cases.mjs', 'focused-entry.mjs']}
    assert sources == EXPECTED_SOURCES, (
        f'Source inventory mismatch: missing={sorted(EXPECTED_SOURCES - sources)}, '
        f'unexpected={sorted(sources - EXPECTED_SOURCES)}'
    )
    for name in sorted(EXPECTED_SOURCES):
        assert fingerprint(SOURCE / name) == artifacts[name], name
    provenance = load(DATA / 'archive-provenance.json')
    for name in ['benchmark.json', 'summary.json', 'environment.json', 'artifacts.json']:
        assert fingerprint(DATA / name) == provenance['original_files']['results/' + name], name
    rows = load(DATA / 'benchmark.json')
    rng = random.Random(20260921)
    expected_order = []
    for size in [1000, 10000, 50000]:
        for round_number in range(6):
            order = ENGINES.copy()
            rng.shuffle(order)
            expected_order.extend((size, engine, round_number, round_number == 0) for engine in order)
    assert [(row['size'], row['engine'], row['round'], row['warmup']) for row in rows] == expected_order
    for row in rows:
        assert row['semantic_match'] is True
        assert row['summary'] == {
            'normalized': True, 'issues': row['size'],
            'relations': 3 * row['size'] - 2, 'needsClassification': row['size'],
        }
    summaries = load(DATA / 'summary.json')
    assert len(summaries) == 12
    for summary in summaries:
        trials = [row for row in rows if row['size'] == summary['size']
                  and row['engine'] == summary['engine'] and not row['warmup']]
        assert len(trials) == summary['n'] == 5
        for metric in ['wall_ms', 'cpu_ms', 'peak_rss_mib']:
            values = [row[metric] for row in trials]
            assert summary[metric] == {
                'median': statistics.median(values), 'min': min(values), 'max': max(values),
            }
    verify_correctness(load(DATA / 'correctness.json'))
    safety = load(DATA / 'safety.json')
    assert len(safety) == 22
    assert all(row['input_preserved'] and (row['exit'] == 0) == row['expected_success'] for row in safety)
    print('Archive checks passed: source/lock hashes, 72 samples, 12 summaries, 169 cases, 22 storage receipts.')


if __name__ == '__main__':
    check()
