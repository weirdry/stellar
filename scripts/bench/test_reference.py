"""Regression checks for the optional benchmark; no performance thresholds."""

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--node', required=True)
args = parser.parse_args()
script = Path(__file__).with_name('benchmark.py')
protocol = {
    'sizes': [100],
    'trials': 1,
    'fixture': hashlib.sha256(script.with_name('fixtures.mjs').read_bytes()).hexdigest(),
}


class ReferenceTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix='stellar-benchmark-test-')
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)

    def run_benchmark(self, output, reference=None, node=None):
        command = [
            sys.executable, str(script), '--node', node or args.node,
            '--output', str(output), '--sizes', '100', '--trials', '1',
        ]
        if reference is not None:
            command += ['--reference', str(reference)]
        return subprocess.run(command, capture_output=True, text=True, timeout=60)

    def test_invalid_references_fail_before_output_or_node_execution(self):
        valid = {'protocol': protocol, 'artifacts': {'100/draft.json': 'a' * 64}}
        cases = {
            'empty-object': {}, 'empty-array': [], 'null': None,
            'false': False, 'zero': 0, 'empty-string': '', 'scalar': 'invalid',
            'missing-protocol': {'artifacts': valid['artifacts']},
            'missing-artifacts': {'protocol': protocol},
            'null-protocol': {**valid, 'protocol': None},
            'list-protocol': {**valid, 'protocol': []},
            'mismatched-protocol': {**valid, 'protocol': {**protocol, 'trials': 2}},
            'empty-artifacts': {**valid, 'artifacts': {}},
            'null-artifacts': {**valid, 'artifacts': None},
            'list-artifacts': {**valid, 'artifacts': []},
            'empty-name': {**valid, 'artifacts': {'': 'a' * 64}},
            'short-hash': {**valid, 'artifacts': {'100/draft.json': 'abc'}},
            'non-hex-hash': {**valid, 'artifacts': {'100/draft.json': 'z' * 64}},
            'non-string-hash': {**valid, 'artifacts': {'100/draft.json': 123}},
        }
        for name, value in cases.items():
            with self.subTest(name=name):
                reference = self.root / f'{name}.json'
                reference.write_text(json.dumps(value), encoding='utf-8')
                self.assert_rejected(reference, self.root / name)
        for name, raw in [('malformed', b'{'), ('encoding', b'\xff')]:
            with self.subTest(name=name):
                reference = self.root / f'{name}.json'
                reference.write_bytes(raw)
                self.assert_rejected(reference, self.root / name)
        self.assert_rejected(self.root / 'absent.json', self.root / 'missing')
        self.assert_rejected(self.root, self.root / 'directory')

    def assert_rejected(self, reference, output):
        # An invalid reference must be rejected before even a Node probe.
        result = self.run_benchmark(output, reference, node=str(self.root / 'absent-node'))
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertEqual(result.stdout, '')
        self.assertIn('error: Reference', result.stderr)
        self.assertNotIn('Traceback', result.stderr)
        self.assertFalse(output.exists())

    def test_baseline_comparison_and_mismatch_detection(self):
        baseline = self.root / 'baseline'
        result = self.run_benchmark(baseline)
        self.assertEqual(result.returncode, 0, result.stderr)
        original = (baseline / 'results.json').read_bytes()
        before = json.loads(original)
        self.assertFalse(before['reference_matched'])
        candidate = self.root / 'candidate'
        result = self.run_benchmark(candidate, baseline / 'results.json')
        self.assertEqual(result.returncode, 0, result.stderr)
        after = json.loads((candidate / 'results.json').read_text())
        self.assertTrue(after['reference_matched'])
        self.assertEqual(before['artifacts'], after['artifacts'])
        self.assertEqual(len(after['rows']), 4)
        self.assertEqual(len(after['receipts']), 2)

        # Valid structure does not bypass the subsequent hash/inventory checks.
        for name in ['changed-hash', 'extra-artifact']:
            with self.subTest(name=name):
                damaged = json.loads(original)
                key = '100/initial-capture.json' if name == 'changed-hash' else 'extra.json'
                damaged['artifacts'][key] = '0' * 64
                reference = self.root / f'{name}.json'
                reference.write_text(json.dumps(damaged), encoding='utf-8')
                output = self.root / name
                result = self.run_benchmark(output, reference)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('Reference artifact', result.stderr)
                self.assertFalse((output / 'results.json').exists())
        self.assertEqual((baseline / 'results.json').read_bytes(), original)


if __name__ == '__main__':
    unittest.main(argv=['test_reference'], verbosity=2)
