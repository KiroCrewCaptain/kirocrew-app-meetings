"""Kiro Crew properties this app relies on, checked against a real Kiro Crew.

The built-in pinned both in its own tests; neither can be checked against the
fake host, so they run only in a real-host run (``MEETINGS_REAL_HOST=1`` with a
Kiro Crew checkout's ``src/`` on ``PYTHONPATH``, see ``conftest.py``).

* Every audio suffix the recording import admits has a forced FFmpeg demuxer.
  The core's protocol pin stops NETWORK fetches, but an auto-probed playlist
  demuxer could still open other LOCAL files its text names, reads that never
  went through the file gate. Forcing the validated suffix's own demuxer turns
  playlist text into a decode error.
* The core's startup sweep keeps this app's data directory owner-only
  (PORTING.md, gap 2).
"""

from __future__ import annotations

import pytest
from conftest import REAL_HOST

from backend import constants as k

pytestmark = pytest.mark.skipif(not REAL_HOST, reason="needs a real Kiro Crew (MEETINGS_REAL_HOST=1)")


@pytest.mark.parametrize("suffix", sorted(k.IMPORT_AUDIO_EXTENSIONS))
def test_every_import_suffix_has_a_forced_demuxer(suffix: str) -> None:
    from kiro_crew import transcribe

    forced = transcribe._forced_demuxer_args(f"/tmp/talk{suffix}")
    assert forced and forced[0] == "-f", f"no forced demuxer for {suffix}"


def test_the_startup_sweep_lists_the_store_the_app_writes() -> None:
    from kiro_crew import owner_only_files

    assert f"apps/{k.APP_NAME}/data" in owner_only_files.STARTUP_SWEEP_STORES
