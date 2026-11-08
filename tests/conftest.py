"""Test session setup: the app root on ``sys.path``, no Kiro Crew, a fake gateway.

The gateway loads hook files into a synthetic package named after the app, so
the backend never needs to be on ``sys.path`` there. A plain pytest run has no
such loader, so the app root (and this directory, for the shared helpers) is put
on the path for the test session only.

``kiro_crew`` is blocked before the backend is imported, so no test can pass
because a Kiro Crew happens to be installed on the machine running it. Every
test runs against :class:`fakehost.FakeHost` (the gateway functions
``backend/_host.py`` resolves) and a bound :class:`fakehost.FakeCtx` whose
``data_dir`` is a fresh temporary directory, so no test reads or writes a real
data home.
"""

from __future__ import annotations

import os
import socket
import sys
from pathlib import Path
from typing import Iterator

import pytest

TESTS = Path(__file__).resolve().parent
APP_ROOT = TESTS.parent
for entry in (str(APP_ROOT), str(TESTS)):
    if entry not in sys.path:
        sys.path.insert(0, entry)

#: Set to 1 to run the suite against the real security controls of the Kiro Crew
#: on ``sys.path`` (``PYTHONPATH=<checkout>/src``), the way PORTING.md records a
#: check of the fakes. Never set in CI: the default run must need no Kiro Crew.
REAL_HOST = os.environ.get("MEETINGS_REAL_HOST") == "1"

if not REAL_HOST:
    # A None entry makes every `import kiro_crew...` raise ImportError.
    sys.modules["kiro_crew"] = None  # type: ignore[assignment]

from backend import _host  # noqa: E402
from fakehost import FakeCtx, FakeHost, FakeUntrusted  # noqa: E402

#: The real lookups, captured before any test replaces them with the fake host's.
_REAL_HOST_ATTR = _host._host_attr
_REAL_HOST_MODULE = _host._host_module


@pytest.fixture
def real_host_lookups():
    """``_host._host_attr`` / ``_host._host_module`` as shipped, for the lookup tests."""
    return _REAL_HOST_ATTR, _REAL_HOST_MODULE


@pytest.fixture(autouse=True)
def fake_host(
    monkeypatch: pytest.MonkeyPatch, tmp_path_factory: pytest.TempPathFactory
) -> FakeHost:
    """The fake gateway every ``_host`` lookup answers from."""
    host = FakeHost(voice_root=tmp_path_factory.mktemp("voice-runtime"))
    if REAL_HOST:
        host.use_real_controls()
    monkeypatch.setattr(_host, "_host_attr", host.attr)
    monkeypatch.setattr(_host, "_host_module", host.module)
    return host


@pytest.fixture(autouse=True)
def app_ctx(tmp_path_factory: pytest.TempPathFactory) -> Iterator[FakeCtx]:
    """A bound app context whose data dir is a fresh temporary directory."""
    ctx = FakeCtx(data_dir=tmp_path_factory.mktemp("meetings-data"))
    if REAL_HOST:
        from kiro_crew.apps.scrub_sdk import ScrubSDK
        from kiro_crew.apps.untrusted_text_sdk import UntrustedTextSDK

        ctx.scrub = ScrubSDK()  # type: ignore[assignment]
        # The real screen, neutralizer and markers; the drop recorder stays fake,
        # because the real one writes the gateway's security event log.
        real = UntrustedTextSDK(ctx.name)
        ctx.untrusted = FakeUntrusted(
            flagged=real.flagged, neutralize=real.neutralize, markers=real.fence_markers("calendar")
        )
    previous = _host.bound()
    _host.bind(ctx)
    yield ctx
    _host.bind(previous)


def _has_ipv6_loopback() -> bool:
    if not socket.has_ipv6:
        return False
    try:
        with socket.socket(socket.AF_INET6, socket.SOCK_STREAM) as probe:
            probe.bind(("::1", 0))
    except OSError:
        return False
    return True


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    """Skip an ``ipv6_required`` test on a host with no IPv6 loopback."""
    if _has_ipv6_loopback():
        return
    skip = pytest.mark.skip(reason="this host has no IPv6 loopback")
    for item in items:
        if "ipv6_required" in item.keywords:
            item.add_marker(skip)
