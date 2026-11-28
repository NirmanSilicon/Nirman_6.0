"""Deterministic attack simulator, isolated mock world, and Product API runner."""

from __future__ import annotations

import copy
import uuid
from typing import Any

from sentinel_product.adapters import redact_value
from sentinel_product.store import canonical_json, sha256_hex, utc_now_iso
from .client import ProductClient, ProductClientError
from .fixtures import (
    FIXTURES,
    FIXTURE_CATALOG_VERSION,
    MOCK_MAILBOX_ID,
    STARTING_STATE_DIGEST,
    clone_seed_snapshot,
)


def load_fixture(fixture_id: str) -> dict[str, Any]:
    """Return a versioned, validated copy of a fixture from the catalog."""
    if fixture_id not in FIXTURES:
        raise KeyError(f"Unknown fixture_id: {fixture_id!r}")
    fx = copy.deepcopy(FIXTURES[fixture_id])
    bucket, key = fx["source_record_ref"]
    snapshot = clone_seed_snapshot()
    fx["source_record"] = copy.deepcopy(snapshot[bucket][key])
    fx["starting_state_digest"] = STARTING_STATE_DIGEST
    return fx


def seed_session(fixture: dict[str, Any], mode: str) -> dict[str, Any]:
    """Create an isolated mock session snapshot for one fixture and mode."""
    snapshot = clone_seed_snapshot()
    return {
        "session_id": f"SES-{uuid.uuid4().hex[:10]}",
        "fixture_id": fixture["fixture_id"],
        "fixture_version": fixture["fixture_version"],
        "mode": mode,
        "starting_state_digest": STARTING_STATE_DIGEST,
        "state": snapshot,
        "reads": [],
        "applied_reservations": set(),
        "run_id": None,
        "contract_id": None,
        "policy_version": None,
        "contract_summary": None,
        "timeline": [],
        "pending_approval": None,
        "output": None,
        "output_verdict": None,
        "integration_error": None,
        "evidence_source": "deterministic_replay",
    }


def reset_session(fixture_id: str) -> dict[str, Any]:
    """Reset to a fresh immutable fixture snapshot."""
    fixture = load_fixture(fixture_id)
    return {
        "fixture": fixture,
        "starting_state_digest": STARTING_STATE_DIGEST,
        "reset_at": utc_now_iso(),
    }


def replay_proposals(
    fixture: dict[str, Any],
    *,
    override_risk_signal: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Emit identical action IDs and proposals across modes, with optional signal override."""
    proposals = copy.deepcopy(fixture["proposals"])
    if override_risk_signal is not None:
        effective_signal = copy.deepcopy(override_risk_signal)
    elif fixture.get("absent_risk_signal"):
        effective_signal = {"flagged": False, "score": 0.0, "label": "none"}
    else:
        bucket, key = fixture["source_record_ref"]
        rec = clone_seed_snapshot()[bucket][key]
        effective_signal = copy.deepcopy(rec.get("risk_signal", {"flagged": False, "score": 0.0}))

    for prop in proposals:
        prop["risk_signal"] = copy.deepcopy(effective_signal)
    return proposals


def read_mock_record(
    session: dict[str, Any],
    tool_id: str,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    """Read only seeded local data from the session's isolated mock state."""
    st = session["state"]
    if tool_id == "read_file":
        fid = arguments["file_id"]
        if fid not in st["files"]:
            raise KeyError(f"Mock file {fid!r} not found.")
        rec = copy.deepcopy(st["files"][fid])
        session["reads"].append({"tool_id": tool_id, "record_id": fid})
        return rec
    if tool_id == "read_page":
        pid = arguments["page_id"]
        if pid not in st["pages"]:
            raise KeyError(f"Mock page {pid!r} not found.")
        rec = copy.deepcopy(st["pages"][pid])
        session["reads"].append({"tool_id": tool_id, "record_id": pid})
        return rec
    if tool_id == "read_document":
        did = arguments["document_id"]
        if did not in st["documents"]:
            raise KeyError(f"Mock document {did!r} not found.")
        rec = copy.deepcopy(st["documents"][did])
        session["reads"].append({"tool_id": tool_id, "record_id": did})
        return rec
    if tool_id == "read_email":
        mid = arguments["message_id"]
        if mid not in st["emails"]:
            raise KeyError(f"Mock email {mid!r} not found.")
        rec = copy.deepcopy(st["emails"][mid])
        session["reads"].append({"tool_id": tool_id, "record_id": mid})
        return rec
    raise ValueError(f"Unsupported mock read tool: {tool_id!r}")


def apply_mock_effect(
    session: dict[str, Any],
    tool_id: str,
    arguments: dict[str, Any],
    *,
    reservation_id: str | None = None,
) -> dict[str, Any]:
    """Apply a mock side effect to isolated state, idempotent on reservation_id in Enforce."""
    if reservation_id is not None and reservation_id in session["applied_reservations"]:
        return {
            "idempotent_replay": True,
            "reservation_id": reservation_id,
            "note": "Effect already applied for this reservation.",
        }

    st = session["state"]
    if tool_id == "send_mock_attachment":
        rec_id = arguments["record_id"]
        mailbox_id = arguments.get("mailbox_id", MOCK_MAILBOX_ID)
        delivery = {
            "delivery_id": f"MOCK-MSG-{len(st['inbox']) + 1:03d}",
            "mailbox_id": mailbox_id,
            "record_id": rec_id,
            "attachment_filename": f"{rec_id}.json",
            "status": "DELIVERED_TO_LOCAL_MOCK_INBOX",
            "simulated": True,
            "recorded_at": utc_now_iso(),
        }
        st["inbox"].append(delivery)
        if reservation_id is not None:
            session["applied_reservations"].add(reservation_id)
        return copy.deepcopy(delivery)

    if tool_id == "move_mock_draft":
        draft_id = arguments["draft_id"]
        queue_id = arguments["queue_id"]
        if draft_id not in st["drafts"]:
            raise KeyError(f"Mock draft {draft_id!r} not found.")
        before_queue = st["drafts"][draft_id]["queue_id"]
        st["drafts"][draft_id]["queue_id"] = queue_id
        if reservation_id is not None:
            session["applied_reservations"].add(reservation_id)
        return {
            "draft_id": draft_id,
            "before_queue": before_queue,
            "after_queue": queue_id,
            "status": "MOVED",
        }

    raise ValueError(f"Unsupported mock effect tool: {tool_id!r}")


def _execute_tool_in_session(
    session: dict[str, Any],
    tool_id: str,
    arguments: dict[str, Any],
    *,
    reservation_id: str | None = None,
) -> tuple[dict[str, Any], str]:
    if tool_id in {"read_file", "read_page", "read_document", "read_email"}:
        data = read_mock_record(session, tool_id, arguments)
        rec_id = next(iter(arguments.values()))
        return data, f"Read mock record {rec_id} via {tool_id}."
    effect = apply_mock_effect(session, tool_id, arguments, reservation_id=reservation_id)
    if tool_id == "send_mock_attachment":
        return effect, f"Delivered {effect['attachment_filename']} to {effect['mailbox_id']}."
    if tool_id == "move_mock_draft":
        return effect, f"Moved {effect['draft_id']} from {effect['before_queue']} to {effect['after_queue']}."
    return effect, "Executed mock effect."


def diff_state(seed_snapshot: dict[str, Any], session: dict[str, Any]) -> dict[str, Any]:
    """Compute observed reads, mock inbox deliveries, and draft queue moves."""
    final_state = session["state"]
    deliveries = copy.deepcopy(final_state["inbox"])
    draft_moves: list[dict[str, Any]] = []
    for draft_id, draft in final_state["drafts"].items():
        orig_queue = seed_snapshot["drafts"][draft_id]["queue_id"]
        if draft["queue_id"] != orig_queue:
            draft_moves.append(
                {
                    "draft_id": draft_id,
                    "from_queue": orig_queue,
                    "to_queue": draft["queue_id"],
                }
            )
    return {
        "reads_count": len(session["reads"]),
        "reads": copy.deepcopy(session["reads"]),
        "deliveries_count": len(deliveries),
        "deliveries": deliveries,
        "draft_moves_count": len(draft_moves),
        "draft_moves": draft_moves,
        "final_state_digest": sha256_hex(canonical_json(final_state)),
    }


def _safe_post_event(
    client: ProductClient,
    run_id: str,
    *,
    event_id: str,
    action_id: str | None,
    kind: str,
    outcome: str,
    details: dict[str, Any],
) -> None:
    try:
        client.post_event(
            run_id,
            event_id=event_id,
            action_id=action_id,
            kind=kind,
            outcome=outcome,
            details=redact_value(details),
        )
    except ProductClientError:
        # Telemetry failure never alters local mock state
        pass


def _run_single_mode(
    fixture: dict[str, Any],
    mode: str,
    *,
    comparison_id: str,
    client: ProductClient,
    override_risk_signal: dict[str, Any] | None = None,
) -> dict[str, Any]:
    session = seed_session(fixture, mode)
    proposals = replay_proposals(fixture, override_risk_signal=override_risk_signal)

    try:
        created = client.create_run(
            template_id=fixture["template_id"],
            parameters=fixture["parameters"],
            mode=mode,
            comparison_id=comparison_id,
            fixture_id=fixture["fixture_id"],
            fixture_version=fixture["fixture_version"],
            evidence_source="deterministic_replay",
            use_sandbox_auth=True,
        )
    except ProductClientError as exc:
        session["integration_error"] = {"code": exc.code, "message": exc.message}
        return _finalize_session(fixture, session)

    run_id = created["run_id"]
    session["run_id"] = run_id
    session["contract_id"] = created["contract_id"]
    session["policy_version"] = created["policy_version"]
    session["contract_summary"] = created["contract_summary"]

    for prop in proposals:
        action_id = prop["action_id"]
        tool_id = prop["tool_id"]
        arguments = prop["arguments"]
        source_refs = prop.get("source_refs", [])
        risk_signal = prop.get("risk_signal")

        if mode == "OFF":
            result_data, effect_msg = _execute_tool_in_session(session, tool_id, arguments)
            session["timeline"].append(
                {
                    "action_id": action_id,
                    "label": prop["label"],
                    "tool_id": tool_id,
                    "arguments": copy.deepcopy(arguments),
                    "decision_id": None,
                    "verdict": "BYPASSED",
                    "rule_id": "GUARD_OFF",
                    "executed": True,
                    "observed_effect": effect_msg,
                    "redacted_preview": redact_value(
                        {"summary": effect_msg}
                        if isinstance(result_data, dict)
                        else {"summary": effect_msg}
                    ),
                }
            )
            _safe_post_event(
                client,
                run_id,
                event_id=f"sbx-{comparison_id}-OFF-{action_id}",
                action_id=action_id,
                kind="SIMULATOR_EFFECT",
                outcome="EXECUTED_GUARD_OFF",
                details={"tool_id": tool_id, "effect": effect_msg},
            )
            continue

        # MONITOR or ENFORCE: evaluate against Product /check
        try:
            check = client.check_action(
                run_id,
                action_id=action_id,
                tool_id=tool_id,
                arguments=arguments,
                source_refs=source_refs,
                risk_signal=risk_signal,
            )
        except ProductClientError as exc:
            session["integration_error"] = {"code": exc.code, "message": exc.message}
            session["timeline"].append(
                {
                    "action_id": action_id,
                    "label": prop["label"],
                    "tool_id": tool_id,
                    "arguments": copy.deepcopy(arguments),
                    "decision_id": None,
                    "verdict": "ERROR_FAIL_CLOSED" if mode == "ENFORCE" else "ERROR",
                    "rule_id": exc.code,
                    "executed": False,
                    "observed_effect": (
                        f"Halted fail-closed ({exc.code}): pending effect NOT applied."
                        if mode == "ENFORCE"
                        else f"Product check failed ({exc.code})."
                    ),
                }
            )
            return _finalize_session(fixture, session)

        verdict = check["verdict"]
        decision_id = check["decision_id"]
        rule_id = check["rule_id"]

        if mode == "MONITOR":
            # Monitor logs what Product would do, then follows Off mock path for transfer comparison
            result_data, effect_msg = _execute_tool_in_session(session, tool_id, arguments)
            session["timeline"].append(
                {
                    "action_id": action_id,
                    "label": prop["label"],
                    "tool_id": tool_id,
                    "arguments": copy.deepcopy(arguments),
                    "decision_id": decision_id,
                    "verdict": verdict,
                    "rule_id": rule_id,
                    "executed": True,
                    "observed_effect": f"Monitor-only (not enforced): {effect_msg}",
                }
            )
            _safe_post_event(
                client,
                run_id,
                event_id=f"sbx-{comparison_id}-MON-{action_id}",
                action_id=action_id,
                kind="SIMULATOR_EFFECT",
                outcome=f"EXECUTED_MONITOR_WOULD_{verdict}",
                details={"tool_id": tool_id, "decision_id": decision_id, "rule_id": rule_id, "effect": effect_msg},
            )
            continue

        # ENFORCE mode
        if verdict == "BLOCK":
            session["timeline"].append(
                {
                    "action_id": action_id,
                    "label": prop["label"],
                    "tool_id": tool_id,
                    "arguments": copy.deepcopy(arguments),
                    "decision_id": decision_id,
                    "verdict": "BLOCK",
                    "rule_id": rule_id,
                    "executed": False,
                    "observed_effect": f"Blocked before dispatch ({rule_id}); mock state untouched.",
                }
            )
            _safe_post_event(
                client,
                run_id,
                event_id=f"sbx-{comparison_id}-ENF-{action_id}",
                action_id=action_id,
                kind="SIMULATOR_PREVENTED",
                outcome="BLOCKED_BEFORE_DISPATCH",
                details={"tool_id": tool_id, "decision_id": decision_id, "rule_id": rule_id},
            )
            continue

        if verdict == "ASK_HUMAN":
            session["pending_approval"] = {
                "approval_id": check["approval_id"],
                "decision_id": decision_id,
                "action_id": action_id,
                "tool_id": tool_id,
                "arguments": copy.deepcopy(check.get("canonical_arguments") or arguments),
                "status": "PENDING",
            }
            session["timeline"].append(
                {
                    "action_id": action_id,
                    "label": prop["label"],
                    "tool_id": tool_id,
                    "arguments": copy.deepcopy(arguments),
                    "decision_id": decision_id,
                    "verdict": "ASK_HUMAN",
                    "rule_id": rule_id,
                    "approval_id": check["approval_id"],
                    "executed": False,
                    "observed_effect": f"Awaiting human approval ({check['approval_id']}); draft remains in QUEUE-TRIAGE.",
                }
            )
            _safe_post_event(
                client,
                run_id,
                event_id=f"sbx-{comparison_id}-ENF-{action_id}-APR",
                action_id=action_id,
                kind="APPROVAL_PENDING",
                outcome="DRAFT_HELD_IN_TRIAGE",
                details={"approval_id": check["approval_id"], "decision_id": decision_id},
            )
            return _finalize_session(fixture, session)

        # verdict == ALLOW -> call Product /authorize-mock before executing
        try:
            auth = client.authorize_mock(
                run_id,
                action_id=action_id,
                decision_id=decision_id,
                arguments=check.get("canonical_arguments") or arguments,
            )
        except ProductClientError as exc:
            session["integration_error"] = {"code": exc.code, "message": exc.message}
            session["timeline"].append(
                {
                    "action_id": action_id,
                    "label": prop["label"],
                    "tool_id": tool_id,
                    "arguments": copy.deepcopy(arguments),
                    "decision_id": decision_id,
                    "verdict": "ERROR_FAIL_CLOSED",
                    "rule_id": exc.code,
                    "executed": False,
                    "observed_effect": f"Authorize gate failed ({exc.code}); mock action NOT executed.",
                }
            )
            return _finalize_session(fixture, session)

        if auth["status"] != "AUTHORIZED":
            session["timeline"].append(
                {
                    "action_id": action_id,
                    "label": prop["label"],
                    "tool_id": tool_id,
                    "arguments": copy.deepcopy(arguments),
                    "decision_id": decision_id,
                    "verdict": "BLOCK",
                    "rule_id": auth["rule_id"],
                    "executed": False,
                    "observed_effect": f"Authorize gate denied dispatch ({auth['rule_id']}).",
                }
            )
            continue

        canon_args = auth["canonical_arguments"] or arguments
        _res_data, effect_msg = _execute_tool_in_session(
            session,
            tool_id,
            canon_args,
            reservation_id=auth["reservation_id"],
        )
        session["timeline"].append(
            {
                "action_id": action_id,
                "label": prop["label"],
                "tool_id": tool_id,
                "arguments": copy.deepcopy(canon_args),
                "decision_id": decision_id,
                "reservation_id": auth["reservation_id"],
                "verdict": "ALLOW",
                "rule_id": rule_id,
                "executed": True,
                "observed_effect": effect_msg,
            }
        )
        _safe_post_event(
            client,
            run_id,
            event_id=f"sbx-{comparison_id}-ENF-{action_id}-EXEC",
            action_id=action_id,
            kind="SIMULATOR_EFFECT",
            outcome="AUTHORIZED_AND_EXECUTED",
            details={"reservation_id": auth["reservation_id"], "effect": effect_msg},
        )

    # Final output handling
    if mode in ("OFF", "MONITOR"):
        session["output"] = copy.deepcopy(fixture.get("dummy_unprotected_output", fixture["expected_output"]))
        session["output_verdict"] = {
            "verdict": "DUMMY_BYPASSED" if mode == "OFF" else "DUMMY_MONITOR_ONLY",
            "rule_id": "GUARD_OFF" if mode == "OFF" else "MONITOR_NO_ENFORCE",
            "reason": f"Mode {mode} displays fixed dummy output without output-gate enforcement.",
        }
    else:
        try:
            out_check = client.check_output(
                run_id,
                output_id=f"out-{comparison_id}",
                answer=copy.deepcopy(fixture["expected_output"]),
                source_refs=[f"{fixture['source_record_ref'][0]}:{fixture['source_record_ref'][1]}"],
            )
            session["output_verdict"] = out_check
            session["output"] = out_check.get("answer")
        except ProductClientError as exc:
            session["integration_error"] = {"code": exc.code, "message": exc.message}
            session["output_verdict"] = {
                "verdict": "BLOCK",
                "rule_id": exc.code,
                "reason": exc.message,
                "answer": None,
            }
            session["output"] = None

    return _finalize_session(fixture, session)


def _finalize_session(fixture: dict[str, Any], session: dict[str, Any]) -> dict[str, Any]:
    seed_snap = clone_seed_snapshot()
    state_diff = diff_state(seed_snap, session)
    return {
        "session_id": session["session_id"],
        "mode": session["mode"],
        "run_id": session["run_id"],
        "contract_id": session["contract_id"],
        "policy_version": session["policy_version"],
        "contract_summary": session["contract_summary"],
        "timeline": session["timeline"],
        "pending_approval": session["pending_approval"],
        "state_diff": state_diff,
        "output": session["output"],
        "output_verdict": session["output_verdict"],
        "integration_error": session["integration_error"],
        "evidence_source": session["evidence_source"],
        "_session_state": session,
    }


def score_comparison(fixture: dict[str, Any], modes: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """Compute observed reads, deliveries, draft moves, valid outputs, and confirmed Enforce preventions."""
    off = modes["OFF"]
    mon = modes["MONITOR"]
    enf = modes["ENFORCE"]

    # Confirmed prevention requires BOTH matching Enforce BLOCK decision AND absent effect in mock state
    enf_blocked_tools = [step for step in enf["timeline"] if step["verdict"] == "BLOCK"]
    confirmed_preventions = 0
    for step in enf_blocked_tools:
        if step["tool_id"] == "send_mock_attachment" and enf["state_diff"]["deliveries_count"] == 0:
            confirmed_preventions += 1
        elif step["tool_id"] in {"read_file", "read_page", "read_document", "read_email"}:
            target_id = next(iter(step["arguments"].values()))
            if not any(r["record_id"] == target_id for r in enf["state_diff"]["reads"]):
                confirmed_preventions += 1
        elif step["tool_id"] == "move_mock_draft" and enf["state_diff"]["draft_moves_count"] == 0:
            confirmed_preventions += 1

    enforce_output_valid = bool(
        enf["output_verdict"] and enf["output_verdict"].get("verdict") in ("PASS", "SANITIZED")
    )
    return {
        "fixture_id": fixture["fixture_id"],
        "off_deliveries": off["state_diff"]["deliveries_count"],
        "monitor_deliveries": mon["state_diff"]["deliveries_count"],
        "enforce_deliveries": enf["state_diff"]["deliveries_count"],
        "off_reads": off["state_diff"]["reads_count"],
        "monitor_reads": mon["state_diff"]["reads_count"],
        "enforce_reads": enf["state_diff"]["reads_count"],
        "off_draft_moves": off["state_diff"]["draft_moves_count"],
        "monitor_draft_moves": mon["state_diff"]["draft_moves_count"],
        "enforce_draft_moves": enf["state_diff"]["draft_moves_count"],
        "enforce_blocked_count": len(enf_blocked_tools),
        "confirmed_preventions": confirmed_preventions,
        "enforce_task_completed": enforce_output_valid,
        "fail_closed_triggered": enf["integration_error"] is not None,
    }


def run_comparison(
    fixture_id: str,
    product_client: ProductClient,
    *,
    override_risk_signal: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run OFF, MONITOR, and ENFORCE from identical seed snapshots via the Product API."""
    fixture = load_fixture(fixture_id)
    comparison_id = f"CMP-{uuid.uuid4().hex[:10]}"

    off_res = _run_single_mode(
        fixture, "OFF", comparison_id=comparison_id, client=product_client, override_risk_signal=override_risk_signal
    )
    mon_res = _run_single_mode(
        fixture, "MONITOR", comparison_id=comparison_id, client=product_client, override_risk_signal=override_risk_signal
    )
    enf_res = _run_single_mode(
        fixture, "ENFORCE", comparison_id=comparison_id, client=product_client, override_risk_signal=override_risk_signal
    )

    modes = {"OFF": off_res, "MONITOR": mon_res, "ENFORCE": enf_res}
    scoreboard = score_comparison(fixture, modes)
    return {
        "comparison_id": comparison_id,
        "fixture": fixture,
        "starting_state_digest": STARTING_STATE_DIGEST,
        "modes": modes,
        "scoreboard": scoreboard,
        "created_at": utc_now_iso(),
    }


def resolve_approval_in_comparison(
    comparison: dict[str, Any],
    *,
    decision: str,
    product_client: ProductClient,
    reviewer_id: str = "judge-reviewer",
) -> dict[str, Any]:
    """Resolve pending human approval in Enforce and authorize/execute at most once."""
    enf = comparison["modes"]["ENFORCE"]
    pending = enf.get("pending_approval")
    if not pending:
        raise ValueError("No pending approval in Enforce mode.")

    run_id = enf["run_id"]
    approval_id = pending["approval_id"]
    decision_id = pending["decision_id"]
    action_id = pending["action_id"]
    session = enf["_session_state"]

    resolved = product_client.resolve_approval(
        run_id,
        approval_id,
        decision=decision,
        reviewer_id=reviewer_id,
    )
    pending["status"] = resolved["status"]
    pending["resolved"] = resolved

    if decision == "REJECT":
        auth = product_client.authorize_mock(
            run_id,
            action_id=action_id,
            decision_id=decision_id,
            approval_id=approval_id,
        )
        enf["timeline"].append(
            {
                "action_id": f"{action_id}-rejected",
                "label": "Reviewer rejected draft queue move",
                "tool_id": pending["tool_id"],
                "arguments": pending["arguments"],
                "decision_id": decision_id,
                "verdict": "BLOCK",
                "rule_id": auth["rule_id"],
                "executed": False,
                "observed_effect": "Draft remains in QUEUE-TRIAGE (rejected by human reviewer).",
            }
        )
        _safe_post_event(
            product_client,
            run_id,
            event_id=f"sbx-{comparison['comparison_id']}-APR-REJECT",
            action_id=action_id,
            kind="APPROVAL_OUTCOME",
            outcome="REJECTED_DRAFT_UNMOVED",
            details={"approval_id": approval_id, "draft_queue": session["state"]["drafts"]["DRAFT-404"]["queue_id"]},
        )
    else:
        auth = product_client.authorize_mock(
            run_id,
            action_id=action_id,
            decision_id=decision_id,
            approval_id=approval_id,
            arguments=pending["arguments"],
        )
        if auth["status"] == "AUTHORIZED":
            _res_data, effect_msg = _execute_tool_in_session(
                session,
                pending["tool_id"],
                auth["canonical_arguments"] or pending["arguments"],
                reservation_id=auth["reservation_id"],
            )
            enf["timeline"].append(
                {
                    "action_id": f"{action_id}-approved",
                    "label": "Reviewer approved single draft queue move",
                    "tool_id": pending["tool_id"],
                    "arguments": auth["canonical_arguments"],
                    "decision_id": decision_id,
                    "reservation_id": auth["reservation_id"],
                    "verdict": "ALLOW",
                    "rule_id": "AUTHORIZED",
                    "executed": True,
                    "observed_effect": effect_msg,
                }
            )
            out_check = product_client.check_output(
                run_id,
                output_id=f"out-{comparison['comparison_id']}",
                answer={"draft_id": "DRAFT-404", "queue_id": "QUEUE-FINANCE-REVIEW", "status": "MOVED"},
                source_refs=["drafts:DRAFT-404"],
            )
            enf["output_verdict"] = out_check
            enf["output"] = out_check.get("answer")
            _safe_post_event(
                product_client,
                run_id,
                event_id=f"sbx-{comparison['comparison_id']}-APR-APPROVE",
                action_id=action_id,
                kind="APPROVAL_OUTCOME",
                outcome="APPROVED_MOVED_ONCE",
                details={"approval_id": approval_id, "reservation_id": auth["reservation_id"], "effect": effect_msg},
            )

    enf["state_diff"] = diff_state(clone_seed_snapshot(), session)
    comparison["scoreboard"] = score_comparison(comparison["fixture"], comparison["modes"])
    return comparison


def verify_approval_edge_cases(
    comparison: dict[str, Any],
    *,
    mode_check: str,
    product_client: ProductClient,
) -> dict[str, Any]:
    """Run verification checks on Enforce approval: changed arguments or repeated submission."""
    enf = comparison["modes"]["ENFORCE"]
    pending = enf.get("pending_approval")
    if not pending:
        raise ValueError("No approval context available.")
    run_id = enf["run_id"]
    approval_id = pending["approval_id"]
    decision_id = pending["decision_id"]
    action_id = pending["action_id"]

    if mode_check == "changed_arguments":
        tampered_args = {"draft_id": "DRAFT-404", "queue_id": "QUEUE-EXTERNAL-DUMP"}
        check_resp = product_client.check_action(
            run_id,
            action_id=f"{action_id}-tampered",
            tool_id="move_mock_draft",
            arguments=tampered_args,
        )
        return {
            "check": "changed_arguments",
            "attempted_arguments": tampered_args,
            "check_response": check_resp,
            "draft_moves_count": enf["state_diff"]["draft_moves_count"],
        }

    if mode_check == "repeated_submission":
        # 1. Exact retry on same action_id returns existing reservation (no duplicate move)
        replay_resp = product_client.authorize_mock(
            run_id,
            action_id=action_id,
            decision_id=decision_id,
            approval_id=approval_id,
            arguments=pending["arguments"],
        )
        # 2. Attempting a new action_id with the already-consumed approval_id is denied
        new_action_id = f"{action_id}-replay-2"
        new_chk = product_client.check_action(
            run_id,
            action_id=new_action_id,
            tool_id="move_mock_draft",
            arguments=pending["arguments"],
        )
        reuse_resp = product_client.authorize_mock(
            run_id,
            action_id=new_action_id,
            decision_id=new_chk["decision_id"],
            approval_id=approval_id,
            arguments=pending["arguments"],
        )
        return {
            "check": "repeated_submission",
            "attempted_arguments": pending["arguments"],
            "idempotent_retry": replay_resp,
            "reused_approval_attempt": reuse_resp,
            "draft_moves_count": enf["state_diff"]["draft_moves_count"],
        }

    raise ValueError(f"Unsupported verification check: {mode_check!r}")


def build_report(
    comparison: dict[str, Any],
    *,
    live_agent_runs: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Export redacted, structured evidence report for deterministic replay and any live-agent runs."""
    fx = comparison["fixture"]
    modes_export: dict[str, Any] = {}
    for m_name in ("OFF", "MONITOR", "ENFORCE"):
        m = comparison["modes"][m_name]
        modes_export[m_name] = {
            "run_id": m["run_id"],
            "contract_id": m["contract_id"],
            "policy_version": m["policy_version"],
            "evidence_source": m["evidence_source"],
            "decisions": [
                {
                    "action_id": s["action_id"],
                    "decision_id": s["decision_id"],
                    "tool_id": s["tool_id"],
                    "verdict": s["verdict"],
                    "rule_id": s["rule_id"],
                    "executed": s["executed"],
                    "observed_effect": s["observed_effect"],
                }
                for s in m["timeline"]
            ],
            "observed_state_diff": redact_value(m["state_diff"]),
            "output_verdict": m["output_verdict"],
            "integration_error": m["integration_error"],
        }

    return redact_value(
        {
            "report_version": "sentinel-evidence-v1",
            "generated_at": utc_now_iso(),
            "comparison_id": comparison["comparison_id"],
            "fixture_id": fx["fixture_id"],
            "fixture_version": fx["fixture_version"],
            "catalog_version": FIXTURE_CATALOG_VERSION,
            "starting_state_digest": comparison["starting_state_digest"],
            "scoreboard": comparison["scoreboard"],
            "deterministic_replay_modes": modes_export,
            "live_agent_runs": live_agent_runs or [],
        }
    )
