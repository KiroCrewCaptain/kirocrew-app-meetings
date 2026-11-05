"""``app.json`` read by Kiro Crew's own manifest parser.

Kiro Crew's own registry tests read the built-in's manifest through its loader
(``AppManifest.from_json_file`` + ``validate``, and the record's
``defaultEnabled``). ``conftest.py`` blocks ``kiro_crew`` for every other test
here, so these run the parser in a child interpreter against the Kiro Crew
checkout that ``KIROCREW_SRC`` names (its root, the directory holding ``src/``).
CI's ``host-parser`` job sets it to a pinned commit; an offline run without it
skips this file. The parser needs PyYAML and croniter
(``tests/requirements-host.txt``).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

APP_ROOT = Path(__file__).resolve().parents[1]
HOST_ENV = "KIROCREW_SRC"

# Runs in the child: the checkout's src/ first on the path, nothing else of ours.
_PROBE = r"""
import json, sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
from kiro_crew.apps.manifest import AppManifest

root = Path(sys.argv[2])
manifest = AppManifest.from_json_file(root / "app.json")
print(json.dumps({
    "errors": manifest.validate(app_root=root),
    "name": manifest.name,
    "version": manifest.version,
    "minKiroCrewVersion": manifest.minKiroCrewVersion,
    "agents": manifest.agents,
    "skills": manifest.skills,
    "defaultEnabled": manifest.extra.get("defaultEnabled", "<absent>"),
}))
"""


@pytest.fixture(scope="module")
def parsed(tmp_path_factory: pytest.TempPathFactory) -> dict:
    checkout = os.environ.get(HOST_ENV, "").strip()
    if not checkout:
        pytest.skip(f"{HOST_ENV} is not set: no Kiro Crew checkout to parse app.json with")
    src = Path(checkout).resolve() / "src"
    if not (src / "kiro_crew" / "apps" / "manifest.py").is_file():
        pytest.fail(f"{HOST_ENV}={checkout} is not a Kiro Crew checkout (no src/kiro_crew/apps/manifest.py)")
    proc = subprocess.run(
        [sys.executable, "-I", "-c", _PROBE, str(src), str(APP_ROOT)],
        cwd=str(tmp_path_factory.mktemp("host-parser")),
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=120,
        check=False,
    )
    assert proc.returncode == 0, f"the host parser failed to run:\n{proc.stderr[-3000:]}"
    return json.loads(proc.stdout.strip().splitlines()[-1])


def test_manifest_validates_with_no_errors(parsed: dict) -> None:
    assert parsed["errors"] == [], f"AppManifest.validate returned errors: {parsed['errors']}"


def test_the_host_reads_the_identity_adoption_maps(parsed: dict) -> None:
    raw = json.loads((APP_ROOT / "app.json").read_text(encoding="utf-8"))
    assert parsed["name"] == raw["name"] == "meetings"
    assert parsed["version"] == raw["version"]
    assert parsed["minKiroCrewVersion"] == raw["minKiroCrewVersion"]
    assert parsed["skills"] == raw["skills"]


def test_default_enabled_reaches_the_host_as_false(parsed: dict) -> None:
    # The value the host keeps in ``extra`` must be the boolean False, or the app
    # turns on in every new user's sidebar.
    assert parsed["defaultEnabled"] is False


def test_the_host_sees_the_three_agents(parsed: dict) -> None:
    raw = json.loads((APP_ROOT / "app.json").read_text(encoding="utf-8"))
    assert parsed["agents"] == raw["agents"]
    assert len(parsed["agents"]) == 3
