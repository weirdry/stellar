"""Fault-injection tests for archive guards; no native compiler is required."""

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
SOURCE = Path('scripts/bench/standalone')
DATA = Path('docs/validation/data/2026-09-21-standalone-normalize')


class ArchiveChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='stellar-archive-checks-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        shutil.copytree(ROOT / SOURCE, self.root / SOURCE, ignore=shutil.ignore_patterns('__pycache__'))
        shutil.copytree(ROOT / DATA, self.root / DATA)
        self.env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
        self.env.pop('PYTHONOPTIMIZE', None)

    def run_script(self, script, *args, flags=(), env=None):
        return subprocess.run(
            [sys.executable, '-B', *flags, str(self.root / SOURCE / script), *map(str, args)],
            cwd=self.root, env=env or self.env, capture_output=True, text=True, timeout=30,
        )

    def test_original_archive_passes(self):
        result = self.run_script('check_archive.py')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('Archive checks passed', result.stdout)

    def test_source_drift_fails(self):
        path = self.root / SOURCE / 'go/core.go'
        path.write_bytes(path.read_bytes() + b'\n// drift\n')
        result = self.run_script('check_archive.py')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('go/core.go', result.stderr)

    def test_inconsistent_correctness_fails(self):
        path = self.root / DATA / 'correctness.json'
        rows = json.loads(path.read_text())
        rows[0]['engines']['node-cli']['preserved_on_failure'] = False
        path.write_text(json.dumps(rows))
        result = self.run_script('check_archive.py')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('Archive checks passed', result.stdout)

    def test_optimized_entrypoints_fail_before_writes(self):
        for script in ['check_archive.py', 'replay.py', 'safety.py']:
            for mode in ['1', '2', '-O']:
                with self.subTest(script=script, mode=mode):
                    output = self.root / 'replay-output'
                    args = ['--node', sys.executable, '--output', output] if script == 'replay.py' else []
                    env = self.env.copy()
                    if mode != '-O':
                        env['PYTHONOPTIMIZE'] = mode
                    before = set(self.root.rglob('*'))
                    result = self.run_script(script, *args, flags=['-O'] if mode == '-O' else [], env=env)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn('requires assertions', result.stderr)
                    self.assertEqual(result.stdout, '')
                    self.assertEqual(set(self.root.rglob('*')), before)
                    self.assertFalse(output.exists())

    def test_source_inventory_cannot_be_replaced_by_repinning(self):
        path = self.root / DATA / 'artifacts.json'
        original = json.loads(path.read_text())
        sources = [name for name in original if name.startswith(('go/', 'rust/'))
                   or name in ['cases.mjs', 'focused-entry.mjs']]
        self.assertEqual(len(sources), 10)
        for name in [*sources, 'rust/unexpected.rs']:
            with self.subTest(name=name):
                artifacts = original.copy()
                if name in artifacts:
                    del artifacts[name]
                else:
                    artifacts[name] = {'bytes': 0, 'sha256': hashlib.sha256(b'').hexdigest()}
                content = json.dumps(artifacts).encode()
                path.write_bytes(content)
                # Reach the inventory guard even if the manifest hash is deliberately repinned.
                provenance_path = self.root / DATA / 'archive-provenance.json'
                provenance = json.loads(provenance_path.read_text())
                provenance['original_files']['results/artifacts.json'] = {
                    'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest(),
                }
                provenance_path.write_text(json.dumps(provenance))
                result = self.run_script('check_archive.py')
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('Source inventory mismatch', result.stderr)
                self.assertIn(name, result.stderr)


class StorageChecks(unittest.TestCase):
    def run_safety(self, leak_name='', leak_stage='new'):
        with tempfile.TemporaryDirectory(prefix='stellar-storage-checks-') as temp:
            root = Path(temp)
            shutil.copy2(ROOT / SOURCE / 'safety.py', root / 'safety.py')
            (root / 'cases').mkdir()
            (root / 'cases/mixed.json').write_text('{}')
            (root / 'results').mkdir()
            (root / 'differential.py').write_text('''from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parent
def command(engine, src, dst):
    return [sys.executable, str(ROOT / 'fake_engine.py'), str(src), str(dst)]
''')
            (root / 'fake_engine.py').write_text('''from pathlib import Path
import json, os, sys
src, dst = map(Path, sys.argv[1:])
failure = dst.is_dir() or (dst.exists() and dst.samefile(src))
stage = 'failure' if failure else 'replace' if dst.exists() else 'no-node' if dst.name == 'no-node.json' else 'new'
if not failure:
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps({'schemaVersion': 1}))
    dst.chmod(0o600)
if os.environ.get('LEAK_NAME') and stage == os.environ['LEAK_STAGE']:
    (src.parent / os.environ['LEAK_NAME']).write_text('leftover')
sys.exit(1 if failure else 0)
''')
            env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1', PROBE_ENGINES='rust',
                       LEAK_NAME=leak_name, LEAK_STAGE=leak_stage)
            env.pop('PYTHONOPTIMIZE', None)
            result = subprocess.run([sys.executable, '-B', str(root / 'safety.py')],
                                    env=env, capture_output=True, text=True, timeout=30)
            receipt = root / 'results/safety.json'
            return result, json.loads(receipt.read_text()) if receipt.exists() else None

    def test_clean_storage_protocol_passes(self):
        result, receipt = self.run_safety()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(receipt), 6)
        self.assertTrue(all(row['input_preserved'] for row in receipt))

    def test_success_rejects_leftovers_regardless_of_prefix(self):
        for name in ['.tmpAbc123', '.stellar-leak.tmp', 'unexpected-file']:
            for stage in ['new', 'replace', 'no-node']:
                with self.subTest(name=name, stage=stage):
                    result, receipt = self.run_safety(name, stage)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn('unexpected_paths', result.stderr)
                    self.assertIn(name, result.stderr)
                    self.assertIsNone(receipt)

    def test_failure_still_requires_unchanged_inventory(self):
        result, receipt = self.run_safety('.tmpAbc123', 'failure')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('unexpected_paths', result.stderr)
        self.assertIn('.tmpAbc123', result.stderr)
        self.assertIsNone(receipt)


if __name__ == '__main__':
    unittest.main()
