"""The ``hooks.routes`` contract: what ``register_routes`` hands the gateway.

The built-in registered its handlers straight on the gateway's aiohttp router
and gated each request on the app being enabled. Installed, the app returns
structural route records that the gateway's route registry serves under
``/api/apps/meetings`` while the app is enabled and takes down when it is not.
"""

from __future__ import annotations

import asyncio
import json
import re
from pathlib import Path

import pytest
from aiohttp import web
from fakehost import FakeCtx
from meetings_helpers import (  # noqa: F401 — fixtures are used by name
    client_for,
    make_app,
    reset_module_state_fixture,
    root_fixture,
)

from backend import _host, hooks
from backend import constants as k
from backend.routes import route_table

APP_ROOT = Path(__file__).resolve().parents[1]

#: The built-in's route table (``backend/routes/__init__.py`` at the ported
#: commit), with ``/config`` renamed: the gateway serves ``/api/apps/{name}/config``
#: itself (an app's manifest configuration) ahead of the registry's catch-all.
BUILTIN_ROUTES = {
    ("GET", "/settings"),
    ("PUT", "/settings"),
    ("GET", "/dictionary"),
    ("POST", "/dictionary"),
    ("POST", "/dictionary/remove"),
    ("POST", "/dictionary/reload"),
    ("GET", "/calendar"),
    ("POST", "/calendar/sync"),
    ("GET", "/calendar/providers"),
    ("GET", "/agents"),
    ("GET", "/status"),
    ("GET", "/task-providers"),
    ("GET", "/meetings"),
    ("GET", "/meetings/{meeting_id}"),
    ("DELETE", "/meetings/{meeting_id}"),
    ("PATCH", "/meetings/{meeting_id}"),
    ("POST", "/meetings/{meeting_id}/init"),
    ("POST", "/meetings/{meeting_id}/start"),
    ("POST", "/meetings/{meeting_id}/status"),
    ("POST", "/meetings/{meeting_id}/stop"),
    ("GET", "/meetings/{meeting_id}/transcript"),
    ("GET", "/meetings/{meeting_id}/outputs"),
    ("GET", "/meetings/{meeting_id}/translations"),
    ("PUT", "/meetings/{meeting_id}/outputs"),
    ("DELETE", "/meetings/{meeting_id}/outputs"),
    ("GET", "/meetings/{meeting_id}/note"),
    ("PUT", "/meetings/{meeting_id}/note"),
    ("POST", "/meetings/{meeting_id}/note/images"),
    ("POST", "/meetings/{meeting_id}/attachments"),
    ("POST", "/meetings/{meeting_id}/agents"),
    ("POST", "/meetings/{meeting_id}/mute"),
    ("POST", "/meetings/{meeting_id}/dispatch"),
    ("POST", "/meetings/{meeting_id}/message"),
    ("POST", "/meetings/{meeting_id}/reset"),
    ("POST", "/meetings/{meeting_id}/import"),
    ("GET", "/meetings/{meeting_id}/tasks"),
    ("POST", "/meetings/{meeting_id}/tasks"),
    ("PATCH", "/meetings/{meeting_id}/tasks"),
    ("DELETE", "/meetings/{meeting_id}/tasks"),
    ("POST", "/meetings/{meeting_id}/tasks/file"),
    ("POST", "/meetings/{meeting_id}/tasks/review"),
}

#: Suffixes under ``/api/apps/{name}/`` the gateway answers itself, before the
#: registry's catch-all is consulted (``apps/routes.py``, ``dashboard/routes/system.py``).
GATEWAY_OWNED = {
    "/config",
    "/manifest",
    "/uninstall",
    "/uninstall/preview",
    "/update",
    "/enable",
    "/disable",
    "/open",
    "/dev",
    "/token",
    "/migrate-cleanup",
}


class TestRouteRegistration:
    def test_the_table_is_the_builtins(self):
        assert {(r.method, r.path) for r in route_table()} == BUILTIN_ROUTES
        assert len(route_table()) == len(BUILTIN_ROUTES)

    def test_no_route_sits_on_a_gateway_owned_suffix(self):
        for record in route_table():
            assert record.path not in GATEWAY_OWNED, record.path
            assert not record.path.startswith("/frames/"), record.path

    def test_records_are_structural_and_relative(self):
        for record in route_table():
            assert isinstance(record.method, str) and record.method.isupper()
            assert isinstance(record.path, str) and record.path.startswith("/")
            assert not record.path.startswith(k.API_BASE)
            assert callable(record.handler)
            # The registry's `{param}` matches one segment; no tail form exists.
            for param in re.findall(r"\{([^}]*)\}", record.path):
                assert re.fullmatch(r"[a-zA-Z_][a-zA-Z0-9_]*", param), param

    def test_handlers_take_the_request_and_the_context(self, app_ctx: FakeCtx):
        import inspect

        for record in route_table():
            params = list(inspect.signature(record.handler, follow_wrapped=False).parameters)
            assert params[:2] == ["request", "ctx"], (record.path, params)

    def test_register_routes_binds_the_context_and_touches_no_file(self, tmp_path: Path):
        ctx = FakeCtx(data_dir=tmp_path / "fresh-data")
        records = hooks.register_routes(ctx)
        assert _host.bound() is ctx
        assert len(records) == len(BUILTIN_ROUTES)
        assert not (tmp_path / "fresh-data").exists()

    def test_a_fresh_context_replaces_the_old_one(self, tmp_path: Path):
        first = FakeCtx(data_dir=tmp_path / "a")
        second = FakeCtx(data_dir=tmp_path / "b")
        hooks.register_routes(first)
        hooks.register_routes(second)
        assert _host.bound() is second
        assert _host.data_dir() == tmp_path / "b"

    def test_the_manifest_names_the_hooks_this_module_defines(self):
        manifest = json.loads((APP_ROOT / "app.json").read_text(encoding="utf-8"))
        assert manifest["backend"] == {
            "hooks": {
                "routes": "backend.hooks:register_routes",
                "on_startup": "backend.hooks:on_startup",
                "on_shutdown": "backend.hooks:on_shutdown",
            }
        }
        # The gateway loads `backend.hooks` by file path; the file must exist.
        assert (APP_ROOT / "backend" / "hooks.py").is_file()


class TestTheLifecycleHooks:
    def test_startup_prepares_the_data_dir_and_shutdown_stops_the_poller(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ):
        from backend import calendar_poller

        monkeypatch.setattr(k, "CALENDAR_POLL_STARTUP_DELAY_SECS", 3600)
        ctx = FakeCtx(data_dir=tmp_path / "data")

        async def run():
            await hooks.on_startup(ctx)
            assert calendar_poller.is_running()
            await hooks.on_shutdown(ctx)
            assert not calendar_poller.is_running()

        asyncio.run(run())
        assert (tmp_path / "data" / k.DICTIONARY_FILE).is_file()
        assert (tmp_path / "data" / "meetings").is_dir()


class TestDisabledAppServesNothing:
    @pytest.mark.asyncio
    async def test_a_disabled_app_has_no_routes_so_every_path_is_404(self, root: Path):
        """Deregistered on disable: the registry answers before any handler runs."""
        app = web.Application()

        async def no_app_routes(_request):
            return web.json_response({"error": "not found"}, status=404)

        app.router.add_route("*", k.API_BASE + "/{path:.*}", no_app_routes)
        async with client_for(app) as client:
            for method, path in (
                ("get", "/settings"),
                ("get", "/meetings"),
                ("post", "/meetings/x/init"),
                ("post", "/calendar/sync"),
            ):
                resp = await getattr(client, method)(k.API_BASE + path, json={})
                assert resp.status == 404, f"{method} {path}"
        assert list((root / "meetings").iterdir()) == []

    @pytest.mark.asyncio
    async def test_an_enabled_app_serves_its_reads(self, root: Path):
        async with client_for(make_app(root)) as client:
            resp = await client.get(k.API_BASE + "/settings")
            assert resp.status == 200
