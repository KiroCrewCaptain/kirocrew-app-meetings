"""Every place Meetings reaches into the Kiro Crew gateway, in one module.

An external app's Python runs inside the gateway process. Meetings needs two
kinds of host surface:

1. **The App Kit context** handed to its hooks (``ctx``): the data directory,
   the owner gate (``ctx.require_owner``), the security event log
   (``ctx.audit``), outbound redaction (``ctx.scrub``), agent turns
   (``ctx.turns``) and the untrusted-text controls (``ctx.untrusted``). These
   are public seams; each is read off the context with ``getattr`` and has a
   fallback that is never MORE permissive than the host: no owner gate refuses
   everyone, no scrubber withholds the text, no audit sink logs locally, no turn
   seam runs no agent, no untrusted-text seam withholds every calendar field.

2. **The public backend SDK** (``kiro_crew.apps.backend_sdk``). Meetings vets
   a calendar URL against the gateway's public-address rule, reads a local
   calendar file through its no-follow read, checks a user-chosen recording
   with the file path gate and copies it through the descriptor-pinned walk,
   and sniffs a pasted picture with the gateway's raster table. Copying any of
   those into this repository would leave a control that looks present and
   drifts from the one the gateway enforces, so each is the SDK's, which is the
   gateway's own function by reference. Each is looked up lazily, through
   :func:`_backend_sdk_attr`, which also checks the App Kit level the name
   arrived at.

3. **Gateway functions that have no public name yet.** The recording import
   stages its copy under the agent-denied voice-runtime root and transcribes it
   with the gateway's speech-to-text; both are private names, looked up the same
   lazy way through :func:`_host_attr`.

Every lookup is here alone (``tests/test_no_host_imports.py`` pins that), at
call time. When the gateway does not provide one, the operation that needs it
is REFUSED (no URL is fetched, no file is read, nothing is transcribed), never
run without it. ``PORTING.md`` lists each one.

The small helpers that carry no security decision are restated in
``_compat.py`` and ``_fs.py``.
"""

from __future__ import annotations

import importlib
import logging
import re
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable

logger = logging.getLogger("kirocrew.app.meetings")

APP_NAME = "meetings"

#: The App Kit seam level the owner gate needs.
REQUIRED_SDK_LEVEL = 1

#: The App Kit seam level that adds ``ctx.turns`` and ``ctx.untrusted``.
TURNS_SDK_LEVEL = 2

#: What a text the gateway could not scan is replaced with. Never the text itself.
WITHHELD = "[withheld: this Kiro Crew could not scan it]"


# ── host resolution ─────────────────────────────────────────────────────────


def _host_attr(module: str, name: str) -> Any | None:
    """``module.name`` from the running gateway, or ``None`` when it has none.

    The one seam tests replace: a fake host answers here, so no test needs a
    Kiro Crew install.
    """
    try:
        mod = importlib.import_module(module)
    except Exception:  # noqa: BLE001 - any import failure means "not provided"
        return None
    return getattr(mod, name, None)


def _host_module(module: str) -> Any | None:
    """The gateway module itself, for a caller that reads several names off it."""
    try:
        return importlib.import_module(module)
    except Exception:  # noqa: BLE001 - any import failure means "not provided"
        return None


#: The gateway's public backend SDK package (App Kit level 7 and later).
BACKEND_SDK = "kiro_crew.apps.backend_sdk"

#: Each backend SDK name Meetings calls -> the App Kit level that publishes it.
#: The package and its no-follow read arrived at level 7; the file path gate, the
#: descriptor-pinned walk and copy, the public-address check and the raster
#: sniffer at level 14.
_SDK_LEVELS: dict[str, int] = {
    "read_bytes_nofollow": 7,
    "canonical_file_path": 14,
    "PinnedPathRefusal": 14,
    "supports_pinned_walk": 14,
    "is_reparse_point": 14,
    "pin_parent": 14,
    "copy_file_pinned": 14,
    "UrlRejectedError": 14,
    "vet_public_url": 14,
    "sniff_raster_mime": 14,
}


def _backend_sdk_attr(name: str) -> Any | None:
    """``name`` from the gateway's public backend SDK, or ``None`` below its level.

    A name added after the package carries its own level (:data:`_SDK_LEVELS`), so
    the package's ``SDK_LEVEL`` is checked as well as the name itself: a gateway
    that reports a lower level, or none, is treated as not providing it.
    """
    sdk_level = _host_attr(BACKEND_SDK, "SDK_LEVEL")
    if not isinstance(sdk_level, int) or isinstance(sdk_level, bool):
        return None
    if sdk_level < _SDK_LEVELS[name]:
        return None
    return _host_attr(BACKEND_SDK, name)


def _lookup(module: str, name: str) -> Any | None:
    """``module.name`` through the backend SDK's level check when it is the SDK's."""
    return _backend_sdk_attr(name) if module == BACKEND_SDK else _host_attr(module, name)


@dataclass(frozen=True)
class Route:
    """One ``hooks.routes`` record, accepted structurally by the gateway.

    A level-1 ``RouteRegistry`` takes any record with a str ``method``, a str
    ``path`` (relative to ``/api/apps/meetings``) and a callable
    ``handler(request, ctx)``.
    """

    method: str
    path: str
    handler: Callable[[Any, Any], Awaitable[Any]]


#: The gateway functions each capability needs, for the health report. A name in
#: :data:`BACKEND_SDK` counts only at the App Kit level that publishes it.
_CAPABILITIES: tuple[tuple[str, tuple[tuple[str, str], ...]], ...] = (
    (
        "calendar URLs are refused: this Kiro Crew has no SSRF address check "
        "(App Kit level 14 or later provides it)",
        ((BACKEND_SDK, "vet_public_url"), (BACKEND_SDK, "UrlRejectedError")),
    ),
    (
        "local calendar files are refused: this Kiro Crew has no shared file reader",
        ((BACKEND_SDK, "read_bytes_nofollow"),),
    ),
    (
        "recordings cannot be imported: this Kiro Crew has no file gate, pinned copy "
        "or speech-to-text for apps (App Kit level 14 or later provides the first two)",
        (
            (BACKEND_SDK, "canonical_file_path"),
            (BACKEND_SDK, "copy_file_pinned"),
            ("kiro_crew.sandbox", "prime_voice_runtime_sandbox_paths"),
            ("kiro_crew.transcribe", "transcribe_audio"),
        ),
    ),
    (
        "pasted pictures are refused: this Kiro Crew has no raster sniffer "
        "(App Kit level 14 or later provides it)",
        ((BACKEND_SDK, "sniff_raster_mime"),),
    ),
)


def sdk_level(ctx: Any) -> int:
    """The seam level the gateway reports; 0 for a gateway that predates the field."""
    level = getattr(ctx, "sdk_level", 0)
    return level if isinstance(level, int) and not isinstance(level, bool) else 0


def capability_issues(ctx: Any) -> list[str]:
    """Why this gateway serves Meetings only in part; ``[]`` when it serves all of it."""
    issues: list[str] = []
    if sdk_level(ctx) < REQUIRED_SDK_LEVEL or not callable(getattr(ctx, "require_owner", None)):
        issues.append(
            "every change is refused: this Kiro Crew has no owner gate for apps "
            f"(App Kit level {sdk_level(ctx)}, Meetings needs {REQUIRED_SDK_LEVEL})"
        )
    if not redaction_available_on(ctx):
        issues.append("transcript and notes are withheld: this Kiro Crew has no redaction seam")
    if turns_of(ctx) is None:
        issues.append(
            "no agent or translation turn runs: this Kiro Crew has no agent-turn seam "
            f"for apps (ctx.turns, App Kit level {TURNS_SDK_LEVEL}, permissions.agentTurns)"
        )
    if untrusted_of(ctx) is None:
        issues.append(
            "calendar text is withheld from the agents: this Kiro Crew has no "
            f"untrusted-text seam for apps (ctx.untrusted, App Kit level {TURNS_SDK_LEVEL})"
        )
    for issue, names in _CAPABILITIES:
        if issue in issues:
            continue
        if any(not callable(_lookup(module, name)) for module, name in names):
            issues.append(issue)
    return issues


# ── the bound app context ───────────────────────────────────────────────────

_ctx: Any | None = None
_ctx_lock = threading.Lock()


def bind(ctx: Any) -> None:
    """Remember the context the gateway handed to a hook.

    Meetings reaches the context from places no request passes through (the
    store's default data directory, the calendar poller, worker threads), so it
    is held here. A later context replaces an earlier one: an update or a
    re-enable hands a fresh one.
    """
    global _ctx
    with _ctx_lock:
        _ctx = ctx


def bound() -> Any | None:
    with _ctx_lock:
        return _ctx


def data_dir() -> Path:
    """The app's data directory (``<data home>/apps/meetings/data``).

    Raises when no context is bound rather than guessing a location: a guess
    would put meeting notes somewhere the gateway does not manage.
    """
    path = getattr(bound(), "data_dir", None)
    if path is None:
        raise RuntimeError("meetings: no app context is bound")
    return Path(path)


# ── owner gate ──────────────────────────────────────────────────────────────


async def require_owner(ctx: Any, request: Any, operation: str) -> Any | None:
    """``None`` when the caller is the dashboard owner, else the refusal to return.

    *operation* is bare (``"delete"``): the host prefixes the app name when it
    audits a denial. A gateway without the seam refuses everyone.
    """
    gate = getattr(ctx, "require_owner", None)
    if not callable(gate):
        from aiohttp import web

        return web.json_response(
            {"error": "owner authorization required", "code": "owner_only"}, status=403
        )
    return await gate(request, operation)


# ── outbound redaction ──────────────────────────────────────────────────────


def redact(text: str) -> str:
    """*text* through the gateway's active redaction policy.

    :data:`WITHHELD` when the text cannot be scanned: no context is bound, it
    has no scrubber, or the scrubber raised (a host whose companion policy could
    not compose raises on purpose, and the answer to that is not to keep the
    text unscanned).
    """
    scrub = getattr(bound(), "scrub", None)
    outbound = getattr(scrub, "outbound", None)
    if not callable(outbound):
        return WITHHELD
    try:
        result = outbound(text)
    except Exception:  # noqa: BLE001 - fail closed: withhold, never keep unscanned
        logger.warning("meetings: redaction failed; text withheld")
        return WITHHELD
    cleaned = getattr(result, "text", None)
    return cleaned if isinstance(cleaned, str) else WITHHELD


def redaction_available_on(ctx: Any) -> bool:
    scrub = getattr(ctx, "scrub", None)
    return callable(getattr(scrub, "outbound", None))


# ── audit ───────────────────────────────────────────────────────────────────

_PREFIX = f"{APP_NAME}."


def audit(operation: str, resource: str = "", *, outcome: str, error: str = "") -> None:
    """One security-event row through ``ctx.audit``. Never raises.

    The built-in named its operations ``meetings.<verb>``; the audit seam
    prefixes the app name itself, so the prefix is taken off here and the row
    reads exactly as before. Both free-text fields are redacted, then truncated
    (truncating first could cut a credential in half so neither part matches).
    """
    verb = operation[len(_PREFIX) :] if operation.startswith(_PREFIX) else operation
    sink = getattr(bound(), "audit", None)
    record = getattr(sink, "record", None)
    if not callable(record):
        logger.info("meetings: %s %s (no audit sink)", verb, outcome)
        return
    try:
        record(
            verb,
            outcome,
            resources=redact(resource)[:200] if resource else "",
            error=redact(error)[:200] if error else "",
        )
    except Exception:  # noqa: BLE001 - auditing must never break the operation
        logger.debug("meetings: audit emit failed", exc_info=True)


# ── agent turns ─────────────────────────────────────────────────────────────

#: The methods of ``ctx.turns`` Meetings calls.
_TURN_METHODS = ("run", "run_oneshot", "has_session")


def turns_of(ctx: Any) -> Any | None:
    """*ctx*'s agent-turn seam (``ctx.turns``), or ``None`` when it has none.

    ``None`` on a host below App Kit level 2, and on a level-2 host when the
    manifest's ``permissions.agentTurns`` was not granted. Meetings then starts
    no agent session and runs no translation, the built-in's own behaviour on a
    gateway without a session manager.
    """
    turns = getattr(ctx, "turns", None)
    if turns is None or any(not callable(getattr(turns, name, None)) for name in _TURN_METHODS):
        return None
    return turns


def turns() -> Any | None:
    """The bound context's agent-turn seam (:func:`turns_of`)."""
    return turns_of(bound())


#: The part of a session key after ``meetings-`` that ``ctx.turns`` accepts:
#: 1 to 400 of ``A-Z a-z 0-9 . _ -`` (App Kit ``api-reference.md``, "Agent turns").
_TURN_KEY_ID_RE = re.compile(r"[A-Za-z0-9._-]{1,400}")


def is_turn_key(key: str) -> bool:
    """Whether *key* is a session key ``ctx.turns`` accepts for this app.

    The host refuses any other key with ``ValueError`` before anything runs, so a
    key this answers wrongly for fails closed: the turn is refused, never run on
    a session outside this app's prefix.
    """
    prefix = f"{APP_NAME}-"
    return key.startswith(prefix) and _TURN_KEY_ID_RE.fullmatch(key[len(prefix) :]) is not None


# ── untrusted text ──────────────────────────────────────────────────────────

#: The methods of ``ctx.untrusted`` Meetings calls.
_UNTRUSTED_METHODS = ("flagged", "neutralize", "fence", "fence_markers", "record_dropped")

#: Stand-ins for the gateway's untrusted-calendar fence markers. Used only when
#: the gateway has no untrusted-text seam, which also means every field inside
#: the fence is already withheld.
_FENCE_OPEN = "<<<UNTRUSTED_CALENDAR_EVENT"
_FENCE_CLOSE = ">>>END_UNTRUSTED_CALENDAR_EVENT"


def untrusted_of(ctx: Any) -> Any | None:
    """*ctx*'s untrusted-text seam (``ctx.untrusted``), or ``None`` below level 2."""
    seam = getattr(ctx, "untrusted", None)
    if seam is None or any(not callable(getattr(seam, name, None)) for name in _UNTRUSTED_METHODS):
        return None
    return seam


def untrusted_calendar_fence() -> tuple[str, str]:
    """The gateway's (open, close) markers for untrusted calendar data."""
    seam = untrusted_of(bound())
    if seam is not None:
        try:
            opening, closing = seam.fence_markers("calendar")
        except Exception:  # noqa: BLE001 - fall back to the literal markers
            logger.warning("meetings: the host's calendar fence markers are unavailable")
        else:
            if isinstance(opening, str) and isinstance(closing, str) and opening and closing:
                return opening, closing
    return _FENCE_OPEN, _FENCE_CLOSE


def contains_injection(text: str) -> bool:
    """The gateway's prompt-injection screen. ``True`` (withhold) when it has none."""
    seam = untrusted_of(bound())
    if seam is None:
        return True
    try:
        return bool(seam.flagged(text))
    except Exception:  # noqa: BLE001 - fail closed: an unscreened field is withheld
        logger.warning("meetings: the injection screen failed; field withheld")
        return True


def neutralize_untrusted_text(text: str) -> str:
    """*text* with fence and prompt-boundary markers neutralized.

    :data:`WITHHELD` on a gateway without the neutralizer, or when it fails, so no
    unneutralized text is placed inside a fence.
    """
    seam = untrusted_of(bound())
    if seam is None:
        return WITHHELD
    try:
        result = seam.neutralize(text)
    except Exception:  # noqa: BLE001 - fail closed: withhold, never fence it raw
        logger.warning("meetings: the neutralizer failed; field withheld")
        return WITHHELD
    return result if isinstance(result, str) else WITHHELD


def fence_untrusted_calendar(body: str) -> str:
    """*body*, neutralized, between the gateway's calendar fence markers, one per line.

    :data:`WITHHELD` between the markers when the gateway has no seam or its
    fence fails, so nothing unneutralized is ever fenced.
    """
    seam = untrusted_of(bound())
    if seam is not None:
        try:
            fenced = seam.fence(body, kind="calendar")
        except Exception:  # noqa: BLE001 - fall through to the withheld fence
            logger.warning("meetings: the calendar fence failed; its body withheld")
        else:
            if isinstance(fenced, str):
                return fenced
    opening, closing = untrusted_calendar_fence()
    return f"{opening}\n{WITHHELD}\n{closing}"


def record_injection_dropped(surface: str, *, session_key: str = "", sample: str = "") -> None:
    """Record that a field was withheld by the injection screen. Never raises.

    Through ``ctx.untrusted.record_dropped``, which logs it as surface
    ``meetings_<surface>`` with agent ``meetings``, as the built-in did. Without
    the seam (or when it fails), one ``ctx.audit`` row that names the surface and
    the meeting, without the sample.
    """
    seam = untrusted_of(bound())
    if seam is not None:
        try:
            seam.record_dropped(surface, session_key=session_key, sample=sample)
            return
        except Exception:  # noqa: BLE001 - auditing must never break the operation
            logger.debug("meetings: injection audit failed", exc_info=True)
    audit("injection_dropped", f"{APP_NAME}_{surface} {session_key}", outcome="dropped")


# ── files the user names ────────────────────────────────────────────────────


def _error_class(name: str) -> tuple[type[BaseException], ...]:
    """The backend SDK's exception class *name*, as an ``except`` tuple (empty without it)."""
    err = _backend_sdk_attr(name)
    return (err,) if isinstance(err, type) and issubclass(err, BaseException) else ()


def validate_file_path(raw_path: str) -> str | None:
    """The gateway's file path gate: the canonical path, or ``None`` (denied).

    The backend SDK's ``canonical_file_path`` (App Kit level 14), the gate the
    gateway's own file surfaces ask. ``None`` on a gateway without it: every path
    is denied.
    """
    impl = _backend_sdk_attr("canonical_file_path")
    if not callable(impl):
        return None
    result = impl(raw_path)
    return result if isinstance(result, str) else None


def read_bytes_nofollow(path: str) -> bytes | None:
    """The gateway's gated, link-refusing file read. ``None`` (unreadable) without it.

    The backend SDK's ``read_bytes_nofollow`` (App Kit level 7): the path gate on
    the canonical target, then an open that refuses a link at the final component,
    a hardlinked or non-regular file, and a descriptor that no longer matches the
    checked name.
    """
    impl = _backend_sdk_attr("read_bytes_nofollow")
    if not callable(impl):
        return None
    result = impl(path)
    return result if isinstance(result, bytes) else None


class PinnedPathRefusal(OSError):
    """A pinned walk refused a path (also raised for the host's own type)."""


def supports_pinned_walk() -> bool:
    """Whether the gateway can open a user-named path race-free. ``False`` without it."""
    impl = _backend_sdk_attr("supports_pinned_walk")
    return bool(impl()) if callable(impl) else False


def is_reparse_point(path: str) -> bool:
    """Whether *path* is a link or junction, per the gateway. ``True`` (refuse) without it."""
    impl = _backend_sdk_attr("is_reparse_point")
    return bool(impl(path)) if callable(impl) else True


def pin_parent(path: str, *, what: str) -> int:
    """A descriptor for *path* opened one ``O_NOFOLLOW`` component at a time.

    Raises :class:`PinnedPathRefusal` for a refused path, and on a gateway
    without the pinned walk.
    """
    impl = _backend_sdk_attr("pin_parent")
    if not callable(impl):
        raise PinnedPathRefusal("this Kiro Crew has no pinned path walk")
    try:
        return int(impl(path, what=what))
    except _error_class("PinnedPathRefusal") as exc:
        raise PinnedPathRefusal(str(exc)) from exc


def copy_file_pinned(src: str, dst: str, **kwargs: Any) -> Any:
    """The gateway's descriptor-pinned file copy.

    Raises :class:`PinnedPathRefusal` on a gateway without it: nothing is copied
    by name in its place.
    """
    impl = _backend_sdk_attr("copy_file_pinned")
    if not callable(impl):
        raise PinnedPathRefusal("this Kiro Crew has no pinned file copy")
    try:
        return impl(src, dst, **kwargs)
    except _error_class("PinnedPathRefusal") as exc:
        raise PinnedPathRefusal(str(exc)) from exc


def prime_voice_runtime_sandbox_paths() -> str:
    """The agent-denied voice-runtime root the gateway stages decoder input under.

    Raises ``OSError`` on a gateway without it: a recording is never staged
    where an agent could rewrite it.
    """
    impl = _host_attr("kiro_crew.sandbox", "prime_voice_runtime_sandbox_paths")
    if not callable(impl):
        raise OSError("this Kiro Crew has no voice-runtime staging root")
    return str(impl())


def transcribe_module() -> Any | None:
    """The gateway's batch speech-to-text module, or ``None``.

    Looked up when an import runs, never at load: the speech-to-text stack pulls
    optional heavy dependencies a gateway must not import at startup. ``None``
    makes the import route answer 503 ``transcription_unavailable``.
    """
    module = _host_module("kiro_crew.transcribe")
    needed = (
        "is_available",
        "load_stt_config",
        "transcribe_audio",
        "audio_exceeds_secs",
        "batch_duration_cap_secs",
        "provider_splits_oversized",
        "transcribe_oversized_in_segments",
    )
    if module is None or any(not callable(getattr(module, name, None)) for name in needed):
        return None
    return module


# ── calendar URLs ───────────────────────────────────────────────────────────


class UrlRejected(Exception):
    """The public-address check refused a URL. ``code`` is the gateway's reason."""

    def __init__(self, code: str = "blocked_url") -> None:
        super().__init__(code)
        self.code = code


def vet_public_url(url: str) -> Any:
    """The gateway's public-address (SSRF) check for an outbound URL.

    The backend SDK's ``vet_public_url`` (App Kit level 14): every address the name
    resolves to must be public, and the result's ``addresses`` are the ones it
    approved, for the caller to pin its connection to. It opens no connection.
    Raises :class:`UrlRejected` for a refused URL, and on a gateway without the
    check (every URL is refused). Blocking: it resolves the name once.
    """
    impl = _backend_sdk_attr("vet_public_url")
    errors = _error_class("UrlRejectedError")
    if not callable(impl) or not errors:
        raise UrlRejected("blocked_url")
    try:
        return impl(url)
    except errors as exc:
        raise UrlRejected(str(getattr(exc, "code", "") or "blocked_url")) from exc


# ── pasted pictures ─────────────────────────────────────────────────────────


def sniff_raster_mime(data: bytes) -> str | None:
    """The raster type *data* starts with, per the gateway's own sniffer.

    The backend SDK's ``sniff_raster_mime`` (App Kit level 14), which decides from
    the leading bytes alone. *data* is the whole blob: the sniffer needs at least
    its ``RASTER_SNIFF_BYTES`` leading bytes and a longer buffer answers the same,
    so no window is copied here. ``None`` (not a picture) on a gateway without it,
    so nothing is stored as an image on an unverified signature.
    """
    impl = _backend_sdk_attr("sniff_raster_mime")
    if not callable(impl):
        return None
    found = impl(data)
    return found if isinstance(found, str) else None
