"""The App Kit hook entry points the manifest names (``backend.hooks``).

``register_routes`` hands the gateway's route registry the route table;
``on_startup`` prepares the data directory, repairs meetings a killed gateway
left mid-flight, and starts the calendar poller; ``on_shutdown`` stops the
poller and ends the live meeting after flushing its queued transcript. The
gateway runs ``on_shutdown`` on disable and uninstall as well as at exit.

Each one binds the context it is handed first (:func:`._host.bind`), because
the store, the poller and the worker threads reach the app's data directory and
its audit and redaction seams through it. The work itself lives in
:mod:`.routes`; this module holds no state, so a second load of it (the gateway
loads each hook path on its own) shares everything with the first.
"""

from __future__ import annotations

from typing import Any

from . import _host
from . import routes as _routes


def register_routes(ctx: Any) -> list[_host.Route]:
    """The route records the gateway serves under ``/api/apps/meetings``.

    Touches no file. On a gateway that lacks a seam or a host function this
    app needs, the routes are still returned (reads keep working) and every
    missing capability is reported through ``ctx.health``; the operations that
    need it refuse.
    """
    _host.bind(ctx)
    health = getattr(ctx, "health", None)
    mark = getattr(health, "mark_degraded", None)
    if callable(mark):
        for issue in _host.capability_issues(ctx):
            mark(issue)
    return _routes.route_table()


async def on_startup(ctx: Any) -> None:
    """Prepare the data directory and start the calendar poller."""
    _host.bind(ctx)
    await _routes.start({})


async def on_shutdown(ctx: Any) -> None:
    """Stop the poller, then flush and end the live meeting."""
    if _host.bound() is None:
        _host.bind(ctx)
    await _routes.stop({})
