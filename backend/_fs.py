"""The file helpers Meetings took from ``kiro_crew.atomic_write``,
``kiro_crew.owner_only_files`` and ``kiro_crew.user_json``.

Restated in the narrow form this app uses. Every file Meetings writes lives in
its own data directory, which the gateway puts inside the data home, so the
owner-only rule the host applies "inside the data home" is applied here to
every directory and file the app creates. PORTING.md lists what the restatement
drops.
"""

from __future__ import annotations

import asyncio
import json
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Callable

from ._compat import IS_POSIX, IS_WINDOWS

OWNER_ONLY_DIR_MODE = 0o700
OWNER_ONLY_FILE_MODE = 0o600

#: Windows refuses to replace or read a file another process holds open without
#: ``FILE_SHARE_DELETE`` (an indexer, a virus scanner); the hold is brief.
_RETRY_ATTEMPTS = 6
_RETRY_BACKOFF_SECS = 0.05


def _on_event_loop() -> bool:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return False
    return True


def _retry_sharing_window(call: Callable[[], Any]) -> Any:
    """Run *call*, retrying a Windows sharing violation off the event loop.

    On POSIX a ``PermissionError`` is a real access fault and is raised at once,
    and on the event loop the retry is skipped so the one loop never sleeps.
    The last attempt is outside the loop, so a call is always made.
    """
    for _attempt in range(_RETRY_ATTEMPTS - 1):
        try:
            return call()
        except PermissionError:
            if not IS_WINDOWS or _on_event_loop():
                raise
            time.sleep(_RETRY_BACKOFF_SECS)
    return call()


def replace_with_retry(src: Path | str, dst: Path | str) -> None:
    """``os.replace(src, dst)``, retrying the Windows sharing-violation window."""
    _retry_sharing_window(lambda: os.replace(src, dst))


def read_bytes_with_retry(path: Path | str, *, max_bytes: int | None = None) -> bytes:
    """``Path.read_bytes()``, retrying the Windows sharing-violation window.

    ``max_bytes`` bounds what is read, not the file: at most that many bytes are
    returned, so a caller enforcing a cap passes ``cap + 1``.
    """
    target = Path(path)

    def _read() -> bytes:
        if max_bytes is None:
            return target.read_bytes()
        with open(target, "rb") as handle:
            return handle.read(max_bytes)

    return _retry_sharing_window(_read)


def atomic_write(
    path: Path | str,
    content: str | bytes,
    *,
    mode: int | None = None,
    newline: str | None = None,
) -> None:
    """Write *content* to *path* through a unique temp file and a rename.

    A plain ``write_text`` truncates the old file before the new bytes land, so
    an interruption mid-save leaves an empty or partial file. The temp file is
    created beside the target (same filesystem, so the rename is atomic) with
    ``mkstemp``'s ``0600`` mode; *mode* replaces it before the rename, so the file
    is never visible at its final name with the wrong bits. Removed on failure.
    """
    target = Path(path)
    fd, tmp = tempfile.mkstemp(dir=str(target.parent), prefix=f".{target.name}.", suffix=".tmp")
    try:
        if isinstance(content, bytes):
            handle = os.fdopen(fd, "wb")
        else:
            handle = os.fdopen(fd, "w", encoding="utf-8", newline=newline)
        with handle:
            handle.write(content)
            handle.flush()
            if mode is not None and IS_POSIX:
                os.fchmod(handle.fileno(), mode)
        replace_with_retry(tmp, target)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def mkdirs_owner_only(path: str | os.PathLike[str]) -> None:
    """``mkdir -p`` where every directory it creates is ``0700``.

    Existing directories keep their mode. On Windows no mode is passed: a
    ``0o700`` ``mkdir`` there becomes a protected DACL that would cut the
    directory off from the data home's inherited owner grant.
    """
    if not IS_POSIX:
        Path(path).mkdir(parents=True, exist_ok=True)
        return
    target = os.path.abspath(os.fspath(path))
    try:
        os.mkdir(target, OWNER_ONLY_DIR_MODE)
    except FileNotFoundError:
        parent = os.path.dirname(target)
        if parent == target:
            raise
        mkdirs_owner_only(parent)
        try:
            os.mkdir(target, OWNER_ONLY_DIR_MODE)
        except OSError:
            if not os.path.isdir(target):
                raise
    except OSError:
        if not os.path.isdir(target):
            raise


#: The app's directories are all inside its data directory, so each is owner-only.
ensure_directory = mkdirs_owner_only


def owner_only_opener(path: str, flags: int) -> int:
    """An ``opener=`` for :func:`open` that creates the file ``0600``.

    An existing file keeps its mode: ``os.open`` applies a mode only when it
    creates.
    """
    return os.open(path, flags, OWNER_ONLY_FILE_MODE)


def owner_only_opener_for(_path: str | os.PathLike[str]) -> Callable[[str, int], int]:
    """The owner-only opener: every file Meetings creates is in its data directory."""
    return owner_only_opener


def loads_user_json(text: str) -> Any:
    """``json.loads`` that accepts one leading UTF-8 byte-order mark."""
    return json.loads(text[1:] if text.startswith("\ufeff") else text)
