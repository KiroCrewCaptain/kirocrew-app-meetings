"""Every gateway reach in ``backend/_host.py``, and what happens without it.

The context seams (owner gate, audit, redaction, data directory, agent turns,
untrusted text) and the gateway functions with no seam yet each have a fallback
that is never more permissive than the gateway: no agent turn runs, a calendar
field is withheld, no URL is fetched, no file is read or copied, nothing is
transcribed, no picture is stored.
``register_routes`` names each missing capability in ``ctx.health``.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
from types import SimpleNamespace

import pytest
from conftest import REAL_HOST
from fakehost import FakeAgentTurns, FakeCtx, FakeHost, FakeUntrusted
from meetings_helpers import FakeSessionManager, root_fixture  # noqa: F401

from backend import _host, hooks, store
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


def test_an_injection_drop_uses_the_contexts_recorder(app_ctx: FakeCtx):
    _host.record_injection_dropped("calendar_title", session_key="meeting:e1", sample="x")
    assert app_ctx.untrusted.drops == [
        {"surface": "meetings_calendar_title", "session_key": "meeting:e1", "agent": "meetings", "sample": "x"}
    ]


def test_no_untrusted_seam_records_the_drop_through_the_audit(app_ctx: FakeCtx):
    app_ctx.untrusted = None  # type: ignore[assignment]
    _host.record_injection_dropped("calendar_title", session_key="meeting:e1", sample="x")
    assert app_ctx.audit.ops() == [
        ("meetings.injection_dropped", "meetings_calendar_title meeting:e1", "dropped")
    ]


def test_a_failing_recorder_falls_back_to_the_audit(app_ctx: FakeCtx):
    def boom(*_a, **_kw):
        raise RuntimeError("log unavailable")

    app_ctx.untrusted.record_dropped = boom  # type: ignore[method-assign]
    _host.record_injection_dropped("calendar_title", session_key="meeting:e1")
    assert app_ctx.audit.ops() == [
        ("meetings.injection_dropped", "meetings_calendar_title meeting:e1", "dropped")
    ]


# ── agent turns ─────────────────────────────────────────────────────────────


def test_the_turn_seam_is_the_contexts(app_ctx: FakeCtx):
    assert _host.turns() is None
    app_ctx.turns = FakeAgentTurns(FakeSessionManager())
    assert _host.turns() is app_ctx.turns


def test_a_turn_seam_missing_a_method_is_no_turn_seam(app_ctx: FakeCtx):
    app_ctx.turns = SimpleNamespace(run=lambda *a, **kw: None, has_session=lambda key: False)
    assert _host.turns() is None


def test_a_meeting_agent_dispatch_fails_without_the_turn_seam():
    """The circuit breaker sees the failure; nothing runs outside the tool gate."""
    with pytest.raises(RuntimeError, match="agent turns unavailable"):
        asyncio.run(sess.dispatch_to_agent(_host.turns(), "meetings-note-taker-m1", "a line"))


def test_a_meeting_without_the_turn_seam_starts_no_agent_and_no_translation(root: Path):
    session = sess.MeetingSession(
        meeting_id="m1",
        turns=_host.turns(),
        config={**store.read_config(root), "translation_language": "fr"},
        root=root,
    )
    assert session.translations is None
    assert session.abandoned is False


def test_the_slot_keys_are_the_turn_seams_keys():
    assert _host.is_turn_key("meetings-note-taker-m1")
    assert not _host.is_turn_key("meetings-")
    assert not _host.is_turn_key("meetings:m1:note-taker")
    assert not _host.is_turn_key("spec-builder-x")
    assert not _host.is_turn_key("meetings-" + "x" * 401)
    turns = FakeAgentTurns(None)
    for key in ("meetings-note-taker-m1", "meetings-" + "x" * 400):
        assert _host.is_turn_key(key) and turns.check_key(key) == key


# ── untrusted text ──────────────────────────────────────────────────────────


def test_no_untrusted_seam_withholds_every_calendar_field(app_ctx: FakeCtx):
    app_ctx.untrusted = None  # type: ignore[assignment]
    context = sess.build_meeting_context({"event_id": "e1", "title": "Standup"})
    assert "Standup" not in context
    assert sess._WITHHELD_FIELD in context or _host.WITHHELD in context


def test_a_failing_screen_withholds_the_field(app_ctx: FakeCtx):
    def boom(_text):
        raise RuntimeError("screen unavailable")

    app_ctx.untrusted = FakeUntrusted(flagged=boom)
    context = sess.build_meeting_context({"event_id": "e1", "title": "Standup"})
    assert "Standup" not in context
    assert sess._WITHHELD_FIELD in context


def test_a_failing_neutralizer_places_no_raw_field_in_the_fence(app_ctx: FakeCtx):
    def boom(_text):
        raise RuntimeError("neutralizer unavailable")

    app_ctx.untrusted = FakeUntrusted(neutralize=boom)
    context = sess.build_meeting_context({"event_id": "e1", "title": "Standup"})
    assert "Standup" not in context
    assert _host.WITHHELD in context


def test_the_fence_markers_are_the_gateways(app_ctx: FakeCtx):
    app_ctx.untrusted = FakeUntrusted(markers=("<<<OPEN", ">>>CLOSE"))
    context = sess.build_meeting_context({"title": "Standup"})
    assert "<<<OPEN\n" in context and context.endswith(">>>CLOSE")
    assert "Standup" in context


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
    app_ctx.turns = FakeAgentTurns(FakeSessionManager())
    hooks.register_routes(app_ctx)
    assert app_ctx.health.issues == []


def test_every_missing_capability_is_named_in_health(fake_host: FakeHost, app_ctx: FakeCtx):
    fake_host.table.clear()
    fake_host.modules.clear()
    app_ctx.untrusted = None  # type: ignore[assignment]
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
    assert any("no agent-turn seam" in i for i in app_ctx.health.issues)
    assert any("no untrusted-text seam" in i for i in app_ctx.health.issues)
