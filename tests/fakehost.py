"""A stand-in for the Kiro Crew gateway, so the tests need no Kiro Crew install.

``backend/_host.py`` resolves the gateway functions that have no App Kit seam
through two lookups, ``_host._host_attr(module, name)`` and
``_host._host_module(module)``. :class:`FakeHost` answers both from a table of
small, offline implementations; a test that needs a different gateway (one
without the SSRF vet, one without the pinned walk) edits the table through the
``fake_host`` fixture.

These fakes stand in for the gateway's controls, they do not re-implement all of
them: the injection screen carries the gateway's pattern list, the neutralizer
knows the fence and boundary markers these tests write, the SSRF vet applies the
public-address rule with the stdlib, the file gate refuses a handful of credential
directories, the pinned copy is a POSIX ``openat`` walk. What the tests check is
that Meetings routes every agent turn, screen, URL, file and served text through
the gateway and refuses when the gateway does. The controls themselves are tested
in Kiro Crew; PORTING.md records the run of this suite against the real ones.

:class:`FakeCtx` is the ``AppContext`` the gateway hands the hooks at App Kit
level 2, with the fields Meetings reads: its agent turns (:class:`FakeAgentTurns`)
and untrusted-text controls (:class:`FakeUntrusted`) included.
"""

from __future__ import annotations

import asyncio
import ipaddress
import os
import re
import socket
import stat
import tempfile
import types
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlsplit

from aiohttp import web

APP_NAME = "meetings"

# ── redaction ───────────────────────────────────────────────────────────────

REDACTED_CREDENTIAL_TAG = "[REDACTED: credential]"

#: The credential shapes the gateway's redactor recognises that these tests use.
_CREDENTIAL_RE = re.compile(
    r"(?:AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}"
    r"|(?:gh[opsur]_)[A-Za-z0-9]{36}"
    r"|github_pat_[A-Za-z0-9_]{22,}"
    r"|xox[bpas]-[A-Za-z0-9-]{10,}"
    r"|sk-ant-[A-Za-z0-9_-]{20,}"
    r"|-----BEGIN [A-Z ]*PRIVATE KEY-----"
)


#: The bare-secret heuristic: a run of 40 base64-alphabet characters mixing case
#: and digits reads as a raw secret key (an AWS secret access key is exactly 40).
_BARE_RUN_RE = re.compile(r"(?<![A-Za-z0-9+/])[A-Za-z0-9+/]{40}(?![A-Za-z0-9+/])")


def _looks_bare_secret(run: str) -> bool:
    return (
        any(c.islower() for c in run)
        and any(c.isupper() for c in run)
        and any(c.isdigit() for c in run)
    )


def fake_redact(text: str) -> str:
    out = _CREDENTIAL_RE.sub(REDACTED_CREDENTIAL_TAG, text)
    return _BARE_RUN_RE.sub(
        lambda m: REDACTED_CREDENTIAL_TAG if _looks_bare_secret(m.group(0)) else m.group(0), out
    )


# ── agent turns ─────────────────────────────────────────────────────────────

#: What a turn with no agent starts as: the host resolves ``""`` to the default
#: template's name before the session opens.
DEFAULT_AGENT = "host-default"
#: The tool-less agent a one-shot turn runs on.
ONESHOT_AGENT = "kirocrew-lite"

_KEY_ID_RE = re.compile(r"[A-Za-z0-9._-]{1,400}")
_ONESHOT_LABEL_RE = re.compile(r"[a-z0-9][a-z0-9_-]{0,31}")


def _chunk_text(event: Any) -> str:
    if isinstance(event, str):
        return event
    if isinstance(event, dict):
        value = event.get("text") or event.get("content") or ""
        return value if isinstance(value, str) else ""
    value = getattr(event, "text", "") or getattr(event, "content", "")
    return value if isinstance(value, str) else ""


class FakeAgentTurns:
    """``ctx.turns`` (App Kit level 2) over a session manager, as the host runs it.

    The host's ``AgentTurnSDK`` minus the parts that need a live gateway (the
    spawn ceiling, the hook gate's decisions, fair admission), which are recorded
    instead: every turn's key, agent, approval policy and admission. The session
    handling is the host's: the key check, acquisition outside the budget, cancel
    then reset past it or on the caller's cancellation, the turn lease released
    and the session kept (``run``) or destroyed (``run_oneshot``).
    """

    def __init__(self, manager: Any, app: str = APP_NAME) -> None:
        self.manager = manager
        self.app = app
        self.runs: list[dict[str, Any]] = []
        self.oneshots: list[dict[str, Any]] = []
        #: Set to a ``BaseException`` to make the host refuse every turn before it runs.
        self.refuse: BaseException | None = None

    def check_key(self, key: object) -> str:
        prefix = f"{self.app}-"
        if isinstance(key, str) and key.startswith(prefix) and _KEY_ID_RE.fullmatch(key[len(prefix) :]):
            return key
        raise ValueError(f"session key {key!r} is not a {self.app!r} key ({prefix}<id>)")

    def _manager(self) -> Any:
        if self.manager is None:
            raise RuntimeError("session manager unavailable")
        return self.manager

    def has_session(self, key: str) -> bool:
        return bool(self.manager is not None and self.manager.has_session(self.check_key(key)))

    async def _collect(self, provider: Any, text: str) -> str:
        parts: list[str] = []
        async for event in provider.stream(text):
            parts.append(_chunk_text(event))
        return "".join(parts)

    async def _cancel_or_reset(self, provider: Any, key: str, cancel_ack_secs: float) -> None:
        outcome = "error"
        try:
            outcome = await provider.cancel(wait_ack_timeout=cancel_ack_secs)
        except Exception:  # noqa: BLE001 - the host logs and resets
            pass
        if outcome != "acked":
            try:
                await self.manager.reset(key)
            except Exception:  # noqa: BLE001 - the host logs it
                pass

    async def run(
        self,
        key: str,
        text: str,
        *,
        agent: str = "",
        timeout_secs: float | None = None,
        cancel_ack_secs: float = 5.0,
    ) -> str:
        key = self.check_key(key)
        sessions = self._manager()
        if self.refuse is not None:
            raise self.refuse
        asked = agent or DEFAULT_AGENT
        provider, _is_new, _resumed = await sessions.get_or_create(key, agent=asked)
        self.runs.append(
            {
                "key": key,
                "agent": asked,
                "text": text,
                "timeout_secs": timeout_secs,
                "cancel_ack_secs": cancel_ack_secs,
                "approval_policy": "HOOK_BASED",
                "app": self.app,
                "admission": "BACKGROUND",
            }
        )
        turn_task = asyncio.create_task(self._collect(provider, text))
        try:
            if timeout_secs is None:
                return await asyncio.shield(turn_task)
            return await asyncio.wait_for(asyncio.shield(turn_task), timeout=timeout_secs)
        except asyncio.TimeoutError:
            if timeout_secs is None:
                raise
            await self._cancel_or_reset(provider, key, cancel_ack_secs)
            raise asyncio.TimeoutError(f"agent turn exceeded {timeout_secs:.0f}s") from None
        except asyncio.CancelledError:
            await self._cancel_or_reset(provider, key, cancel_ack_secs)
            raise
        finally:
            if not turn_task.done():
                turn_task.cancel()
            await asyncio.gather(turn_task, return_exceptions=True)
            try:
                sessions.release(key)
            except Exception:  # noqa: BLE001 - the host logs it
                pass

    async def run_oneshot(self, prompt: str, *, label: str = "oneshot") -> str:
        if not isinstance(label, str) or not _ONESHOT_LABEL_RE.fullmatch(label):
            raise ValueError(f"one-shot label {label!r} is not 1-32 of a-z 0-9 _ -")
        key = self.check_key(f"{self.app}-{label}-{uuid.uuid4().hex}")
        sessions = self._manager()
        if self.refuse is not None:
            raise self.refuse
        self.oneshots.append(
            {"key": key, "label": label, "prompt": prompt, "agent": ONESHOT_AGENT,
             "approval_policy": "REJECT_ALL", "admission": "BACKGROUND"}
        )
        try:
            provider, _is_new, _resumed = await sessions.get_or_create(key, agent=ONESHOT_AGENT)
            return await self._collect(provider, prompt)
        finally:
            try:
                sessions.release(key)
            except Exception:  # noqa: BLE001 - the host logs it
                pass
            try:
                await sessions.destroy(key)
            except Exception:  # noqa: BLE001 - the host logs it
                pass


# ── untrusted text ──────────────────────────────────────────────────────────

UNTRUSTED_CALENDAR_FENCE_OPEN = "<<<UNTRUSTED_CALENDAR_EVENT"
UNTRUSTED_CALENDAR_FENCE_CLOSE = ">>>END_UNTRUSTED_CALENDAR_EVENT"

#: The gateway's injection pattern list (``vector_memory_constants``).
_INJECTION_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"ignore\s+(all\s+)?above",
        r"you\s+are\s+now",
        r"new\s+instructions?:",
        r"system\s*prompt",
        r"<\s*system\s*>",
        r"<\s*/?\s*instructions?\s*>",
        r"IMPORTANT:\s*override",
        r"forget\s+(everything|all)",
        r"disregard\s+(all|previous|your)\s+instructions",
        r"(ignore|disregard|forget)\s+(all\s+)?(of\s+)?(the\s+|your\s+)?"
        r"(previous|prior|earlier|preceding|above|foregoing)\s+instructions",
        r"act\s+as\s+if",
        r"pretend\s+you\s+are",
        r"new\s+persona",
        r"no\s+restrictions",
    ]
]


def contains_injection(text: str | None) -> bool:
    if not text:
        return False
    return any(p.search(text) for p in _INJECTION_PATTERNS)


_GAP = r"[\s_\-\u200b\u200c\u200d\u2060\ufeff]*"
_FENCE_RE = re.compile(
    r"(?:<<<|>>>)" + _GAP + r"(?:END" + _GAP + r")?UNTRUSTED" + _GAP
    + r"(?:CALENDAR" + _GAP + r"EVENT|THREAD" + _GAP + r"PARENT)",
    re.IGNORECASE,
)
_STRUCTURAL_RE = re.compile(
    r"\[\s*END OF SESSION CONTEXT\s*\]|\[\s*CURRENT USER REQUEST[^\]]*\]", re.IGNORECASE
)


def neutralize_untrusted_text(text: str) -> str:
    return _STRUCTURAL_RE.sub("[marker-removed]", _FENCE_RE.sub("[fence-marker-removed]", text))


class FakeUntrusted:
    """``ctx.untrusted`` (App Kit level 2), recording every dropped field.

    Built on the screen, neutralizer and markers above; a real-host run hands it
    Kiro Crew's own (``conftest.py``). The recorder writes the host's surface and
    agent names, ``<app>_<surface>`` and ``<app>``, into :attr:`drops`.
    """

    _SURFACE_RE = re.compile(r"[a-z0-9][a-z0-9_]{0,63}")

    def __init__(
        self,
        *,
        flagged: Callable[[str | None], bool] = lambda text: contains_injection(text),
        neutralize: Callable[[str], str] = lambda text: neutralize_untrusted_text(text),
        markers: tuple[str, str] = (UNTRUSTED_CALENDAR_FENCE_OPEN, UNTRUSTED_CALENDAR_FENCE_CLOSE),
        app: str = APP_NAME,
    ) -> None:
        self._flagged = flagged
        self._neutralize = neutralize
        self._markers = markers
        self.app = app
        self.drops: list[dict[str, Any]] = []

    def flagged(self, text: str | None) -> bool:
        return bool(self._flagged(text))

    def neutralize(self, text: str) -> str:
        return self._neutralize(text)

    def fence_markers(self, kind: str = "calendar") -> tuple[str, str]:
        if kind != "calendar":
            raise ValueError(f"unknown untrusted fence kind {kind!r}")
        return self._markers

    def fence(self, body: str, *, kind: str = "calendar") -> str:
        opening, closing = self.fence_markers(kind)
        return f"{opening}\n{self.neutralize(body)}\n{closing}"

    def record_dropped(self, surface: str, *, session_key: str = "", sample: str = "") -> None:
        label = surface if isinstance(surface, str) and self._SURFACE_RE.fullmatch(surface) else "unnamed"
        self.drops.append(
            {
                "surface": f"{self.app}_{label}",
                "session_key": str(session_key)[:256],
                "agent": self.app,
                "sample": str(sample),
            }
        )


# ── files the user names ────────────────────────────────────────────────────

#: Path components the fake's sensitive-path gate refuses wherever they appear.
SENSITIVE_COMPONENTS = frozenset({".ssh", ".aws", ".gnupg", "credentials", ".netrc"})


def is_sensitive_path(path: str) -> bool:
    parts = {p.lower() for p in Path(path).parts}
    return bool(parts & SENSITIVE_COMPONENTS)


def validate_file_path(raw: str) -> str | None:
    """Canonicalize (following links) and refuse a sensitive target."""
    if "\x00" in raw:
        raise ValueError("embedded null byte")
    canonical = os.path.realpath(os.path.expanduser(raw))
    if is_sensitive_path(raw) or is_sensitive_path(canonical):
        return None
    return canonical


def safe_read_file_bytes(raw: str, *, max_bytes: int | None = None) -> bytes | None:
    canonical = validate_file_path(raw)
    if canonical is None:
        return None
    try:
        fd = os.open(canonical, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_BINARY", 0))
    except OSError:
        return None
    try:
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            return None
        chunks = []
        while True:
            chunk = os.read(fd, 65536)
            if not chunk:
                break
            chunks.append(chunk)
        return b"".join(chunks)
    finally:
        os.close(fd)


class PinnedPathRefusal(OSError):
    """The gateway's ``kiro_crew.pinned_fs.PinnedPathRefusal``."""


SKIP_TOO_LARGE = "too_large"
SKIP_IDENTITY_CHANGED = "identity_changed"
SKIP_NOT_REGULAR = "not_regular"
SKIP_LINK = "link"


def supports_pinned_walk() -> bool:
    return hasattr(os, "O_DIRECTORY") and hasattr(os, "O_NOFOLLOW") and os.open in os.supports_dir_fd


def is_reparse_point(path: str | os.PathLike[str]) -> bool:
    if os.path.islink(path):
        return True
    try:
        return bool(getattr(os.lstat(path), "st_reparse_tag", 0))
    except OSError:
        return False


def pin_parent(resolved_parent: str, *, what: str, refusal: type[Exception] = PinnedPathRefusal) -> int:
    """One ``O_NOFOLLOW`` ``openat`` per component; a link anywhere is refused."""
    absolute = os.path.abspath(resolved_parent)
    anchor, *parts = Path(absolute).parts
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    fd = os.open(anchor, os.O_RDONLY | os.O_DIRECTORY)
    try:
        for part in parts:
            try:
                nxt = os.open(part, flags, dir_fd=fd)
            except OSError as exc:
                raise refusal(f"{what}: {part!r} is not a plain directory ({exc.errno})") from None
            os.close(fd)
            fd = nxt
    except BaseException:
        os.close(fd)
        raise
    return fd


def copy_file_pinned(
    by_name: str,
    dst: str | None = None,
    *,
    dir_fd: int | None = None,
    name: str | None = None,
    force_mode: int | None = None,
    max_bytes: int | None = None,
    expected_src_ident: "tuple[int, int] | None" = None,
    on_skip: Callable[[str, str], None] = lambda _r, _p: None,
    on_created: "Callable[[os.stat_result], None] | None" = None,
    **_kw: Any,
) -> bool:
    """Open the source with ``O_NOFOLLOW``, judge the DESCRIPTOR, copy it, publish."""
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_BINARY", 0)
    try:
        src_fd = os.open(name, flags, dir_fd=dir_fd) if dir_fd is not None else os.open(by_name, flags)
    except OSError as exc:
        if exc.errno in (getattr(os, "ELOOP", 40), getattr(os, "EMLINK", 31)):
            on_skip(SKIP_LINK, by_name)
            return False
        raise
    try:
        st = os.fstat(src_fd)
        if not stat.S_ISREG(st.st_mode):
            on_skip(SKIP_NOT_REGULAR, by_name)
            return False
        if expected_src_ident is not None and (st.st_dev, st.st_ino) != tuple(expected_src_ident):
            on_skip(SKIP_IDENTITY_CHANGED, by_name)
            return False
        if max_bytes is not None and st.st_size > max_bytes:
            on_skip(SKIP_TOO_LARGE, by_name)
            return False
        assert dst is not None
        dst_flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_BINARY", 0)
        dst_fd = os.open(dst, dst_flags, force_mode if force_mode is not None else 0o600)
        try:
            written = 0
            while True:
                chunk = os.read(src_fd, 65536)
                if not chunk:
                    break
                written += len(chunk)
                if max_bytes is not None and written > max_bytes:
                    os.ftruncate(dst_fd, 0)
                    on_skip(SKIP_TOO_LARGE, by_name)
                    return False
                os.write(dst_fd, chunk)
            if force_mode is not None and os.name == "posix":
                os.fchmod(dst_fd, force_mode)
            if on_created is not None:
                on_created(os.fstat(dst_fd))
        finally:
            os.close(dst_fd)
        return True
    finally:
        os.close(src_fd)


# ── speech-to-text ──────────────────────────────────────────────────────────


def make_transcribe_module() -> types.ModuleType:
    """The gateway's ``kiro_crew.transcribe``, as a module tests patch functions on.

    Every default is "no speech-to-text": nothing is ever decoded here.
    """
    module = types.ModuleType("kiro_crew.transcribe")

    def is_available(_cfg: Any = None) -> bool:
        return False

    def load_stt_config() -> Any:
        return types.SimpleNamespace(timeout_secs=300)

    async def transcribe_audio(_path: str, _cfg: Any = None) -> str | None:
        return None

    async def audio_exceeds_secs(*_a: Any, **_kw: Any) -> bool:
        return False

    def batch_duration_cap_secs(_cfg: Any = None) -> int | None:
        return None

    def provider_splits_oversized(_cfg: Any) -> bool:
        return False

    async def transcribe_oversized_in_segments(*_a: Any, **_kw: Any) -> Any:
        return None

    for fn in (
        is_available,
        load_stt_config,
        transcribe_audio,
        audio_exceeds_secs,
        batch_duration_cap_secs,
        provider_splits_oversized,
        transcribe_oversized_in_segments,
    ):
        setattr(module, fn.__name__, fn)
    return module


# ── calendar URLs ───────────────────────────────────────────────────────────


class UnfurlRejected(Exception):
    """The gateway's ``kiro_crew.link_unfurl.UnfurlRejected``."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class VettedUrl:
    url: str
    scheme: str
    host: str
    wire_host: str
    port: int
    ip: str


def canonicalize_ip(host: str) -> str:
    """Fold the alternate IPv4 spellings the OS resolver accepts into dotted quads."""
    bare = host.strip("[]")
    try:
        ipaddress.ip_address(bare)
        return bare
    except ValueError:
        pass
    if re.fullmatch(r"[0-9a-fA-FxX.]+", bare):
        try:
            return socket.inet_ntoa(socket.inet_aton(bare))
        except OSError:
            return bare
    return bare


def _not_public(ip: "ipaddress.IPv4Address | ipaddress.IPv6Address") -> bool:
    if isinstance(ip, ipaddress.IPv6Address):
        for embedded in (ip.ipv4_mapped, ip.sixtofour):
            if embedded is not None and _not_public(embedded):
                return True
        if ip in ipaddress.ip_network("fec0::/10"):
            return True
    return not ip.is_global or ip.is_multicast


class FakeLinkUnfurl:
    """The gateway's SSRF vet: scheme, userinfo, port, suffixes, every resolved address."""

    ALLOWED_SCHEMES = frozenset({"http", "https"})
    BLOCKED_HOST_SUFFIXES = (".onion", ".local")

    def __init__(self) -> None:
        self.ALLOWED_PORTS: Any = frozenset({80, 443})

    def _reject_if_internal_ip(self, candidate: str) -> None:
        try:
            ip = ipaddress.ip_address(canonicalize_ip(candidate))
        except ValueError:
            return
        if _not_public(ip):
            raise UnfurlRejected("blocked_url")

    def vet_unfurl_url(self, url: str, *, resolve: Any = None, **_kw: Any) -> VettedUrl:
        try:
            parts = urlsplit(url.strip())
        except ValueError:
            raise UnfurlRejected("invalid_url") from None
        scheme = parts.scheme.lower()
        if scheme not in self.ALLOWED_SCHEMES:
            raise UnfurlRejected("invalid_url")
        host = (parts.hostname or "").strip().rstrip(".").lower()
        if not host or parts.username or parts.password:
            raise UnfurlRejected("invalid_url")
        self._reject_if_internal_ip(host)
        try:
            explicit = parts.port
        except ValueError:
            raise UnfurlRejected("invalid_url") from None
        if explicit is not None and explicit not in self.ALLOWED_PORTS:
            raise UnfurlRejected("blocked_url")
        port = explicit if explicit is not None else (443 if scheme == "https" else 80)
        if host.endswith(self.BLOCKED_HOST_SUFFIXES):
            raise UnfurlRejected("blocked_url")
        literal = canonicalize_ip(host)
        try:
            chosen = str(ipaddress.ip_address(literal))
        except ValueError:
            try:
                addresses = list(resolve(host, port)) if resolve else []
            except (OSError, UnicodeError):
                raise UnfurlRejected("blocked_url") from None
            if not addresses:
                raise UnfurlRejected("blocked_url")
            for address in addresses:
                self._reject_if_internal_ip(address)
            chosen = addresses[0]
        try:
            wire = host.encode("idna").decode("ascii")
        except UnicodeError:
            raise UnfurlRejected("invalid_url") from None
        return VettedUrl(
            url=parts._replace(fragment="").geturl(),
            scheme=scheme,
            host=host,
            wire_host=wire,
            port=port,
            ip=chosen,
        )


# ── pasted pictures ─────────────────────────────────────────────────────────

_MAGIC: dict[str, tuple[bytes, ...]] = {
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/gif": (b"GIF87a", b"GIF89a"),
    "image/webp": (b"RIFF",),
    "image/bmp": (b"BM",),
}


def sniff_raster_mime(head: bytes) -> str | None:
    for mime, prefixes in _MAGIC.items():
        if any(head.startswith(p) for p in prefixes):
            if mime == "image/webp" and head[8:12] != b"WEBP":
                continue
            return mime
    return None


# ── the host table ──────────────────────────────────────────────────────────


class FakeHost:
    """Answers ``_host._host_attr`` / ``_host._host_module`` from :attr:`table`."""

    def __init__(self, voice_root: Path | None = None) -> None:
        self.link_unfurl = FakeLinkUnfurl()
        self.transcribe = make_transcribe_module()
        self.voice_root = voice_root or Path(tempfile.mkdtemp(prefix="kc-voice-"))
        self.table: dict[tuple[str, str], Any] = {
            ("kiro_crew.hooks", "validate_file_path"): validate_file_path,
            ("kiro_crew.hooks", "safe_read_file_bytes"): safe_read_file_bytes,
            ("kiro_crew.pinned_fs", "supports_pinned_walk"): supports_pinned_walk,
            ("kiro_crew.pinned_fs", "is_reparse_point"): is_reparse_point,
            ("kiro_crew.pinned_fs", "pin_parent"): pin_parent,
            ("kiro_crew.pinned_fs", "copy_file_pinned"): copy_file_pinned,
            ("kiro_crew.pinned_fs", "PinnedPathRefusal"): PinnedPathRefusal,
            ("kiro_crew.sandbox", "prime_voice_runtime_sandbox_paths"): self._voice_root,
            ("kiro_crew.transcribe", "transcribe_audio"): (
                lambda *a, **kw: self.transcribe.transcribe_audio(*a, **kw)
            ),
            ("kiro_crew.link_unfurl", "vet_unfurl_url"): (
                lambda *a, **kw: self.link_unfurl.vet_unfurl_url(*a, **kw)
            ),
            ("kiro_crew.link_unfurl", "UnfurlRejected"): UnfurlRejected,
            ("kiro_crew.messaging.raster", "sniff_raster_mime"): sniff_raster_mime,
            ("kiro_crew.executors", "subprocess_executor"): lambda: None,
        }
        self.modules: dict[str, Any] = {"kiro_crew.transcribe": self.transcribe}

    #: The controls a real-host run takes from Kiro Crew instead of this file
    #: (``MEETINGS_REAL_HOST=1``, see ``conftest.py``; the untrusted-text screen,
    #: neutralizer and markers are handed to ``ctx.untrusted`` there).
    REAL_CONTROLS = (
        ("kiro_crew.hooks", "validate_file_path"),
        ("kiro_crew.hooks", "safe_read_file_bytes"),
        ("kiro_crew.pinned_fs", "supports_pinned_walk"),
        ("kiro_crew.pinned_fs", "is_reparse_point"),
        ("kiro_crew.pinned_fs", "pin_parent"),
        ("kiro_crew.pinned_fs", "copy_file_pinned"),
        ("kiro_crew.pinned_fs", "PinnedPathRefusal"),
        ("kiro_crew.link_unfurl", "vet_unfurl_url"),
        ("kiro_crew.link_unfurl", "UnfurlRejected"),
        ("kiro_crew.messaging.raster", "sniff_raster_mime"),
    )

    def use_real_controls(self) -> None:
        """Answer the security controls from the Kiro Crew on ``sys.path``."""
        import importlib

        for module, name in self.REAL_CONTROLS:
            self.table[(module, name)] = getattr(importlib.import_module(module), name)

    def _voice_root(self) -> str:
        self.voice_root.mkdir(parents=True, exist_ok=True)
        return str(self.voice_root)

    def attr(self, module: str, name: str) -> Any | None:
        return self.table.get((module, name))

    def module(self, module: str) -> Any | None:
        return self.modules.get(module)

    def remove(self, module: str, name: str) -> None:
        self.table.pop((module, name), None)
        if name == "" or module in self.modules and name == "*":
            self.modules.pop(module, None)


# ── the app context ─────────────────────────────────────────────────────────


@dataclass
class ScrubResult:
    text: str
    credentials_removed: int = 0
    urls_removed: int = 0
    redacted: bool = False


class FakeScrub:
    """``ctx.scrub``: redacts the credential shapes the tests use; ``raises`` fails it."""

    def __init__(self) -> None:
        self.calls = 0
        self.raises: BaseException | None = None

    def outbound(self, text: str) -> ScrubResult:
        self.calls += 1
        if self.raises is not None:
            raise self.raises
        out = fake_redact(text)
        return ScrubResult(out, redacted=out != text)


class FakeAudit:
    def __init__(self) -> None:
        self.rows: list[dict[str, str]] = []

    def record(self, operation: str, outcome: str, *, resources: str = "", error: str = "") -> None:
        self.rows.append(
            {
                "operation": f"{APP_NAME}.{operation}",
                "outcome": outcome,
                "resources": resources,
                "error": error,
            }
        )

    def ops(self, outcome: str | None = None) -> list[tuple[str, str, str]]:
        return [
            (r["operation"], r["resources"], r["outcome"])
            for r in self.rows
            if outcome is None or r["outcome"] == outcome
        ]


class FakeHealth:
    def __init__(self) -> None:
        self.status = "healthy"
        self.issues: list[str] = []

    def mark_degraded(self, issue: str) -> None:
        self.status = "degraded"
        self.issues.append(issue)


#: The subject the test identity middleware reads as the dashboard owner.
OWNER = "local-app"


@dataclass
class FakeCtx:
    """The gateway's ``AppContext`` at App Kit level 2, as Meetings reads it.

    ``require_owner`` is the host predicate: the configured owner, as a dashboard
    subject (an empty app claim). Everyone else gets the host's 403
    ``owner_only``, and the denial is recorded as ``meetings.<operation>``.
    ``turns`` is ``None`` until a test installs a session manager
    (``meetings_helpers.install_sessions``), the host's answer when it has no
    Application to run turns on.
    """

    data_dir: Path
    name: str = APP_NAME
    sdk_level: int = 2
    turns: Any = None
    untrusted: FakeUntrusted = field(default_factory=FakeUntrusted)
    scrub: FakeScrub = field(default_factory=FakeScrub)
    audit: FakeAudit = field(default_factory=FakeAudit)
    health: FakeHealth = field(default_factory=FakeHealth)
    owner: str = OWNER
    denials: list[str] = field(default_factory=list)
    owner_calls: list[str] = field(default_factory=list)

    async def require_owner(
        self, request: web.Request, operation: str
    ) -> web.StreamResponse | None:
        self.owner_calls.append(operation)
        if request.get("user") == self.owner and "app" in request and request["app"] == "":
            return None
        self.denials.append(f"{self.name}.{operation}")
        return web.json_response({"error": "owner only", "code": "owner_only"}, status=403)
