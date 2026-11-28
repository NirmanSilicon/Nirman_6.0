"""Python decorator and final-answer hook for SENTINEL-guarded tool calls."""

from __future__ import annotations

import functools
import uuid
from typing import Any, Callable

from sentinel_sandbox.client import ProductClient


class PolicyBlockedError(PermissionError):
    """Raised when SENTINEL blocks a decorated tool invocation."""

    def __init__(self, rule_id: str, reason: str, decision_id: str | None = None) -> None:
        super().__init__(f"[{rule_id}] {reason}")
        self.rule_id = rule_id
        self.reason = reason
        self.decision_id = decision_id


def sentinel_guarded(
    *,
    client: ProductClient,
    run_id_getter: Callable[[], str],
    tool_id: str,
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Wrap a Python tool function with SENTINEL pre-check and authorization."""

    def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(fn)
        def wrapper(**kwargs: Any) -> Any:
            run_id = run_id_getter()
            action_id = f"act-{uuid.uuid4().hex[:10]}"
            check = client.check_action(
                run_id,
                action_id=action_id,
                tool_id=tool_id,
                arguments=kwargs,
            )
            if check["verdict"] != "ALLOW":
                raise PolicyBlockedError(
                    check["rule_id"],
                    check["reason"],
                    decision_id=check["decision_id"],
                )
            auth = client.authorize_mock(
                run_id,
                action_id=action_id,
                decision_id=check["decision_id"],
                arguments=check.get("canonical_arguments") or kwargs,
            )
            if auth["status"] != "AUTHORIZED":
                raise PolicyBlockedError(auth["rule_id"], auth["reason"], decision_id=check["decision_id"])
            canon_args = auth["canonical_arguments"] or kwargs
            return fn(**canon_args)

        return wrapper

    return decorator


def guarded_final_answer(
    *,
    client: ProductClient,
    run_id: str,
    answer: dict[str, Any],
    source_refs: list[str] | None = None,
) -> dict[str, Any]:
    """Final-answer hook gating output release through /v1/runs/{run_id}/output/check."""
    output_id = f"out-{uuid.uuid4().hex[:10]}"
    return client.check_output(
        run_id,
        output_id=output_id,
        answer=answer,
        source_refs=source_refs or [],
    )
