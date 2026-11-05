"""Every gateway reach in ``backend/_host.py``, and what happens without it.

The context seams (owner gate, audit, redaction, data directory) and the gateway
functions with no seam yet each have a fallback that is never more permissive
than the gateway: no agent turn runs, a calendar field is withheld, no URL is
fetched, no file is read or copied, nothing is transcribed, no picture is stored.
``register_routes`` names each missing capability in ``ctx.health``.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
from types import SimpleNamespace

import pytest
from conftest import REAL_HOST
from fakehost import FakeCtx, FakeHost, OperationKind, ToolApprovalPolicy

from backend import _host, hooks
from backend.domain import images
from backend.domain import session as sess
from backend.providers import calendar as cal
from backend.routes import audio_import as ai

# ── the lookup itself ───────────────────────────────────────────────────────


def test_the_lookup_answers_none_for_a_missing_module_or_name(real_host_lookups):
    host_attr, host_module = real_host_lookups
    assert host_attr("kiro_crew.no_such_module", "anything") is None
    assert host_attr("json", "no_such_name") is None
    assert host_attr("json", "dumps") is not None
    assert host_module("kiro_crew.no_such_module") is None


fake_only = pytest.mark.skipif(REAL_HOST, reason="checks the fakes, not Kiro Crew's controls")


@fake_only
def test_kiro_crew_is_not_importable_in_this_suite(real_host_lookups):
    """The suite cannot pass because a Kiro Crew happens to be installed."""
    host_attr, _ = real_host_lookups
    assert host_attr("kiro_crew.security", "redact") is None


# ── the bound context ───────────────────────────────────────────────────────


def test_no_bound_context_means_no_data_directory(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(_host, "_ctx", None)
    with pytest.raises(RuntimeError):
        _host.data_dir()


def test_the_data_directory_is_the_contexts(app_ctx: FakeCtx):
    assert _host.data_dir() == Path(app_ctx.data_dir)


# ── redaction ───────────────────────────────────────────────────────────────


@fake_only
def test_redaction_goes_through_the_context_scrubber(app_ctx: FakeCtx):
    assert _host.redact("key AKIAIOSFODNN7EXAMPLE") == "key [REDACTED: credential]"
    assert app_ctx.scrub.calls == 1


@fake_only
def test_a_scrubber_that_raises_withholds_the_text(app_ctx: FakeCtx):
    app_ctx.scrub.raises = RuntimeError("companion did not compose")
    assert _host.redact("plain words") == _host.WITHHELD


def test_no_scrubber_withholds_the_text(monkeypatch: pytest.MonkeyPatch, app_ctx: FakeCtx):
    monkeypatch.setattr(_host, "_ctx", SimpleNamespace(data_dir=app_ctx.data_dir))
    assert _host.redact("plain words") == _host.WITHHELD


# ── audit ───────────────────────────────────────────────────────────────────


def test_an_audit_row_keeps_the_builtins_operation_name(app_ctx: FakeCtx):
    _host.audit("meetings.delete", "standup AKIAIOSFODNN7EXAMPLE", outcome="ok")
    [row] = app_ctx.audit.rows
    assert row["operation"] == "meetings.delete"
    assert row["outcome"] == "ok"
    assert "AKIA" not in row["resources"]


def test_an_audit_sink_that_raises_does_not_break_the_caller(app_ctx: FakeCtx):
    def boom(*_a, **_kw):
        raise RuntimeError("sink full")

    app_ctx.audit.record = boom  # type: ignore[method-assign]
    _host.audit("meetings.delete", "standup", outcome="ok")


def test_an_injection_drop_uses_the_gateways_recorder(fake_host: FakeHost, app_ctx: FakeCtx):
    _host.audit_injection_dropped(surface="meetings_calendar_title", session_key="meeting:e1")
    assert fake_host.injection_drops == [
        {"surface": "meetings_calendar_title", "session_key": "meeting:e1", "agent": "meetings", "sample": ""}
    ]
    fake_host.remove("kiro_crew.security", "audit_injection_dropped")
    _host.audit_injection_dropped(surface="meetings_calendar_title", session_key="meeting:e1")
    assert app_ctx.audit.ops() == [
        ("meetings.injection_dropped", "meetings_calendar_title meeting:e1", "dropped")
    ]


# ── agent turns ─────────────────────────────────────────────────────────────


class _Provider:
    def __init__(self, chunks=("ok",)):
        self.chunks = chunks
        self.seen: list[str] = []

    async def stream(self, text):
        self.seen.append(text)
        for chunk in self.chunks:
            yield chunk


def test_a_turn_reaches_the_gateway_with_its_own_policy(fake_host: FakeHost):
    provider = _Provider()
    out = asyncio.run(
        _host.stream_and_collect(
            provider, "hi", approval_policy=ToolApprovalPolicy.REJECT_ALL.name, app="meetings"
        )
    )
    assert out == "ok"
    [call] = fake_host.turns.collected
    assert call["approval_policy"] is ToolApprovalPolicy.REJECT_ALL
    assert call["app"] == "meetings"


def test_no_gateway_turn_means_no_turn(fake_host: FakeHost):
    fake_host.remove("kiro_crew.llm_helpers", "stream_and_collect")
    provider = _Provider()
    with pytest.raises(_host.HostUnavailable):
        asyncio.run(_host.stream_and_collect(provider, "hi", approval_policy="HOOK_BASED"))
    assert provider.seen == []


def test_a_policy_the_gateway_does_not_have_runs_no_turn(fake_host: FakeHost):
    provider = _Provider()
    with pytest.raises(_host.HostUnavailable):
        asyncio.run(_host.stream_and_collect(provider, "hi", approval_policy="NO_SUCH_POLICY"))
    assert provider.seen == []


def test_admission_maps_the_operation_onto_the_gateways_kind(fake_host: FakeHost):
    async def turn():
        return "done"

    out = asyncio.run(
        _host.run_admitted_or_raise(turn(), operation="BACKGROUND", session_key="k", automation=True)
    )
    assert out == "done"
    assert fake_host.turns.admitted == [
        {"operation": OperationKind.BACKGROUND, "session_key": "k", "automation": True}
    ]


def test_no_admission_gate_closes_the_turn_unrun(fake_host: FakeHost):
    fake_host.remove("kiro_crew.shared_crew.turn_gate", "run_admitted_or_raise")
    ran: list[bool] = []

    async def turn():
        ran.append(True)

    coro = turn()
    with pytest.raises(_host.HostUnavailable):
        asyncio.run(_host.run_admitted_or_raise(coro, operation="BACKGROUND"))
    assert ran == []
    assert coro.cr_frame is None  # closed, so no "never awaited" warning either


def test_a_meeting_agent_dispatch_fails_without_a_gateway_turn(fake_host: FakeHost):
    """The circuit breaker sees the failure; nothing runs outside the tool gate."""
    fake_host.remove("kiro_crew.llm_helpers", "stream_and_collect")

    class _Sessions:
        async def get_or_create(self, key, agent=None, **_kw):
            return _Provider(), True, False

    with pytest.raises(_host.HostUnavailable):
        asyncio.run(sess.dispatch_to_agent(_Sessions(), "meetings-m1-note-taker", "a line"))


# ── untrusted text ──────────────────────────────────────────────────────────


def test_no_injection_screen_withholds_every_calendar_field(fake_host: FakeHost):
    fake_host.remove("kiro_crew.security", "contains_injection")
    context = sess.build_meeting_context({"event_id": "e1", "title": "Standup"})
    assert "Standup" not in context
    assert sess._WITHHELD_FIELD in context


def test_no_neutralizer_places_no_raw_field_in_the_fence(fake_host: FakeHost):
    fake_host.remove("kiro_crew.context", "neutralize_untrusted_text")
    context = sess.build_meeting_context({"event_id": "e1", "title": "Standup"})
    assert "Standup" not in context
    assert _host.WITHHELD in context


def test_the_fence_markers_are_the_gateways(fake_host: FakeHost):
    fake_host.table[("kiro_crew.context", "UNTRUSTED_CALENDAR_FENCE_OPEN")] = "<<<OPEN"
    fake_host.table[("kiro_crew.context", "UNTRUSTED_CALENDAR_FENCE_CLOSE")] = ">>>CLOSE"
    context = sess.build_meeting_context({"title": "Standup"})
    assert "<<<OPEN\n" in context and context.endswith(">>>CLOSE")


# ── calendar URL and file ───────────────────────────────────────────────────


def test_no_ssrf_vet_refuses_every_calendar_url(fake_host: FakeHost):
    fake_host.remove("kiro_crew.link_unfurl", "vet_unfurl_url")
    with pytest.raises(cal.CalendarError):
        cal._normalize_url("https://[2606:4700::1111]/cal.ics")


def test_no_file_gate_reads_no_calendar_file(fake_host: FakeHost, tmp_path: Path):
    path = tmp_path / "cal.ics"
    path.write_text("BEGIN:VCALENDAR\nEND:VCALENDAR\n")
    fake_host.remove("kiro_crew.hooks", "safe_read_file_bytes")
    with pytest.raises(cal.CalendarError):
        cal._read_local_ics(str(path))


# ── recordings ──────────────────────────────────────────────────────────────


def test_no_file_gate_denies_every_recording(fake_host: FakeHost, tmp_path: Path):
    path = tmp_path / "talk.wav"
    path.write_bytes(b"RIFF")
    fake_host.remove("kiro_crew.hooks", "validate_file_path")
    assert ai._vet_audio_file(str(path))[2] == "denied"


def test_no_pinned_walk_means_the_platform_cannot_import(fake_host: FakeHost):
    fake_host.remove("kiro_crew.pinned_fs", "supports_pinned_walk")
    assert _host.supports_pinned_walk() is False


def test_no_pinned_copy_copies_nothing(fake_host: FakeHost, tmp_path: Path):
    src = tmp_path / "talk.wav"
    src.write_bytes(b"audio")
    st = os.stat(src)
    snap = tmp_path / "snap"
    snap.mkdir()
    fake_host.remove("kiro_crew.pinned_fs", "copy_file_pinned")
    with pytest.raises(_host.PinnedPathRefusal):
        _host.copy_file_pinned(str(src), str(snap / "x.wav"), expected_src_ident=(st.st_dev, st.st_ino))
    assert list(snap.iterdir()) == []


def test_no_link_check_treats_the_path_as_a_link(fake_host: FakeHost, tmp_path: Path):
    fake_host.remove("kiro_crew.pinned_fs", "is_reparse_point")
    assert _host.is_reparse_point(str(tmp_path)) is True


def test_no_voice_runtime_root_stages_nothing(fake_host: FakeHost):
    fake_host.remove("kiro_crew.sandbox", "prime_voice_runtime_sandbox_paths")
    with pytest.raises(OSError):
        ai._new_snapshot_dir()


def test_no_speech_to_text_means_the_import_is_unavailable(fake_host: FakeHost):
    fake_host.modules.pop("kiro_crew.transcribe")
    assert _host.transcribe_module() is None
    assert ai._transcription_ready(object()) is False


def test_a_speech_module_missing_a_function_is_no_speech_module(fake_host: FakeHost):
    del fake_host.transcribe.transcribe_oversized_in_segments
    assert _host.transcribe_module() is None


# ── pasted pictures ─────────────────────────────────────────────────────────


def test_no_raster_sniffer_accepts_no_picture(fake_host: FakeHost):
    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
    assert images.sniff_image_ext(png) == ".png"
    fake_host.remove("kiro_crew.messaging.raster", "sniff_raster_mime")
    assert images.sniff_image_ext(png) is None


# ── the health report ───────────────────────────────────────────────────────


def test_a_full_gateway_reports_nothing_missing(app_ctx: FakeCtx):
    hooks.register_routes(app_ctx)
    assert app_ctx.health.issues == []


def test_every_missing_capability_is_named_in_health(fake_host: FakeHost, app_ctx: FakeCtx):
    fake_host.table.clear()
    fake_host.modules.clear()
    hooks.register_routes(app_ctx)
    issues = app_ctx.health.issues
    assert any("no agent or translation turn runs" in i for i in issues)
    assert any("calendar text is withheld" in i for i in issues)
    assert any("calendar URLs are refused" in i for i in issues)
    assert any("local calendar files are refused" in i for i in issues)
    assert any("recordings cannot be imported" in i for i in issues)
    assert any("pasted pictures are refused" in i for i in issues)
    assert app_ctx.health.status == "degraded"


def test_an_older_host_is_reported_and_its_writes_refused(app_ctx: FakeCtx):
    class _Level0:
        data_dir = app_ctx.data_dir
        health = app_ctx.health

    records = hooks.register_routes(_Level0())
    assert records, "the routes are still served on an older host"
    assert any("no owner gate for apps" in i for i in app_ctx.health.issues)
    assert any("no redaction seam" in i for i in app_ctx.health.issues)
