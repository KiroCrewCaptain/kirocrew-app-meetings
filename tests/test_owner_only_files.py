"""A meeting's files are owner-only.

Ported from Kiro Crew's ``test/test_owner_only_files.py``
(``test_a_meeting_transcript_is_owner_only_in_the_home_and_plain_outside``). The
host applies the owner-only rule to files inside the data home and the umask
default outside it; an installed app's data directory is always inside the data
home (``ctx.data_dir``), so here every directory and file the store creates is
owner-only wherever the test points it.
"""

from __future__ import annotations

import os
import stat
from pathlib import Path

import pytest

from backend import store

pytestmark = pytest.mark.skipif(os.name != "posix", reason="POSIX permission bits")


def _mode(path: Path) -> int:
    return stat.S_IMODE(path.stat().st_mode)


def _readable_by_others(root: Path) -> list[Path]:
    return [p for p in [root, *root.rglob("*")] if _mode(p) & 0o077]


def test_a_meeting_transcript_is_owner_only(tmp_path: Path) -> None:
    data = tmp_path / "apps" / "meetings" / "data"
    store.append_transcript("m1", "a line", "speech", data)

    assert _mode(store.transcript_path("m1", data)) == 0o600
    assert _readable_by_others(data) == []


def test_the_data_subtree_and_its_seeded_dictionary_are_owner_only(tmp_path: Path) -> None:
    data = tmp_path / "data"
    store.ensure_data_dirs(data)
    assert _readable_by_others(data) == []
