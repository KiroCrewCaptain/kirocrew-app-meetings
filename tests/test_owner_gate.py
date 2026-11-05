"""The Meetings write routes that change a meeting or drive its agents are owner-only.

Adding or removing a dictionary term is owner-only too: a term rewrites every
line the owner's meeting agents receive. Dictionary reload and calendar sync
stay open, since they only re-read the owner's own sources.

An allow-listed channel user holds a dashboard token whose ``app`` claim is ``""``
but whose subject is not the owner; an app token carries a non-empty ``app``.
Both must be refused before a handler runs, while the owner still reaches every
route and the read routes stay open. The decision is the host's own owner gate
(``ctx.require_owner``, here :class:`fakehost.FakeCtx`), reached through
``_common.require_owner``; the host audits a denial as ``meetings.<verb>`` and the
app audits the allow.
"""

from __future__ import annotations

import pytest
from meetings_helpers import (  # noqa: F401
    app_fixture,
    client_for,
    enabled_fixture,
    reset_module_state_fixture,
    root_fixture,
)

from backend import _host
from backend import constants as k
from backend.routes import _common, route_table

BASE = k.API_BASE
MID = "standup"

pytestmark = pytest.mark.asyncio

GATED = {
    ("PUT", "/settings"): "meetings.put_config",
    ("POST", "/dictionary"): "meetings.add_dictionary_term",
    ("POST", "/dictionary/remove"): "meetings.remove_dictionary_term",
    ("PATCH", "/meetings/{meeting_id}"): "meetings.rename",
    ("DELETE", "/meetings/{meeting_id}"): "meetings.delete",
    ("POST", "/meetings/{meeting_id}/init"): "meetings.init",
    ("POST", "/meetings/{meeting_id}/start"): "meetings.start",
    ("POST", "/meetings/{meeting_id}/dispatch"): "meetings.dispatch",
    ("POST", "/meetings/{meeting_id}/message"): "meetings.message",
    ("PUT", "/meetings/{meeting_id}/outputs"): "meetings.put_output",
    ("DELETE", "/meetings/{meeting_id}/outputs"): "meetings.delete_output",
    ("PUT", "/meetings/{meeting_id}/note"): "meetings.put_note",
    ("POST", "/meetings/{meeting_id}/note/images"): "meetings.note_image",
    ("POST", "/meetings/{meeting_id}/tasks"): "meetings.add_task",
    ("PATCH", "/meetings/{meeting_id}/tasks"): "meetings.update_task",
    ("DELETE", "/meetings/{meeting_id}/tasks"): "meetings.delete_task",
    ("POST", "/meetings/{meeting_id}/tasks/file"): "meetings.file_task",
    ("POST", "/meetings/{meeting_id}/tasks/review"): "meetings.review_task",
    ("POST", "/meetings/{meeting_id}/status"): "meetings.status",
    ("POST", "/meetings/{meeting_id}/stop"): "meetings.stop",
    ("POST", "/meetings/{meeting_id}/attachments"): "meetings.attachments",
    ("POST", "/meetings/{meeting_id}/agents"): "meetings.toggle_agent",
    ("POST", "/meetings/{meeting_id}/mute"): "meetings.mute_agent",
    ("POST", "/meetings/{meeting_id}/reset"): "meetings.reset_agents",
}

CALLERS = {
    "non_owner": {"X-Test-User": "channel-user"},
    "meetings_app_token": {"X-Test-App": "meetings"},
    "other_app_token": {"X-Test-App": "other-app"},
}


def _url(template: str) -> str:
    return BASE + template.replace("{meeting_id}", MID)


def _registered(method: str, template: str) -> bool:
    return any(r.method == method and r.path == template for r in route_table())


@pytest.fixture(name="records")
def records_fixture(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, str, str]]:
    seen: list[tuple[str, str, str]] = []
    monkeypatch.setattr(
        _common,
        "audit",
        lambda op, resource, *, outcome, error="": seen.append((op, resource, outcome)),
    )
    return seen


@pytest.mark.parametrize("who", sorted(CALLERS))
@pytest.mark.parametrize("route_key", sorted(GATED), ids=lambda key: f"{key[0]} {key[1]}")
async def test_a_non_owner_caller_is_refused_before_the_handler(
    app, app_ctx, records, route_key, who
):
    method, template = route_key
    assert _registered(method, template), f"{method} {template} is not registered"

    async with client_for(app) as client:
        resp = await client.request(method, _url(template), headers=CALLERS[who], json={})
        body = await resp.json()
    assert resp.status == 403
    assert body["code"] == "owner_only"
    # The host gate decided and recorded the denial, under the app's own prefix.
    assert app_ctx.denials == [GATED[route_key]]
    # The refusal happens before the handler: no allow, and no handler-level record.
    assert records == []


@pytest.mark.parametrize("route_key", sorted(GATED), ids=lambda key: f"{key[0]} {key[1]}")
async def test_the_owner_passes_the_gate_and_it_is_audited(app, app_ctx, records, route_key):
    method, template = route_key
    async with client_for(app) as client:
        resp = await client.request(method, _url(template), json={})
        text = await resp.text()
    assert "owner_only" not in text, text
    assert app_ctx.denials == []
    assert (GATED[route_key], f"{_url(template)} owner-check", "allowed") in records


async def test_only_the_named_write_routes_carry_the_gate(app, records):
    """Probe every registered route as a non-owner and collect the ones refused.

    Pins both directions: a named write route that loses its gate, and a read
    route (or an unnamed write route) that gains one, both change this set.
    ``/import`` gates itself inline with the same gate.
    """
    refused: set[tuple[str, str]] = set()
    async with client_for(app) as client:
        for record in route_table():
            resp = await client.request(
                record.method, _url(record.path), headers=CALLERS["non_owner"], json={}
            )
            if resp.status == 403 and "owner_only" in await resp.text():
                refused.add((record.method, record.path))
    assert refused == set(GATED) | {("POST", "/meetings/{meeting_id}/import")}


@pytest.mark.parametrize(
    "template",
    ["/settings", "/dictionary", "/meetings", "/agents", "/status", "/task-providers"],
)
async def test_the_owner_still_reads(app, template):
    async with client_for(app) as client:
        resp = await client.get(_url(template))
    assert resp.status == 200, await resp.text()


@pytest.mark.parametrize("route_key", sorted(GATED), ids=lambda key: f"{key[0]} {key[1]}")
async def test_a_gateway_without_the_owner_gate_refuses_even_the_owner(
    app, app_ctx, records, monkeypatch: pytest.MonkeyPatch, route_key
):
    """Fail closed: no ``ctx.require_owner`` means no write reaches a handler."""
    method, template = route_key

    class _NoGate:
        data_dir = app_ctx.data_dir
        scrub = app_ctx.scrub
        audit = app_ctx.audit

    monkeypatch.setattr(_host, "_ctx", _NoGate())
    async with client_for(app) as client:
        resp = await client.request(method, _url(template), json={})
        body = await resp.json()
    assert resp.status == 403
    assert body["code"] == "owner_only"
    assert records == [(GATED[route_key], f"{_url(template)} reason:no-owner-gate", "denied")]
