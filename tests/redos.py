"""The linear-time ReDoS guard, restated from Kiro Crew's ``test/conftest.py``.

A grammar under test is ramped one pump unit at a time under a per-size CPU
budget (thread time, not wall clock), then held to an absolute budget and a
scaling ratio on a few long pumps.
"""

from __future__ import annotations

#: Thread-CPU budget for ONE rejection of a pump in the SMALL ramp. The shipped
#: grammars spend under one clock tick here; the exponential class a shared character
#: between two adjacent quantified classes produces measured 4.3 s at 24 characters
#: and doubles per character, so it is more than a decade over.
REDOS_SMALL_BUDGET_SECONDS = 0.5
#: Pump lengths for the small ramp, ONE unit at a time. Ramping (not one fixed size)
#: is what bounds the cost of catching a regression: the mutant with the steepest
#: growth measured (~8x per pumped block) spends at most ~growth x budget on the
#: first size that overruns, and the ramp stops there. A single 24-unit probe
#: against that mutant would not return inside pytest's ``--timeout``.
REDOS_SMALL_PUMPS = tuple(range(1, 25))
#: Thread-CPU budget for one rejection of a pump in the LARGE ramp. The shipped
#: grammars measured 0.03 s at 20 000; a quadratic regression is 4e8 steps there.
REDOS_LARGE_BUDGET_SECONDS = 2.0
#: Pump lengths for the polynomial class, ascending so a cubic overruns at 2 000
#: (8e9 steps) before 20 000 is ever attempted.
REDOS_LARGE_PUMPS = (200, 2_000, 20_000)
#: Each long pump is 10x the one before, so a linear scan costs about 10x as much
#: and a quadratic one about 100x. The absolute budget alone cannot see the
#: difference for a quadratic scan whose steps are cheap: a C-level rescan of the
#: rest of the text per opener measured 1.8 s at 20 000, under 2.0 s.
REDOS_SCALING_RATIO = 25
#: Below this the ratio is not asserted: a cost this small is a few clock ticks on
#: Windows (15.6 ms), where the cheaper reading can round to zero. The shipped
#: grammars measured 0.06 s or less at 20 000.
REDOS_SCALING_FLOOR_SECONDS = 0.25


def assert_rejected_without_backtracking(
    reject, build_pump, *, budget_seconds: float = REDOS_LARGE_BUDGET_SECONDS
) -> None:
    """Assert a marker grammar handles an adversarial pump in linear CPU time.

    ``build_pump(n)`` returns an input with an ``n``-unit pump (a run of tabs, ``n``
    repeated heads or blocks); ``reject(text)`` runs the grammar and asserts its own
    outcome (a refusal, or the one legitimate match the shape has). Replaces the
    ``elapsed < 1.0`` wall-clock shape, which flaked in one of five full runs:
    ``perf_counter`` charges the time this worker spent DESCHEDULED behind nine
    siblings to a regex that took 0.15 s of CPU (class 5 in testing-conventions),
    and a ``monotonic()`` ratio read 16x from a 15.6 ms clock tick. Four properties:

    * **Thread CPU, not wall clock.** ``time.thread_time`` counts this thread's
      own execution, so another worker's slice cannot inflate it; the regex runs
      in C, so coverage instrumentation does not either.
    * **A one-unit ramp FIRST, and it is what catches the real regression.** A
      shared character between two adjacent quantified classes in these grammars
      is not polynomial but EXPONENTIAL (measured: 0.27 s at 20 characters, 4.3 s
      at 24, doubling per character; an interior that admits every bracket grows
      ~8x per block), so the 200 000-character input the old tests used would never
      return under a regression and the worker would be killed at ``--timeout`` --
      a lost run (class 6), not a red test. Ramping one unit at a time means the
      first over-budget size costs at most ~growth x budget, and the assertion
      fires there; only when the whole ramp passes is a long pump tried at all.
    * **Ascending long pumps** for the polynomial class, so a cubic overruns at
      2 000 before 20 000 is attempted. Each must also cost at most
      ``REDOS_SCALING_RATIO`` times the one before (above a small floor): a
      quadratic scan built from cheap steps stays under the absolute budget at
      20 000 but grows ~100x per 10x of input where a linear one grows ~10x.
    * **Minimum of two readings, and the second is taken only if the first
      overran.** A gen-2 garbage collection charged to this thread mid-search is
      the one thing that can still spend CPU here; it cannot hit two consecutive
      readings, so a first reading under budget is a verdict on its own and two
      over-budget readings are a verdict the other way. A long pump is held to
      the absolute budget and, past the first, to the ratio bound as well; two
      readings over either line end that size, so the measurement never pays a
      regression's cost more than twice per size. A long pump the next one is
      compared against otherwise takes three readings, since its cheapest is
      that comparison's baseline.

    The budgets are generous on purpose (a decade or more over the shipped cost):
    a real complexity regression is orders of magnitude, and a tight bound only
    turns runner variance into red. ``budget_seconds`` is the long pumps' absolute
    budget; a converted guard passes the constant it already carried, since a
    ratchet may only tighten.
    """
    import time

    def cheapest(text: str, budget: float) -> float:
        start = time.thread_time()
        reject(text)
        first = time.thread_time() - start
        if first < budget:
            return first
        start = time.thread_time()
        reject(text)
        return min(first, time.thread_time() - start)

    for n in REDOS_SMALL_PUMPS:
        cost = cheapest(build_pump(n), REDOS_SMALL_BUDGET_SECONDS)
        assert cost < REDOS_SMALL_BUDGET_SECONDS, (
            f"handling a {n}-unit pump cost {cost:.2f}s of CPU -- the grammar "
            "backtracks catastrophically (a body class now shares a character with "
            "an adjacent quantified run, or two alternatives can consume one span?)"
        )

    def refused(cost: float, bound: float) -> bool:
        return cost >= budget_seconds or cost > bound

    def floor_of_readings(text: str, settle_below: float, bound: float) -> float:
        # Up to three readings; stop at the first one under ``settle_below``, and
        # stop after two once both are over the line this size is held to (a verdict).
        best = float("inf")
        for attempt in range(3):
            start = time.thread_time()
            reject(text)
            best = min(best, time.thread_time() - start)
            if best < settle_below or (attempt and refused(best, bound)):
                break
        return best

    previous: tuple[int, float] | None = None
    for n in REDOS_LARGE_PUMPS:
        bound = budget_seconds
        if previous is not None:
            bound = max(REDOS_SCALING_RATIO * previous[1], REDOS_SCALING_FLOOR_SECONDS)
        # A size the next one is compared against keeps all three readings: its
        # cheapest is the baseline, and an inflated baseline would hide a regression.
        settle_below = bound if n == REDOS_LARGE_PUMPS[-1] else 0.0
        cost = floor_of_readings(build_pump(n), settle_below, bound)
        assert cost < budget_seconds, (
            f"handling a {n}-unit pump cost {cost:.2f}s of CPU -- superlinear in the " "pump length"
        )
        if previous is not None:
            assert cost <= bound, (
                f"handling a {n}-unit pump cost {cost:.3f}s of CPU against "
                f"{previous[1]:.4f}s at {previous[0]} units -- "
                f"{cost / max(previous[1], 1e-9):.0f}x for {n // previous[0]}x the "
                f"input, past the {REDOS_SCALING_RATIO}x a linear scan stays under"
            )
        previous = (n, cost)
