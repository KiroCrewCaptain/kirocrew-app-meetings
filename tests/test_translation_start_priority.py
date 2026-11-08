"""Live translation claims no start priority of its own, and runs as a one-shot turn.

Meeting translation is a per-line stream nobody waits on, so it opens its session
through the App Kit's one-shot turn (``ctx.turns.run_oneshot``) and names no
``start_priority`` at all: the host's BACKGROUND default is the whole statement.
The seam's own pin, that its session opens claim nothing, is Kiro Crew's
``test/test_app_agent_turn_sdk.py``.
"""

from __future__ import annotations

import ast
from pathlib import Path

import pytest
from fakehost import ONESHOT_AGENT, FakeAgentTurns
from meetings_helpers import FakeSessionManager, root_fixture  # noqa: F401

from backend import store
from backend.domain import session as sess
from backend.domain import translate

_FUNCTION = "run_oneshot_translation"
_CALLEE = "run_oneshot"


def _calls_in(path: Path, function: str, callee: str) -> list[ast.Call]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == function:
            return [
                call
                for call in ast.walk(node)
                if isinstance(call, ast.Call)
                and (
                    (isinstance(call.func, ast.Attribute) and call.func.attr == callee)
                    or (isinstance(call.func, ast.Name) and call.func.id == callee)
                )
            ]
    raise AssertionError(f"{function} not found in {path}")


def test_an_unattended_stream_claims_nothing() -> None:
    calls = _calls_in(Path(translate.__file__), _FUNCTION, _CALLEE)
    assert calls, f"{_FUNCTION} no longer opens its session through {_CALLEE}"
    assert [k.arg for call in calls for k in call.keywords if k.arg == "start_priority"] == []


@pytest.mark.asyncio
async def test_a_line_is_one_tool_less_turn_on_a_throwaway_session() -> None:
    manager = FakeSessionManager()
    turns = FakeAgentTurns(manager)

    await translate.run_oneshot_translation(turns, "translate this")

    [call] = turns.oneshots
    assert (call["label"], call["agent"], call["approval_policy"]) == (
        "translate",
        ONESHOT_AGENT,
        "REJECT_ALL",
    )
    assert call["key"].startswith("meetings-translate-")
    # Released AND destroyed: no kiro-cli child per translated line outlives it.
    assert manager.released == [call["key"]] and manager.destroyed == [call["key"]]


@pytest.mark.asyncio
async def test_the_meetings_translator_runs_on_its_turn_seam(root: Path) -> None:
    manager = FakeSessionManager()
    turns = FakeAgentTurns(manager)
    session = sess.MeetingSession(
        meeting_id="m1",
        turns=turns,
        config={**store.read_config(root), "translation_language": "fr"},
        root=root,
    )
    assert session.translations is not None
    await session.translations.runner("hello")
    assert [call["prompt"] for call in turns.oneshots] == ["hello"]
