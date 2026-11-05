"""Every place Meetings reaches into the Kiro Crew gateway, in one module.

An external app's Python runs inside the gateway process. Meetings needs two
kinds of host surface:

1. **The App Kit context** handed to its hooks (``ctx``): the data directory,
   the owner gate (``ctx.require_owner``), the security event log
   (``ctx.audit``) and outbound redaction (``ctx.scrub``). These are public
   seams; each is read off the context with ``getattr`` and has a fallback that
   is never MORE permissive than the host: no owner gate refuses everyone, no
   scrubber withholds the text, no audit sink logs locally.

2. **Gateway functions that have no App Kit seam yet.** Meetings runs its
   agents' turns on the gateway's own session manager, through its tool gate
   and its fair-admission gate; it screens calendar text for prompt injection
   and fences it as untrusted; it vets a calendar URL against the SSRF rule;
   it reads a user-chosen recording through the shared file gate and the
   descriptor-pinned copy, stages it under the agent-denied voice-runtime
   root, and transcribes it with the gateway's speech-to-text. Copying any of
   those into this repository would leave a control that looks present and
   drifts from the one the gateway enforces, so each is looked up in the
   running gateway, and only here (``tests/test_no_host_imports.py`` pins
   that). Every lookup is lazy, at call time, through :func:`_host_attr`; when
   the gateway does not provide one, the operation that needs it is REFUSED (no
   agent turn runs, a calendar field is withheld, no URL is fetched, no file is
   read, nothing is transcribed), never run without it. ``PORTING.md`` lists
   each one as a gap.

The small helpers that carry no security decision are restated in
``_compat.py`` and ``_fs.py``.
"""

from __future__ import annotations

import importlib
import logging
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable

logger = logging.getLogger("kirocrew.app.meetings")

APP_NAME = "meetings"

#: The App Kit seam level this app is written against.
REQUIRED_SDK_LEVEL = 1

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


#: The gateway functions each capability needs, for the health report.
_CAPABILITIES: tuple[tuple[str, tuple[tuple[str, str], ...]], ...] = (
    (
        "no agent or translation turn runs: this Kiro Crew has no in-process agent turn",
        (("kiro_crew.llm_helpers", "stream_and_collect"),),
    ),
    (
        "no agent or translation turn runs: this Kiro Crew has no turn admission gate",
        (("kiro_crew.shared_crew.turn_gate", "run_admitted_or_raise"),),
    ),
    (
        "calendar text is withheld from the agents: this Kiro Crew has no injection screen",
        (
            ("kiro_crew.security", "contains_injection"),
            ("kiro_crew.context", "neutralize_untrusted_text"),
        ),
    ),
    (
        "calendar URLs are refused: this Kiro Crew has no SSRF address check",
        (("kiro_crew.link_unfurl", "vet_unfurl_url"),),
    ),
    (
        "local calendar files are refused: this Kiro Crew has no shared file reader",
        (("kiro_crew.hooks", "safe_read_file_bytes"),),
    ),
    (
        "recordings cannot be imported: this Kiro Crew has no file gate, pinned copy "
        "or speech-to-text for apps",
        (
            ("kiro_crew.hooks", "validate_file_path"),
            ("kiro_crew.pinned_fs", "copy_file_pinned"),
            ("kiro_crew.sandbox", "prime_voice_runtime_sandbox_paths"),
            ("kiro_crew.transcribe", "transcribe_audio"),
        ),
    ),
    (
        "pasted pictures are refused: this Kiro Crew has no raster sniffer",
        (("kiro_crew.messaging.raster", "sniff_raster_mime"),),
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
    for issue, names in _CAPABILITIES:
        if issue in issues:
            continue
        if any(not callable(_host_attr(module, name)) for module, name in names):
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


def audit_injection_dropped(
    *, surface: str, session_key: str = "", agent: str = APP_NAME, sample: str = ""
) -> None:
    """Record that a field was withheld by the injection screen.

    The gateway's own recorder when it has one (it is what every other
    injection drop is logged through); otherwise one ``ctx.audit`` row that names
    the surface and the meeting, without the sample.
    """
    impl = _host_attr("kiro_crew.security", "audit_injection_dropped")
    if callable(impl):
        try:
            impl(surface=surface, session_key=session_key, agent=agent, sample=sample)
            return
        except Exception:  # noqa: BLE001 - auditing must never break the operation
            logger.debug("meetings: injection audit failed", exc_info=True)
    audit("injection_dropped", f"{surface} {session_key}", outcome="dropped")


# ── agent turns ─────────────────────────────────────────────────────────────


class ToolApprovalPolicy:
    """The gateway's tool-approval policies this app asks for, by name.

    Resolved onto the gateway's own ``ToolApprovalPolicy`` member of the same
    name when a turn runs.
    """

    HOOK_BASED = "HOOK_BASED"
    REJECT_ALL = "REJECT_ALL"


class OperationKind:
    """The gateway's admission operation kinds this app uses, by name."""

    BACKGROUND = "BACKGROUND"


class HostUnavailable(RuntimeError):
    """The running gateway does not provide what this work needs; nothing ran."""


def _host_enum(module: str, enum_name: str, member: str) -> Any:
    enum = _host_attr(module, enum_name)
    value = getattr(enum, member, None) if enum is not None else None
    if value is None:
        raise HostUnavailable(f"this Kiro Crew has no {enum_name}.{member}")
    return value


async def stream_and_collect(
    provider: Any, text: str, *, approval_policy: str, **kwargs: Any
) -> Any:
    """One agent turn through the gateway's own streaming helper and tool gate.

    *approval_policy* is a :class:`ToolApprovalPolicy` name. Raises
    :class:`HostUnavailable` (no turn runs) on a gateway without the helper or
    the policy: a turn whose tool calls skip the gate is not run in its place.
    """
    impl = _host_attr("kiro_crew.llm_helpers", "stream_and_collect")
    if not callable(impl):
        raise HostUnavailable("this Kiro Crew has no in-process agent turn")
    policy = _host_enum("kiro_crew.llm_helpers", "ToolApprovalPolicy", str(approval_policy))
    return await impl(provider, text, approval_policy=policy, **kwargs)


async def run_admitted_or_raise(turn: Awaitable[Any], *, operation: str, **kwargs: Any) -> Any:
    """Run *turn* through the gateway's fair-admission gate.

    *operation* is an :class:`OperationKind` name. On a gateway without the gate
    the turn is closed unrun and :class:`HostUnavailable` is raised: an
    unadmitted turn is not run in its place.
    """
    impl = _host_attr("kiro_crew.shared_crew.turn_gate", "run_admitted_or_raise")
    try:
        if not callable(impl):
            raise HostUnavailable("this Kiro Crew has no turn admission gate")
        kind = _host_enum("kiro_crew.shared_crew.admission", "OperationKind", str(operation))
    except HostUnavailable:
        close = getattr(turn, "close", None)
        if callable(close):
            close()
        raise
    return await impl(turn, operation=kind, **kwargs)


# ── untrusted text ──────────────────────────────────────────────────────────

#: Stand-ins for the gateway's untrusted-calendar fence markers. Used only when
#: the gateway has none, which also means it has no injection screen, so every
#: field inside the fence is already withheld.
_FENCE_OPEN = "<<<UNTRUSTED_CALENDAR_EVENT"
_FENCE_CLOSE = ">>>END_UNTRUSTED_CALENDAR_EVENT"


def untrusted_calendar_fence() -> tuple[str, str]:
    """The gateway's (open, close) markers for untrusted calendar data."""
    opening = _host_attr("kiro_crew.context", "UNTRUSTED_CALENDAR_FENCE_OPEN")
    closing = _host_attr("kiro_crew.context", "UNTRUSTED_CALENDAR_FENCE_CLOSE")
    if isinstance(opening, str) and isinstance(closing, str) and opening and closing:
        return opening, closing
    return _FENCE_OPEN, _FENCE_CLOSE


def contains_injection(text: str) -> bool:
    """The gateway's prompt-injection screen. ``True`` (withhold) when it has none."""
    impl = _host_attr("kiro_crew.security", "contains_injection")
    if not callable(impl):
        return True
    return bool(impl(text))


def neutralize_untrusted_text(text: str) -> str:
    """*text* with fence and prompt-boundary markers neutralized.

    :data:`WITHHELD` on a gateway without the neutralizer, so no unneutralized
    text is placed inside a fence.
    """
    impl = _host_attr("kiro_crew.context", "neutralize_untrusted_text")
    if not callable(impl):
        return WITHHELD
    result = impl(text)
    return result if isinstance(result, str) else WITHHELD


# ── files the user names ────────────────────────────────────────────────────


def validate_file_path(raw_path: str) -> str | None:
    """The gateway's shared file gate: the canonical path, or ``None`` (denied).

    ``None`` on a gateway without it: every path is denied.
    """
    impl = _host_attr("kiro_crew.hooks", "validate_file_path")
    if not callable(impl):
        return None
    result = impl(raw_path)
    return result if isinstance(result, str) else None


def safe_read_file_bytes(path: str) -> bytes | None:
    """The gateway's gated, link-refusing file read. ``None`` (unreadable) without it."""
    impl = _host_attr("kiro_crew.hooks", "safe_read_file_bytes")
    if not callable(impl):
        return None
    result = impl(path)
    return result if isinstance(result, bytes) else None


class PinnedPathRefusal(OSError):
    """A pinned walk refused a path (also raised for the host's own type)."""


def _host_pinned_refusal() -> tuple[type[BaseException], ...]:
    err = _host_attr("kiro_crew.pinned_fs", "PinnedPathRefusal")
    return (err,) if isinstance(err, type) and issubclass(err, BaseException) else ()


def supports_pinned_walk() -> bool:
    """Whether the gateway can open a user-named path race-free. ``False`` without it."""
    impl = _host_attr("kiro_crew.pinned_fs", "supports_pinned_walk")
    return bool(impl()) if callable(impl) else False


def is_reparse_point(path: str) -> bool:
    """Whether *path* is a link or junction, per the gateway. ``True`` (refuse) without it."""
    impl = _host_attr("kiro_crew.pinned_fs", "is_reparse_point")
    return bool(impl(path)) if callable(impl) else True


def pin_parent(path: str, *, what: str) -> int:
    """A descriptor for *path* opened one ``O_NOFOLLOW`` component at a time.

    Raises :class:`PinnedPathRefusal` for a refused path, and on a gateway
    without the pinned walk.
    """
    impl = _host_attr("kiro_crew.pinned_fs", "pin_parent")
    if not callable(impl):
        raise PinnedPathRefusal("this Kiro Crew has no pinned path walk")
    try:
        return int(impl(path, what=what))
    except _host_pinned_refusal() as exc:
        raise PinnedPathRefusal(str(exc)) from exc


def copy_file_pinned(src: str, dst: str, **kwargs: Any) -> Any:
    """The gateway's descriptor-pinned file copy.

    Raises :class:`PinnedPathRefusal` on a gateway without it: nothing is copied
    by name in its place.
    """
    impl = _host_attr("kiro_crew.pinned_fs", "copy_file_pinned")
    if not callable(impl):
        raise PinnedPathRefusal("this Kiro Crew has no pinned file copy")
    try:
        return impl(src, dst, **kwargs)
    except _host_pinned_refusal() as exc:
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


class UnfurlRejected(Exception):
    """The SSRF address check refused a URL. ``code`` is the gateway's reason."""

    def __init__(self, code: str = "blocked_url") -> None:
        super().__init__(code)
        self.code = code


def vet_unfurl_url(url: str, **kwargs: Any) -> Any:
    """The gateway's SSRF address check for an outbound URL.

    Raises :class:`UnfurlRejected` for a refused URL, and on a gateway without
    the check (every URL is refused).
    """
    impl = _host_attr("kiro_crew.link_unfurl", "vet_unfurl_url")
    if not callable(impl):
        raise UnfurlRejected("blocked_url")
    host_err = _host_attr("kiro_crew.link_unfurl", "UnfurlRejected")
    errors: tuple[type[BaseException], ...] = (
        (host_err,) if isinstance(host_err, type) and issubclass(host_err, BaseException) else ()
    )
    try:
        return impl(url, **kwargs)
    except errors as exc:
        raise UnfurlRejected(str(getattr(exc, "code", "") or "blocked_url")) from exc


# ── pasted pictures ─────────────────────────────────────────────────────────

#: Leading bytes :func:`sniff_raster_mime` needs, the gateway's own value.
SNIFF_BYTES = 16


def sniff_raster_mime(head: bytes) -> str | None:
    """The raster type *head* starts with, per the gateway's shared sniffer.

    ``None`` (not a picture) on a gateway without it, so nothing is stored as an
    image on an unverified signature.
    """
    impl = _host_attr("kiro_crew.messaging.raster", "sniff_raster_mime")
    if not callable(impl):
        return None
    found = impl(head)
    return found if isinstance(found, str) else None


# ── executor ────────────────────────────────────────────────────────────────


def subprocess_executor() -> Any:
    """The gateway's bounded pool for blocking file and network work.

    ``None`` (the loop's default pool) on a gateway without one.
    """
    impl = _host_attr("kiro_crew.executors", "subprocess_executor")
    return impl() if callable(impl) else None
