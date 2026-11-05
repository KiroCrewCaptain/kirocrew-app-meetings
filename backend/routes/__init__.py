"""Meetings — the route table and the app's lifecycle work.

The gateway loads ``backend/hooks.py`` (the manifest's ``backend.hooks``), which
hands this module's :func:`route_table` to the route registry and runs
:func:`start` / :func:`stop` as the app's ``on_startup`` / ``on_shutdown``.

Every handler is served under ``/api/apps/meetings/*`` by the gateway's route
registry — same-origin, behind the dashboard's token auth. Upstream instead ran
``web.run_app`` on its own port and called back into the gateway over
authenticated loopback HTTP; that whole second server (and its copy of the auth
path) is gone.

Handlers are wrapped by :func:`._common.route`, which turns validation failures
into 4xx. The write routes that change a meeting, edit its dictionary, or drive
its agents are also wrapped by :func:`._common.require_owner`, so only the
dashboard owner reaches them.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from .. import calendar_poller
from .. import constants as k
from .. import store
from ..domain import session as sess
from . import agents as agents_routes
from . import audio_import as import_routes
from . import calendar as calendar_routes
from . import meeting_lifecycle as lifecycle_routes
from . import settings as settings_routes
from . import tasks as tasks_routes
from .._host import Route, subprocess_executor
from ._common import (
    ACTIVE,
    require_owner,
    route,
)

logger = logging.getLogger("kirocrew.app.meetings")

BASE = k.API_BASE


def _reconcile_orphaned_meetings(root: Any) -> list[str]:
    """End meetings left mid-flight by a process that never ran its cleanup. BLOCKING.

    :func:`stop` covers a GRACEFUL shutdown. It cannot cover a hard kill —
    ``SIGKILL``, an OOM, a crash, a power loss — and that is precisely when a
    meeting is most likely to be mid-flight. So the same false-``active`` state the
    cleanup hook exists to prevent is reachable by simply not letting the hook run.

    Startup is the only place to repair it, and it is a sound place: ``ACTIVE`` is
    empty by construction here (fresh process, no session installed yet), so ANY
    meeting on disk claiming a non-terminal status is provably orphaned — there is
    no live session it could belong to. That inference is only valid before the
    first start, which is why this runs at boot rather than on a timer.

    Returns the ids it ended, for the log line.
    """
    ended: list[str] = []
    for summary in store.list_meetings(root):
        status = str(summary.get("status") or "")
        # `idle` is NOT orphaned: a meeting can sit initialized-but-never-started
        # across any number of restarts, and ending those would mark every meeting
        # the user ever opened as finished.
        if status not in (k.STATUS_ACTIVE, k.STATUS_PAUSED, k.STATUS_REVIEWING):
            continue
        meeting_id = str(summary.get("event_id") or "")
        if not meeting_id:
            continue
        try:
            if sess.end_meeting_meta(meeting_id, root) is not None:
                ended.append(meeting_id)
        except Exception:  # pragma: no cover — one bad meeting must not stop the rest
            logger.debug("meetings: could not reconcile %s", meeting_id, exc_info=True)
    return ended


async def _on_startup(app: Any) -> None:
    """Create the data subtree, load the dictionary, and reconcile orphans at boot.

    This is the Python home of what upstream shipped as a multi-line ``mkdir -p``
    shell blob prepended to a cron message. Both steps touch the filesystem, so
    they run on an executor rather than the loop, and neither may break gateway
    startup.

    The reconcile pass is the other half of ``_on_cleanup``: that hook keeps a
    graceful shutdown honest, and this one repairs the case where it never ran.
    """

    def _init() -> tuple[int, list[str]]:
        root = app.get("_meetings_data_root")
        store.ensure_data_dirs(root)
        terms = len(sess.reload_dictionary(root).terms)
        return terms, _reconcile_orphaned_meetings(root)

    try:
        count, ended = await asyncio.get_running_loop().run_in_executor(
            subprocess_executor(), _init
        )
        logger.info("meetings: data dir ready, %d dictionary term(s) loaded", count)
        if ended:
            # Loud, not debug: this means a previous run died mid-meeting, and the
            # ids are what a user would need to find the notes that stop early.
            logger.warning(
                "meetings: ended %d meeting(s) orphaned by a previous run: %s",
                len(ended),
                ", ".join(ended),
            )
    except Exception:  # pragma: no cover — defensive
        logger.warning("meetings: data-dir init failed", exc_info=True)


async def _on_cleanup(app: Any) -> None:
    """Flush a live meeting's queued transcript, mark it ended, then drop it.

    The live session lives only in this process's memory, but the meeting's status
    lives on disk — so dropping one without the other leaves the two disagreeing.
    A gateway restart during an ACTIVE meeting persisted ``active`` while ``ACTIVE``
    came back empty, and that combination is worse than either half:

    * the dashboard reads ``active`` and shows Live, and its transcription binding
      keys off exactly that status, so the browser keeps recording;
    * every resulting dispatch answers 409 ``no_active_meeting``, so the speech is
      dropped rather than queued — the notes just stop, mid-meeting, with the UI
      still claiming to be listening;
    * ``handle_start_meeting`` cannot recover it either, because ``idle -> active``
      is the only transition out of a fresh meeting and this one is not idle.

    Marking it ended is what makes the state honest: the meeting shows Ended, and
    ``ended -> active`` is an allowed transition, so the Restart button is exactly
    the affordance the user needs. That path re-runs ``init_agents``, which is why
    a restarted meeting's agents get their instructions back (see
    ``handle_start_meeting``).

    Ordered flush-then-mark: the flush is what saves the queued transcript, and it
    must happen while the session still exists. Neither step may break shutdown.
    """
    try:
        # A restart is not a reason to lose what was said; the drain is bounded and
        # a failure inside it still tears the session down.
        previous = await ACTIVE.drain_and_clear()
        if previous is not None:
            root = app.get("_meetings_data_root")
            # Off the loop: this is a metadata read-modify-write, and it takes the
            # metadata transaction internally.
            await asyncio.get_running_loop().run_in_executor(
                subprocess_executor(), sess.end_meeting_meta, previous.meeting_id, root
            )
    except Exception:  # pragma: no cover — defensive
        logger.debug("meetings: cleanup failed", exc_info=True)


async def start(app: Any) -> None:
    """The app's startup work: the data subtree and orphan repair, then the poller.

    *app* is any mapping; its ``_meetings_data_root`` (a test seam) overrides the
    data directory, and is absent in the gateway. Neither step may break the
    enable that runs it.
    """
    await _on_startup(app)
    try:
        await calendar_poller.start_poller(app)
    except Exception:  # pragma: no cover — defensive
        logger.warning("meetings: could not start the calendar poller", exc_info=True)


async def stop(app: Any) -> None:
    """The app's shutdown work, in order: stop the poller, then end the live meeting.

    The poller goes first so no tick can pre-create a meeting while the live
    session is being torn down. Runs on disable and uninstall as well as at
    gateway exit.
    """
    try:
        await calendar_poller.stop_poller(app)
    except Exception:  # pragma: no cover — defensive
        logger.debug("meetings: calendar poller stop failed", exc_info=True)
    await _on_cleanup(app)


def route_table() -> list[Route]:
    """Every Meetings route, as the ``hooks.routes`` records the gateway serves.

    Paths are relative: the gateway's route registry serves them under
    ``/api/apps/meetings`` (:data:`BASE`). Each handler is ``(request, ctx)``.
    """
    return [
        # Config + dictionary
        Route("GET", "/settings", route(settings_routes.handle_get_config)),
        Route(
            "PUT",
            "/settings",
            route(require_owner("meetings.put_config")(settings_routes.handle_put_config)),
        ),
        Route("GET", "/dictionary", route(settings_routes.handle_get_dictionary)),
        Route(
            "POST",
            "/dictionary",
            route(
                require_owner("meetings.add_dictionary_term")(
                    settings_routes.handle_add_dictionary_term
                )
            ),
        ),
        Route(
            "POST",
            "/dictionary/remove",
            route(
                require_owner("meetings.remove_dictionary_term")(
                    settings_routes.handle_remove_dictionary_term
                )
            ),
        ),
        Route("POST", "/dictionary/reload", route(settings_routes.handle_reload_dictionary)),
        # Calendar
        Route("GET", "/calendar", route(calendar_routes.handle_get_calendar)),
        Route("POST", "/calendar/sync", route(calendar_routes.handle_calendar_sync)),
        Route("GET", "/calendar/providers", route(calendar_routes.handle_calendar_providers)),
        # Agents + dispatcher
        Route("GET", "/agents", route(agents_routes.handle_get_agents)),
        Route("GET", "/status", route(agents_routes.handle_status)),
        Route("GET", "/task-providers", route(tasks_routes.handle_task_providers)),
        # Meetings
        Route("GET", "/meetings", route(lifecycle_routes.handle_list_meetings)),
        Route("GET", "/meetings/{meeting_id}", route(lifecycle_routes.handle_get_meeting)),
        Route(
            "DELETE",
            "/meetings/{meeting_id}",
            route(require_owner("meetings.delete")(lifecycle_routes.handle_delete_meeting)),
        ),
        Route(
            "PATCH",
            "/meetings/{meeting_id}",
            route(require_owner("meetings.rename")(lifecycle_routes.handle_patch_meeting)),
        ),
        Route(
            "POST",
            "/meetings/{meeting_id}/init",
            route(require_owner("meetings.init")(lifecycle_routes.handle_meeting_init)),
        ),
        Route(
            "POST",
            "/meetings/{meeting_id}/start",
            route(require_owner("meetings.start")(lifecycle_routes.handle_start_meeting)),
        ),
        Route(
            "POST",
            "/meetings/{meeting_id}/status",
            route(require_owner("meetings.status")(lifecycle_routes.handle_meeting_status)),
        ),
        Route(
            "POST",
            "/meetings/{meeting_id}/stop",
            route(require_owner("meetings.stop")(lifecycle_routes.handle_stop_meeting)),
        ),
        Route(
            "GET",
            "/meetings/{meeting_id}/transcript",
            route(lifecycle_routes.handle_get_transcript),
        ),
        Route("GET", "/meetings/{meeting_id}/outputs", route(lifecycle_routes.handle_get_outputs)),
        Route(
            "GET",
            "/meetings/{meeting_id}/translations",
            route(lifecycle_routes.handle_get_translations),
        ),
        # Editable minutes. PUT/DELETE on the same path as the GET, with the agent id in
        # the body — the shape the task routes already use, and the reason there is no
        # `{agent_id}` path segment to validate.
        Route(
            "PUT",
            "/meetings/{meeting_id}/outputs",
            route(require_owner("meetings.put_output")(lifecycle_routes.handle_put_output)),
        ),
        Route(
            "DELETE",
            "/meetings/{meeting_id}/outputs",
            route(require_owner("meetings.delete_output")(lifecycle_routes.handle_delete_output)),
        ),
        # The user's own note. A GET/PUT pair rather than a PATCH: the body is the
        # whole note, so there is no partial update to express. Writes are owner-only
        # like the output sidecar writes above; reads follow the app's deliberately open
        # authenticated-read policy.
        Route("GET", "/meetings/{meeting_id}/note", route(lifecycle_routes.handle_get_note)),
        Route(
            "PUT",
            "/meetings/{meeting_id}/note",
            route(require_owner("meetings.put_note")(lifecycle_routes.handle_put_note)),
        ),
        Route(
            "POST",
            "/meetings/{meeting_id}/note/images",
            route(require_owner("meetings.note_image")(lifecycle_routes.handle_post_note_image)),
        ),
        Route(
            "POST",
            "/meetings/{meeting_id}/attachments",
            route(require_owner("meetings.attachments")(lifecycle_routes.handle_attachments)),
        ),
        # Per-meeting agent control
        Route(
            "POST",
            "/meetings/{meeting_id}/agents",
            route(require_owner("meetings.toggle_agent")(agents_routes.handle_toggle_agent)),
        ),
        Route(
            "POST",
            "/meetings/{meeting_id}/mute",
            route(require_owner("meetings.mute_agent")(agents_routes.handle_mute_agent)),
        ),
        Route(
            "POST",
            "/meetings/{meeting_id}/dispatch",
            route(require_owner("meetings.dispatch")(agents_routes.handle_dispatch_text)),
        ),
        Route(
            "POST",
            "/meetings/{meeting_id}/message",
            route(require_owner("meetings.message")(agents_routes.handle_agent_message)),
        ),
        Route(
            "POST",
            "/meetings/{meeting_id}/reset",
            route(require_owner("meetings.reset_agents")(agents_routes.handle_reset_agents)),
        ),
        # Import an existing recording. A transcript PRODUCER, like /dispatch — it needs a
        # live meeting for the same reason, and shares `_common.dispatch_line`.
        Route("POST", "/meetings/{meeting_id}/import", route(import_routes.handle_import_audio)),
        # Tasks
        Route("GET", "/meetings/{meeting_id}/tasks", route(tasks_routes.handle_get_tasks)),
        Route(
            "POST",
            "/meetings/{meeting_id}/tasks",
            route(require_owner("meetings.add_task")(tasks_routes.handle_add_task)),
        ),
        Route(
            "PATCH",
            "/meetings/{meeting_id}/tasks",
            route(require_owner("meetings.update_task")(tasks_routes.handle_update_task)),
        ),
        Route(
            "DELETE",
            "/meetings/{meeting_id}/tasks",
            route(require_owner("meetings.delete_task")(tasks_routes.handle_delete_task)),
        ),
        Route(
            "POST",
            "/meetings/{meeting_id}/tasks/file",
            route(require_owner("meetings.file_task")(tasks_routes.handle_file_task)),
        ),
        Route(
            "POST",
            "/meetings/{meeting_id}/tasks/review",
            route(require_owner("meetings.review_task")(tasks_routes.handle_review_task)),
        ),
    ]
