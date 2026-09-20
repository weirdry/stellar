"""Deterministic checks of profiler attribution; no timing assertions."""

import importlib.util
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location('stellar_profile', Path(__file__).with_name('profile.py'))
profile = importlib.util.module_from_spec(spec)
spec.loader.exec_module(profile)
stage = Path('/synthetic/staged-skill')
script = Path('/synthetic/heap-sample.mjs')


def frame(name):
    return {'functionName': name, 'url': (stage / 'bin/stellar.mjs').as_uri(),
            'lineNumber': 9, 'columnNumber': 0}


class AttributionTests(unittest.TestCase):
    def test_compact_summary_accounts_for_every_self_sample(self):
        frames = [{'function': str(n), 'us': n} for n in range(40, 0, -1)]
        summary = {'sampled_us': sum(f['us'] for f in frames), 'self': frames,
                   'inclusive': frames + [{'function': 'normalizeCapture', 'us': 1}]}
        result = profile.compact(summary, 'cpu')
        self.assertEqual(len(result['self']), 20)
        self.assertEqual(sum(f['us'] for f in result['self']) + result['unlisted_self_us'], summary['sampled_us'])
        self.assertIn({'function': 'normalizeCapture', 'us': 1}, result['inclusive'])

    def test_cpu_weights_deltas_and_counts_recursive_frames_once(self):
        raw = {'startTime': 0, 'endTime': 500,
               'nodes': [{'id': 1, 'callFrame': frame('root'), 'children': [2, 4]},
                         {'id': 2, 'callFrame': frame('validate'), 'children': [3]},
                         {'id': 3, 'callFrame': frame('validate')},
                         {'id': 4, 'callFrame': frame('parse')}],
               'samples': [3, 4], 'timeDeltas': [100, 300]}
        result = profile.cpu_summary(raw, stage, script)
        self.assertEqual(result['sampled_us'], 400)
        self.assertEqual(result['profile_duration_us'], 500)
        self.assertEqual({f['function']: f['us'] for f in result['self']}, {'validate': 100, 'parse': 300})
        self.assertEqual({f['function']: f['us'] for f in result['inclusive']}, {'root': 400, 'validate': 100, 'parse': 300})
        self.assertEqual(result['self'][0]['url'], 'bin/stellar.mjs')
        self.assertEqual(result['self'][0]['line'], 10)
        for deltas in [[100], [100, -1]]:
            with self.subTest(deltas=deltas), self.assertRaises(ValueError):
                profile.cpu_summary({**raw, 'timeDeltas': deltas}, stage, script)

    def test_heap_preserves_allocated_totals_without_recursive_double_counting(self):
        raw = {'parameters': {'includeObjectsCollectedByMajorGC': True}, 'profile': {
            'head': {'callFrame': frame('root'), 'selfSize': 0, 'children': [
                {'callFrame': frame('clone'), 'selfSize': 10, 'children': [
                    {'callFrame': frame('clone'), 'selfSize': 30}]},
                {'callFrame': frame('parse'), 'selfSize': 20}]}}}
        result = profile.heap_summary(raw, stage, script)
        self.assertEqual(result['estimated_allocated_bytes'], 60)
        self.assertEqual({f['function']: f['bytes'] for f in result['inclusive']}, {'root': 60, 'clone': 40, 'parse': 20})
        self.assertEqual(result['parameters'], raw['parameters'])
        external = {**frame('test'), 'url': 'file:///private/machine/location/probe.mjs'}
        self.assertEqual(profile.frame_key(external, stage, script)[1], 'external-file/probe.mjs')


if __name__ == '__main__':
    unittest.main(verbosity=2)
