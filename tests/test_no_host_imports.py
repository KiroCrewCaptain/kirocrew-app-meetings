"""Only ``backend/_host.py`` reaches Kiro Crew, and only lazily.

The gateway's public surface for an app is the ``AppContext`` its hooks get, the
structural route records the registry accepts, and the public backend SDK
(``kiro_crew.apps.backend_sdk``: the SSRF vet, the file gate, the no-follow read,
the pinned walk and copy, the raster sniffer). The recording import also needs two
gateway functions with no public name yet (the voice-runtime root and
speech-to-text; see PORTING.md). All of them are looked up in the running gateway
in ``_host.py`` alone, by name at call time, so a missing one refuses the
operation instead of breaking the module load. No other backend module may import
``kiro_crew`` in any form, and ``_host.py`` has no top-level ``kiro_crew``
import.
"""

from __future__ import annotations

import ast
import re
import unittest
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"


def _host_imports(path: Path) -> list[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    found: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            found += [a.name for a in node.names if a.name.split(".")[0] == "kiro_crew"]
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            if node.module.split(".")[0] == "kiro_crew":
                found.append(node.module)
        elif isinstance(node, ast.Call):
            # importlib.import_module("kiro_crew...") / __import__("kiro_crew...")
            name = getattr(node.func, "attr", None) or getattr(node.func, "id", None)
            if name in {"import_module", "__import__"} and node.args:
                arg = node.args[0]
                if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                    if arg.value.split(".")[0] == "kiro_crew":
                        found.append(arg.value)
    return found


def _host_strings(path: Path) -> list[str]:
    """String literals naming a ``kiro_crew`` module (what ``_host_attr`` is handed)."""
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    return [
        node.value
        for node in ast.walk(tree)
        if isinstance(node, ast.Constant)
        and isinstance(node.value, str)
        and re.fullmatch(r"kiro_crew(\.[a-z_]+)*", node.value)
    ]


class TestNoHostImports(unittest.TestCase):
    def test_no_backend_module_but_the_host_shim_reaches_kiro_crew(self) -> None:
        files = sorted(BACKEND.rglob("*.py"))
        self.assertTrue(files, "no backend modules found")
        for path in files:
            if path.name == "_host.py":
                continue
            with self.subTest(module=path.relative_to(BACKEND.parent).as_posix()):
                self.assertEqual(_host_imports(path), [])
                self.assertEqual(_host_strings(path), [])

    def test_the_host_shim_imports_kiro_crew_only_at_call_time(self) -> None:
        tree = ast.parse((BACKEND / "_host.py").read_text(encoding="utf-8"))
        for node in tree.body:
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                names = (
                    [a.name for a in node.names]
                    if isinstance(node, ast.Import)
                    else [node.module or ""]
                )
                self.assertFalse(any(n.split(".")[0] == "kiro_crew" for n in names), names)
        self.assertEqual(_host_imports(BACKEND / "_host.py"), [])

    def test_the_host_shim_names_only_the_backend_sdk_and_two_private_modules(self) -> None:
        """Every other control is the public backend SDK's; these two have no public name."""
        self.assertEqual(
            set(_host_strings(BACKEND / "_host.py")),
            {"kiro_crew.apps.backend_sdk", "kiro_crew.sandbox", "kiro_crew.transcribe"},
        )

    def test_the_scan_sees_each_import_form(self) -> None:
        """The detector itself: every spelling it must catch is caught."""
        import tempfile

        source = (
            "import kiro_crew\n"
            "import kiro_crew.apps as a\n"
            "from kiro_crew.executors import run_in_embed_pool\n"
            "import importlib\n"
            "importlib.import_module('kiro_crew.embeddings')\n"
            "__import__('kiro_crew')\n"
            "from . import kiro_crew_like\n"
            "import kiro_crewish\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "probe.py"
            path.write_text(source, encoding="utf-8")
            self.assertEqual(
                _host_imports(path),
                [
                    "kiro_crew",
                    "kiro_crew.apps",
                    "kiro_crew.executors",
                    "kiro_crew.embeddings",
                    "kiro_crew",
                ],
            )


if __name__ == "__main__":
    unittest.main()
