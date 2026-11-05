"""The gateway's route registry and token middleware, reduced to what these tests need.

The gateway serves an app's ``hooks.routes`` records under ``/api/apps/<app>/``
through ONE catch-all route: an exact path first, then a ``{param}`` pattern whose
parameters match one segment each, and it calls ``handler(request, ctx)``.
:func:`mount` does the same on a test application, so the route tests drive the
records :func:`backend.hooks.register_routes` really returns, with the same
matching rules. An app handler that raises becomes the registry's 502, as in the
gateway.

:func:`as_owner` stands in for the token middleware: it stamps the caller's
subject (``request["user"]``) and app claim (``request["app"]``) the way the
dashboard's auth does. A test that wants a NON-owner sends ``X-Test-User``; one
that wants an app token sends ``X-Test-App``.
"""

from __future__ import annotations

import asyncio
import re
from typing import Any

from aiohttp import web

from backend import _host, hooks
from backend import constants as k
from fakehost import OWNER

_PARAM_RE = re.compile(r"\{([a-zA-Z_][a-zA-Z0-9_]*)\}")


def _compile(path: str) -> re.Pattern[str]:
    parts: list[str] = []
    last = 0
    for match in _PARAM_RE.finditer(path):
        parts.append(re.escape(path[last : match.start()]))
        parts.append(f"(?P<{match.group(1)}>[^/]+)")
        last = match.end()
    parts.append(re.escape(path[last:]))
    return re.compile("^" + "".join(parts) + "$")


def mount(app: web.Application, ctx: Any | None = None) -> list[Any]:
    """Register the app's records on *app* behind a registry-shaped catch-all."""
    ctx = ctx if ctx is not None else _host.bound()
    records = hooks.register_routes(ctx)
    table = [(r.method.upper(), r.path, _compile(r.path), r.handler) for r in records]

    async def dispatch(request: web.Request) -> web.StreamResponse:
        path = "/" + request.match_info.get("path", "")
        candidates = [t for t in table if t[0] == request.method]
        chosen = None
        for _method, raw, _pattern, handler in candidates:
            if raw == path and "{" not in raw:
                chosen = (handler, {})
                break
        if chosen is None:
            for _method, raw, pattern, handler in candidates:
                m = pattern.match(path)
                if m and "{" in raw:
                    chosen = (handler, m.groupdict())
                    break
        if chosen is None:
            return web.json_response({"error": "not found"}, status=404)
        handler, params = chosen
        for name, value in params.items():
            request.match_info[name] = value
        try:
            return await handler(request, ctx)
        except (web.HTTPException, asyncio.CancelledError):
            raise
        except Exception:
            return web.json_response(
                {"error": "app route failed", "code": "app_route_failed"}, status=502
            )

    app.router.add_route("*", k.API_BASE + "/{path:.*}", dispatch)
    app["_meetings_records"] = records
    return records


@web.middleware
async def _identity(request: web.Request, handler):
    request["user"] = request.headers.get("X-Test-User", OWNER)
    request["app"] = request.headers.get("X-Test-App", "")
    return await handler(request)


def as_owner(app: web.Application) -> web.Application:
    """Make requests to *app* read as the dashboard owner unless a header says otherwise."""
    app.middlewares.append(_identity)
    return app


def owner_claims(request: Any, *, user: str = OWNER, app_token: str = "") -> Any:
    """Make a hand-rolled request double read as the dashboard owner."""
    claims = {"user": user, "app": app_token}
    request.get = lambda key, default=None: claims.get(key, default)
    for name, impl in (
        ("__contains__", lambda key: key in claims),
        ("__getitem__", lambda key: claims[key]),
    ):
        hook = getattr(request, name, None)
        if hook is not None and hasattr(hook, "side_effect"):
            hook.side_effect = impl
    return request
