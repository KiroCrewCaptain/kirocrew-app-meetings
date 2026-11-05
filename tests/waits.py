"""Bounded waits on a signal, for tests.

Restated from Kiro Crew's ``kiro_crew.testing.wait`` (the two helpers these tests
use): wait on the state about to be asserted, under a deadline that RAISES naming
what was awaited, and never return on a state that did not happen. The deadline
is a lost-run bound, not the barrier.
"""

from __future__ import annotations

import asyncio
import inspect
import time
from typing import Any, Callable

#: The default lost-run bound, in seconds.
DEFAULT_TIMEOUT_SECS = 60.0
#: How often a condition is re-read.
DEFAULT_INTERVAL_SECS = 0.01

_monotonic = time.monotonic
_sleep = asyncio.sleep


async def await_until(signal: Any, *, timeout: float | None = None, what: str = "") -> Any:
    """Await an :class:`asyncio.Event` (``True`` once set) or a future (its result)."""
    budget = DEFAULT_TIMEOUT_SECS if timeout is None else timeout
    start = _monotonic()
    if isinstance(signal, asyncio.Event):
        if signal.is_set():
            return True
        waiter = asyncio.ensure_future(signal.wait())
        done, _ = await asyncio.wait({waiter}, timeout=budget)
        if waiter in done:
            return waiter.result()
        waiter.cancel()
        raise AssertionError(
            f"await_until: {what or 'the event'} was still clear after "
            f"{_monotonic() - start:.2f}s"
        )
    if not asyncio.isfuture(signal):
        raise TypeError(
            "await_until() takes an asyncio.Event or an asyncio future, not "
            f"{type(signal).__name__}"
        )
    done, _ = await asyncio.wait({signal}, timeout=budget)
    if signal in done:
        return signal.result()
    raise AssertionError(
        f"await_until: {what or 'the future'} was still pending after "
        f"{_monotonic() - start:.2f}s"
    )


async def async_wait_until(
    predicate: Callable[[], Any],
    *,
    timeout: float | None = None,
    interval: float = DEFAULT_INTERVAL_SECS,
    describe: Callable[[], object] = lambda: "",
    ignoring: tuple[type[Exception], ...] = (),
    off_loop: bool = False,
) -> Any:
    """Poll *predicate* until it is truthy; raise naming the last state at the deadline."""
    budget = DEFAULT_TIMEOUT_SECS if timeout is None else timeout
    start = _monotonic()
    deadline = start + budget
    cause: Exception | None = None
    while True:
        try:
            value = await asyncio.to_thread(predicate) if off_loop else predicate()
            if inspect.isawaitable(value):
                value = await value
        except ignoring as exc:
            cause = exc
        else:
            if value:
                return value
        now = _monotonic()
        if now >= deadline:
            break
        await _sleep(min(interval, deadline - now))
    raise AssertionError(
        f"async_wait_until({getattr(predicate, '__name__', 'predicate')}): not true after "
        f"{_monotonic() - start:.2f}s; last state: {describe()}"
    ) from cause
