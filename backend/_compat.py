"""Small platform helpers Meetings used from ``kiro_crew.platform_compat`` and
``kiro_crew.loop_lock``.

Restated here: each is a few lines, carries no security decision, and is
exercised by this repository's tests on every OS the manifest names.
"""

from __future__ import annotations

import asyncio
import os
import stat
import sys
import threading
import weakref
from typing import Any

IS_WINDOWS: bool = sys.platform == "win32"
IS_POSIX: bool = not IS_WINDOWS


def is_link_or_junction(path: str | os.PathLike[str]) -> bool:
    """True if *path* is a symlink OR (on Windows) a directory junction.

    ``os.path.islink`` is False for a junction, so a caller that checked only
    ``islink`` would treat a junction as a real directory and walk or delete
    THROUGH it.
    """
    if os.path.islink(path):
        return True
    isjunction = getattr(os.path, "isjunction", None)
    if isjunction is not None:
        try:
            return bool(isjunction(path))
        except (OSError, ValueError):
            return False
    if not IS_WINDOWS:
        return False
    try:
        attrs = getattr(os.lstat(path), "st_file_attributes", 0)
    except OSError:
        return False
    return bool(attrs & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400))


def strip_extended_length_prefix(path: Any) -> Any:
    r"""*path* without Windows' extended-length prefix; unchanged elsewhere.

    ``Path.resolve()`` can return ``\\?\C:\...`` for one side of a comparison and
    the plain spelling for the other, and the lone prefix then reads as an
    escape. LEXICAL on purpose: resolving again could bless a redirect.
    """
    text = str(path)
    if text.startswith("\\\\?\\UNC\\"):
        return type(path)("\\\\" + text[8:])
    if text.startswith("\\\\?\\"):
        return type(path)(text[4:])
    return path


class LoopBoundLock:
    """A module-global asyncio lock that binds lazily to each running loop.

    An ``asyncio.Lock`` binds to the loop it is first used on, and acquiring it
    from another loop raises. A module-level lock therefore breaks whenever one
    process runs more than one loop over the module's lifetime (a test runner, a
    gateway restarted in process). This keeps one lock per loop, created in the
    first coroutine that acquires it there. Mutual exclusion holds within a loop,
    which is the contract a module-global ``asyncio.Lock`` offered.
    """

    __slots__ = ("_locks", "_guard")

    def __init__(self) -> None:
        self._locks: weakref.WeakKeyDictionary[asyncio.AbstractEventLoop, asyncio.Lock] = (
            weakref.WeakKeyDictionary()
        )
        self._guard = threading.Lock()

    def _bound(self) -> asyncio.Lock:
        loop = asyncio.get_running_loop()
        with self._guard:
            for stale in [lp for lp in self._locks if lp.is_closed()]:
                del self._locks[stale]
            lock = self._locks.get(loop)
            if lock is None:
                lock = asyncio.Lock()
                self._locks[loop] = lock
            return lock

    async def acquire(self) -> bool:
        return await self._bound().acquire()

    def release(self) -> None:
        self._bound().release()

    def locked(self) -> bool:
        try:
            return self._bound().locked()
        except RuntimeError:
            with self._guard:
                return any(lock.locked() for lock in self._locks.values())

    async def __aenter__(self) -> None:
        await self.acquire()

    async def __aexit__(self, *_exc: object) -> None:
        self.release()
