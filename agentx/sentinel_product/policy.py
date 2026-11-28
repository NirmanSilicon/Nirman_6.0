"""Pure deterministic policy, contract, manifest, approval, and dispatch engine."""

from __future__ import annotations

import copy
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import html
import json
import re
import uuid
from typing import Any, Callable

from sentinel_shared import (
    ApprovalDecision,
    ApprovalStatus,
    AuthorizeStatus,
    Mode,
    OutputVerdict,
    POLICY_VERSION,
    RunStatus,
    Verdict,
)
from .adapters import ingest_payload, redact_text, redact_value
from .store import ProductStore, canonical_json, sha256_hex, utc_now_iso

DEFAULT_SANDBOX_RECORDS: dict[str, set[str]] = {
    "files": {"INV-2026-0042", "INV-2026-0099", "Q-2026-A", "Q-2026-B", "Q-2026-SECRET"},
    "pages": {"PAGE-VENDOR-PORTAL"},
    "documents": {"DOC-Q4-MEMO"},
    "emails": {"MSG-8841"},
    "drafts": {"DRAFT-404"},
    "queues": {"QUEUE-TRIAGE", "QUEUE-FINANCE-REVIEW", "QUEUE-EXTERNAL-DUMP"},
    "mailboxes": {"MOCK-INBOX-01"},
}

APPROVED_INTERNAL_QUEUES = {"QUEUE-FINANCE-REVIEW", "QUEUE-TRIAGE"}


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def _to_cents(value: Any, field: str) -> int:
    if isinstance(value, bool):
        raise ValueError(f"{field} cannot be boolean")
    try:
        dec = Decimal(str(value).strip())
    except (InvalidOperation, AttributeError) as exc:
        raise ValueError(f"{field} is not a valid decimal") from exc
    if not dec.is_finite():
        raise ValueError(f"{field} must be finite")
    scaled = dec * Decimal("100")
    if scaled != scaled.to_integral_value(rounding=ROUND_HALF_UP):
        raise ValueError(f"{field} has sub-cent precision")
    cents = int(scaled)
    if cents < 0:
        raise ValueError(f"{field} cannot be negative")
    return cents


class CredentialBrokerStub:
    """Scoped credential-broker stub: issues opaque handles, never raw secrets."""

    def __init__(self) -> None:
        self._handles: dict[str, dict[str, Any]] = {}

    def issue_scoped_handle(
        self,
        *,
        run_id: str,
        connector_id: str,
        allowed_scope: str,
    ) -> dict[str, Any]:
        handle_id = _new_id("CRED-STUB")
        record = {
            "handle_id": handle_id,
            "stub": True,
            "run_id": run_id,
            "connector_id": connector_id,
            "scope": allowed_scope,
            "issued_at": utc_now_iso(),
            "expires_in_seconds": 300,
        }
        self._handles[handle_id] = record
        return copy.deepcopy(record)


class ProductEngine:
    """Core SENTINEL product enforcement, manifest, approval, and audit engine."""

    def __init__(
        self,
        store: ProductStore | None = None,
        *,
        sandbox_profile: bool = True,
        authorized_records: dict[str, set[str]] | None = None,
    ) -> None:
        self.store = store or ProductStore(":memory:")
        self.sandbox_profile = sandbox_profile
        self.authorized_records = copy.deepcopy(authorized_records or DEFAULT_SANDBOX_RECORDS)
        self.templates: dict[str, dict[str, Any]] = {}
        self.broker = CredentialBrokerStub()
        self._executors: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {}
        self._seed_default_templates_and_manifests()

    def register_executor(
        self,
        tool_id: str,
        fn: Callable[[dict[str, Any]], dict[str, Any]],
    ) -> None:
        self._executors[tool_id] = fn

    def register_template(self, template_def: dict[str, Any]) -> dict[str, Any]:
        template_id = template_def["template_id"]
        self.templates[template_id] = copy.deepcopy(template_def)
        return copy.deepcopy(template_def)

    def _seed_default_templates_and_manifests(self) -> None:
        default_templates = [
            {
                "template_id": "extract_invoice",
                "version": "1.0.0",
                "description": "Extract structured invoice fields from one authorized invoice file.",
                "param_schema": {"file_id": "str"},
                "allowed_tools": ["read_file"],
                "approval_tools": [],
                "output_type": "invoice",
                "sandbox_only": False,
            },
            {
                "template_id": "compare_quotes",
                "version": "1.0.0",
                "description": "Read approved vendor quote files, recompute totals, and rank by lowest USD total.",
                "param_schema": {"file_ids": "list[str]"},
                "allowed_tools": ["read_file"],
                "approval_tools": [],
                "output_type": "quote_comparison",
                "sandbox_only": False,
            },
            {
                "template_id": "summarize_page",
                "version": "1.0.0",
                "description": "Read and summarize one authorized local webpage.",
                "param_schema": {"page_id": "str"},
                "allowed_tools": ["read_page"],
                "approval_tools": [],
                "output_type": "summary",
                "sandbox_only": True,
            },
            {
                "template_id": "summarize_document",
                "version": "1.0.0",
                "description": "Read and summarize one authorized PDF document.",
                "param_schema": {"document_id": "str"},
                "allowed_tools": ["read_document"],
                "approval_tools": [],
                "output_type": "summary",
                "sandbox_only": True,
            },
            {
                "template_id": "summarize_email",
                "version": "1.0.0",
                "description": "Read and summarize one authorized inbox message.",
                "param_schema": {"message_id": "str"},
                "allowed_tools": ["read_email"],
                "approval_tools": [],
                "output_type": "email_summary",
                "sandbox_only": True,
            },
            {
                "template_id": "route_review_draft",
                "version": "1.0.0",
                "description": "Move one authorized review draft to an approved internal queue after explicit approval.",
                "param_schema": {"draft_id": "str", "queue_id": "str"},
                "allowed_tools": ["read_file"],
                "approval_tools": ["move_mock_draft"],
                "output_type": "queue_move",
                "sandbox_only": True,
            },
        ]
        for tpl in default_templates:
            self.register_template(tpl)

        default_manifests = [
            {
                "tool_id": "read_file",
                "connector_id": "local-files-connector",
                "description": "Read an authorized invoice or quote record by file_id.",
                "schema": {"type": "object", "required": ["file_id"], "properties": {"file_id": {"type": "string"}}},
                "side_effect": "READ_ONLY",
                "data_labels": ["INVOICE", "QUOTE", "UNTRUSTED_TEXT"],
                "required_privileges": ["files:read"],
                "allowed_sinks": [],
                "sandbox_only": False,
            },
            {
                "tool_id": "read_page",
                "connector_id": "local-web-connector",
                "description": "Read a seeded local webpage fixture by page_id.",
                "schema": {"type": "object", "required": ["page_id"], "properties": {"page_id": {"type": "string"}}},
                "side_effect": "READ_ONLY",
                "data_labels": ["WEBPAGE", "UNTRUSTED_TEXT"],
                "required_privileges": ["pages:read"],
                "allowed_sinks": [],
                "sandbox_only": True,
            },
            {
                "tool_id": "read_document",
                "connector_id": "local-pdf-connector",
                "description": "Read a seeded PDF document fixture by document_id.",
                "schema": {"type": "object", "required": ["document_id"], "properties": {"document_id": {"type": "string"}}},
                "side_effect": "READ_ONLY",
                "data_labels": ["PDF", "HIDDEN_LAYER", "UNTRUSTED_TEXT"],
                "required_privileges": ["documents:read"],
                "allowed_sinks": [],
                "sandbox_only": True,
            },
            {
                "tool_id": "read_email",
                "connector_id": "local-mail-connector",
                "description": "Read a seeded email message by message_id.",
                "schema": {"type": "object", "required": ["message_id"], "properties": {"message_id": {"type": "string"}}},
                "side_effect": "READ_ONLY",
                "data_labels": ["EMAIL", "UNTRUSTED_TEXT"],
                "required_privileges": ["emails:read"],
                "allowed_sinks": [],
                "sandbox_only": True,
            },
            {
                "tool_id": "move_mock_draft",
                "connector_id": "internal-queue-connector",
                "description": "Move an internal review draft to an approved internal queue.",
                "schema": {
                    "type": "object",
                    "required": ["draft_id", "queue_id"],
                    "properties": {"draft_id": {"type": "string"}, "queue_id": {"type": "string"}},
                },
                "side_effect": "INTERNAL_WRITE",
                "data_labels": ["DRAFT", "QUEUE_STATE"],
                "required_privileges": ["drafts:route"],
                "allowed_sinks": ["QUEUE-FINANCE-REVIEW", "QUEUE-TRIAGE"],
                "sandbox_only": True,
            },
            {
                "tool_id": "send_mock_attachment",
                "connector_id": "mock-external-relay",
                "description": "Dummy external transfer tool registered in sandbox manifest to demonstrate task-scope denial.",
                "schema": {
                    "type": "object",
                    "required": ["record_id", "mailbox_id"],
                    "properties": {"record_id": {"type": "string"}, "mailbox_id": {"type": "string"}},
                },
                "side_effect": "EXTERNAL_EGRESS",
                "data_labels": ["SENSITIVE_RECORD"],
                "required_privileges": ["external:send"],
                "allowed_sinks": ["MOCK-INBOX-01"],
                "sandbox_only": True,
            },
        ]
        for m in default_manifests:
            imported = self.import_manifest(m)
            self.approve_manifest(imported["tool_id"], approved_by="policy-seed")

    # ------------------------------------------------------------------
    # Manifests & Pinning
    # ------------------------------------------------------------------
    @staticmethod
    def _compute_manifest_fingerprint(manifest: dict[str, Any]) -> str:
        payload = {
            "tool_id": manifest["tool_id"],
            "connector_id": manifest["connector_id"],
            "description": manifest["description"],
            "schema": manifest["schema"],
            "side_effect": manifest["side_effect"],
            "required_privileges": manifest.get("required_privileges", []),
            "allowed_sinks": manifest.get("allowed_sinks", []),
        }
        return sha256_hex(canonical_json(payload))

    def import_manifest(self, manifest_input: dict[str, Any]) -> dict[str, Any]:
        """Import a tool schema into a DRAFT manifest with computed fingerprint."""
        tool_id = manifest_input["tool_id"]
        fp = self._compute_manifest_fingerprint(manifest_input)
        now = utc_now_iso()
        existing = self.store.fetch_one("SELECT * FROM manifests WHERE tool_id = ?", (tool_id,))
        approved_fp = existing["approved_fingerprint"] if existing else None
        status = existing["status"] if existing and existing["fingerprint"] == fp else "DRAFT"

        self.store.execute(
            """
            INSERT INTO manifests (
                tool_id, connector_id, description, schema_json, side_effect,
                data_labels_json, required_privileges_json, allowed_sinks_json,
                fingerprint, approved_fingerprint, status, sandbox_only, approved_by, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(tool_id) DO UPDATE SET
                connector_id=excluded.connector_id,
                description=excluded.description,
                schema_json=excluded.schema_json,
                side_effect=excluded.side_effect,
                data_labels_json=excluded.data_labels_json,
                required_privileges_json=excluded.required_privileges_json,
                allowed_sinks_json=excluded.allowed_sinks_json,
                fingerprint=excluded.fingerprint,
                status=CASE WHEN manifests.approved_fingerprint = excluded.fingerprint THEN manifests.status ELSE 'DRAFT' END,
                sandbox_only=excluded.sandbox_only,
                updated_at=excluded.updated_at
            """,
            (
                tool_id,
                manifest_input["connector_id"],
                manifest_input["description"],
                canonical_json(manifest_input["schema"]),
                manifest_input["side_effect"],
                canonical_json(manifest_input.get("data_labels", [])),
                canonical_json(manifest_input.get("required_privileges", [])),
                canonical_json(manifest_input.get("allowed_sinks", [])),
                fp,
                approved_fp,
                status,
                1 if manifest_input.get("sandbox_only") else 0,
                existing["approved_by"] if existing else None,
                now,
            ),
        )
        return self.get_manifest(tool_id)  # type: ignore[return-value]

    def approve_manifest(self, tool_id: str, *, approved_by: str = "operator") -> dict[str, Any]:
        row = self.store.fetch_one("SELECT * FROM manifests WHERE tool_id = ?", (tool_id,))
        if row is None:
            raise ValueError(f"Unknown manifest: {tool_id}")
        self.store.execute(
            """
            UPDATE manifests
            SET approved_fingerprint = fingerprint, status = 'APPROVED', approved_by = ?, updated_at = ?
            WHERE tool_id = ?
            """,
            (approved_by, utc_now_iso(), tool_id),
        )
        return self.get_manifest(tool_id)  # type: ignore[return-value]

    def get_manifest(self, tool_id: str) -> dict[str, Any] | None:
        row = self.store.fetch_one("SELECT * FROM manifests WHERE tool_id = ?", (tool_id,))
        if row is None:
            return None
        return {
            "tool_id": row["tool_id"],
            "connector_id": row["connector_id"],
            "description": row["description"],
            "schema": json.loads(row["schema_json"]),
            "side_effect": row["side_effect"],
            "data_labels": json.loads(row["data_labels_json"]),
            "required_privileges": json.loads(row["required_privileges_json"]),
            "allowed_sinks": json.loads(row["allowed_sinks_json"]),
            "fingerprint": row["fingerprint"],
            "approved_fingerprint": row["approved_fingerprint"],
            "status": row["status"],
            "sandbox_only": bool(row["sandbox_only"]),
            "approved_by": row["approved_by"],
            "updated_at": row["updated_at"],
            "pin_valid": row["status"] == "APPROVED" and row["fingerprint"] == row["approved_fingerprint"],
        }

    def list_manifests(self) -> list[dict[str, Any]]:
        rows = self.store.fetch_all("SELECT tool_id FROM manifests ORDER BY tool_id ASC")
        return [m for r in rows if (m := self.get_manifest(r["tool_id"])) is not None]

    def verify_manifest_pin(self, tool_id: str) -> tuple[bool, str, dict[str, Any] | None]:
        m = self.get_manifest(tool_id)
        if m is None:
            return False, "MANIFEST_UNKNOWN", None
        if m["sandbox_only"] and not self.sandbox_profile:
            return False, "SANDBOX_MANIFEST_DISABLED_IN_PROD", m
        if m["status"] != "APPROVED":
            return False, "MANIFEST_NOT_APPROVED", m
        if m["fingerprint"] != m["approved_fingerprint"]:
            return False, "MANIFEST_PIN_MISMATCH", m
        return True, "PIN_OK", m

    # ------------------------------------------------------------------
    # Contract compilation & Run creation
    # ------------------------------------------------------------------
    def compile_contract(
        self,
        template_id: str,
        parameters: dict[str, Any],
        *,
        tenant_id: str = "tenant-default",
    ) -> dict[str, Any]:
        if template_id not in self.templates:
            raise ValueError(f"Unknown template_id: {template_id!r}")
        tpl = self.templates[template_id]
        if tpl.get("sandbox_only") and not self.sandbox_profile:
            raise PermissionError(f"Template {template_id!r} requires sandbox profile.")

        scoped_resources: dict[str, list[str]] = {
            "files": [],
            "pages": [],
            "documents": [],
            "emails": [],
            "drafts": [],
            "queues": [],
        }

        if template_id == "extract_invoice":
            file_id = parameters.get("file_id")
            if not isinstance(file_id, str) or file_id not in self.authorized_records["files"]:
                raise ValueError(f"Invalid or unauthorized file_id: {file_id!r}")
            scoped_resources["files"] = [file_id]
        elif template_id == "compare_quotes":
            file_ids = parameters.get("file_ids")
            if not isinstance(file_ids, list) or len(file_ids) < 2 or not all(isinstance(x, str) for x in file_ids):
                raise ValueError("file_ids must be a list of at least two quote IDs")
            for fid in file_ids:
                if fid not in self.authorized_records["files"]:
                    raise ValueError(f"Unauthorized file_id in compare_quotes: {fid!r}")
            scoped_resources["files"] = list(dict.fromkeys(file_ids))
        elif template_id == "summarize_page":
            page_id = parameters.get("page_id")
            if not isinstance(page_id, str) or page_id not in self.authorized_records["pages"]:
                raise ValueError(f"Invalid or unauthorized page_id: {page_id!r}")
            scoped_resources["pages"] = [page_id]
        elif template_id == "summarize_document":
            document_id = parameters.get("document_id")
            if not isinstance(document_id, str) or document_id not in self.authorized_records["documents"]:
                raise ValueError(f"Invalid or unauthorized document_id: {document_id!r}")
            scoped_resources["documents"] = [document_id]
        elif template_id == "summarize_email":
            message_id = parameters.get("message_id")
            if not isinstance(message_id, str) or message_id not in self.authorized_records["emails"]:
                raise ValueError(f"Invalid or unauthorized message_id: {message_id!r}")
            scoped_resources["emails"] = [message_id]
        elif template_id == "route_review_draft":
            draft_id = parameters.get("draft_id")
            queue_id = parameters.get("queue_id")
            if not isinstance(draft_id, str) or draft_id not in self.authorized_records["drafts"]:
                raise ValueError(f"Invalid or unauthorized draft_id: {draft_id!r}")
            if not isinstance(queue_id, str) or queue_id not in APPROVED_INTERNAL_QUEUES:
                raise ValueError(f"Invalid or unapproved internal queue_id: {queue_id!r}")
            scoped_resources["drafts"] = [draft_id]
            scoped_resources["queues"] = [queue_id]

        contract_id = _new_id("CTR")
        return {
            "contract_id": contract_id,
            "tenant_id": tenant_id,
            "template_id": template_id,
            "template_version": tpl["version"],
            "policy_version": POLICY_VERSION,
            "parameters": copy.deepcopy(parameters),
            "allowed_tools": list(tpl["allowed_tools"]),
            "approval_tools": list(tpl["approval_tools"]),
            "denied_registered_tools": ["send_mock_attachment"],
            "scoped_resources": scoped_resources,
            "output_type": tpl["output_type"],
            "budgets": {
                "max_calls": 8,
                "max_bytes": 65536,
                "max_repeats_per_action": 3,
            },
            "default_policy": "DENY",
            "summary": tpl["description"],
        }

    def create_run(
        self,
        *,
        template_id: str,
        parameters: dict[str, Any],
        tenant_id: str = "tenant-default",
        mode: Mode = Mode.ENFORCE,
        comparison_id: str | None = None,
        fixture_id: str | None = None,
        fixture_version: str | None = None,
        agent_id: str | None = None,
        evidence_source: str = "product",
    ) -> dict[str, Any]:
        if not self.sandbox_profile and mode != Mode.ENFORCE:
            raise PermissionError("Production profile only permits ENFORCE mode.")
        if not self.sandbox_profile and (comparison_id or fixture_id or fixture_version):
            raise PermissionError("Sandbox metadata fields are rejected in production profile.")

        contract = self.compile_contract(template_id, parameters, tenant_id=tenant_id)
        run_id = _new_id("RUN")
        now = utc_now_iso()

        self.store.execute(
            """
            INSERT INTO runs (
                run_id, tenant_id, template_id, contract_id, contract_json,
                policy_version, mode, status, comparison_id, fixture_id,
                fixture_version, evidence_source, agent_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                tenant_id,
                template_id,
                contract["contract_id"],
                canonical_json(contract),
                POLICY_VERSION,
                mode.value,
                RunStatus.ACTIVE.value,
                comparison_id,
                fixture_id,
                fixture_version,
                evidence_source,
                agent_id,
                now,
            ),
        )
        if agent_id:
            self._record_agent_seen(agent_id, contract["allowed_tools"] + contract["approval_tools"])

        self.store.append_hash_chained_event(
            event_id=f"evt-run-start-{run_id}",
            run_id=run_id,
            action_id=None,
            origin="product",
            kind="RUN_CREATED",
            outcome="ACTIVE",
            details={
                "template_id": template_id,
                "contract_id": contract["contract_id"],
                "mode": mode.value,
                "evidence_source": evidence_source,
            },
            recorded_at=now,
        )

        return {
            "run_id": run_id,
            "contract_id": contract["contract_id"],
            "policy_version": POLICY_VERSION,
            "contract_summary": contract,
            "mode": mode,
            "status": RunStatus.ACTIVE,
        }

    # ------------------------------------------------------------------
    # Canonicalization & Deterministic Policy Evaluation
    # ------------------------------------------------------------------
    def canonicalize(
        self,
        tool_id: str,
        arguments: dict[str, Any],
    ) -> tuple[bool, dict[str, Any] | None, str]:
        if not isinstance(tool_id, str) or not tool_id.strip():
            return False, None, "INVALID_TOOL_NAME"
        if not isinstance(arguments, dict):
            return False, None, "INVALID_ARG_TYPE"

        if tool_id == "read_file":
            fid = arguments.get("file_id")
            if set(arguments.keys()) != {"file_id"} or not isinstance(fid, str) or not fid.strip():
                return False, None, "INVALID_ARG_TYPE"
            return True, {"file_id": fid.strip()}, "OK"
        if tool_id == "read_page":
            pid = arguments.get("page_id")
            if set(arguments.keys()) != {"page_id"} or not isinstance(pid, str) or not pid.strip():
                return False, None, "INVALID_ARG_TYPE"
            return True, {"page_id": pid.strip()}, "OK"
        if tool_id == "read_document":
            did = arguments.get("document_id")
            if set(arguments.keys()) != {"document_id"} or not isinstance(did, str) or not did.strip():
                return False, None, "INVALID_ARG_TYPE"
            return True, {"document_id": did.strip()}, "OK"
        if tool_id == "read_email":
            mid = arguments.get("message_id")
            if set(arguments.keys()) != {"message_id"} or not isinstance(mid, str) or not mid.strip():
                return False, None, "INVALID_ARG_TYPE"
            return True, {"message_id": mid.strip()}, "OK"
        if tool_id == "move_mock_draft":
            did = arguments.get("draft_id")
            qid = arguments.get("queue_id")
            if (
                set(arguments.keys()) != {"draft_id", "queue_id"}
                or not isinstance(did, str)
                or not did.strip()
                or not isinstance(qid, str)
                or not qid.strip()
            ):
                return False, None, "INVALID_ARG_TYPE"
            return True, {"draft_id": did.strip(), "queue_id": qid.strip()}, "OK"
        if tool_id == "send_mock_attachment":
            rid = arguments.get("record_id")
            mid = arguments.get("mailbox_id")
            if (
                set(arguments.keys()) != {"record_id", "mailbox_id"}
                or not isinstance(rid, str)
                or not rid.strip()
                or not isinstance(mid, str)
                or not mid.strip()
            ):
                return False, None, "INVALID_ARG_TYPE"
            return True, {"record_id": rid.strip(), "mailbox_id": mid.strip()}, "OK"
        return False, None, "DEFAULT_DENY_UNKNOWN_TOOL"

    def _get_run_row(self, run_id: str, tenant_id: str | None = None) -> dict[str, Any]:
        row = self.store.fetch_one("SELECT * FROM runs WHERE run_id = ?", (run_id,))
        if row is None:
            raise KeyError(f"Run not found: {run_id}")
        if tenant_id is not None and row["tenant_id"] != tenant_id:
            raise PermissionError("Cross-tenant/session run access denied.")
        return row

    def evaluate(
        self,
        *,
        run_id: str,
        action_id: str,
        tool_id: str,
        arguments: dict[str, Any],
        source_refs: list[str] | None = None,
        risk_signal: dict[str, Any] | None = None,
        tenant_id: str | None = None,
    ) -> dict[str, Any]:
        """Evaluate an action against manifest pin, canonical args, contract scope, budgets, and approvals."""
        with self.store.lock():
            run = self._get_run_row(run_id, tenant_id=tenant_id)
            contract = json.loads(run["contract_json"])
            args_hash = sha256_hex(canonical_json({"tool_id": tool_id, "arguments": arguments}))

            existing = self.store.fetch_one(
                "SELECT * FROM decisions WHERE run_id = ? AND action_id = ?",
                (run_id, action_id),
            )
            if existing is not None:
                if existing["args_hash"] != args_hash:
                    raise ValueError("CONFLICT_ACTION_ID_REUSE")
                return {
                    "decision_id": existing["decision_id"],
                    "verdict": Verdict(existing["verdict"]),
                    "rule_id": existing["rule_id"],
                    "reason": existing["reason"],
                    "canonical_arguments": (
                        json.loads(existing["canonical_arguments_json"])
                        if existing["canonical_arguments_json"]
                        else None
                    ),
                    "approval_id": existing["approval_id"],
                }

            decision_id = _new_id("DEC")
            approval_id: str | None = None
            canonical_args: dict[str, Any] | None = None

            if run["status"] == RunStatus.STOPPED.value:
                verdict = Verdict.BLOCK
                rule_id = "RUN_STOPPED"
                reason = "Run has been stopped by an operator; all subsequent calls are blocked."
            else:
                pin_ok, pin_rule, manifest = self.verify_manifest_pin(tool_id)
                if not pin_ok:
                    verdict = Verdict.BLOCK
                    rule_id = pin_rule
                    reason = f"Tool {tool_id!r} failed manifest/pin verification ({pin_rule})."
                else:
                    canon_ok, canonical_args, canon_rule = self.canonicalize(tool_id, arguments)
                    if not canon_ok or canonical_args is None:
                        verdict = Verdict.BLOCK
                        rule_id = canon_rule
                        reason = f"Tool {tool_id!r} failed typed argument canonicalization ({canon_rule})."
                    else:
                        verdict, rule_id, reason, approval_id = self._evaluate_contract_and_budgets(
                            run=run,
                            contract=contract,
                            manifest=manifest,  # type: ignore[arg-type]
                            tool_id=tool_id,
                            canonical_args=canonical_args,
                            risk_signal=risk_signal,
                        )

            self.store.execute(
                """
                INSERT INTO decisions (
                    decision_id, run_id, action_id, tool_id, arguments_json,
                    canonical_arguments_json, args_hash, verdict, rule_id, reason,
                    approval_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    decision_id,
                    run_id,
                    action_id,
                    tool_id,
                    canonical_json(redact_value(arguments)),
                    canonical_json(canonical_args) if canonical_args is not None else None,
                    args_hash,
                    verdict.value,
                    rule_id,
                    reason,
                    approval_id,
                    utc_now_iso(),
                ),
            )

            if run["agent_id"] and verdict == Verdict.BLOCK:
                self._record_agent_deviation(run["agent_id"], tool_id, rule_id)

            self.store.append_hash_chained_event(
                event_id=f"evt-check-{decision_id}",
                run_id=run_id,
                action_id=action_id,
                origin="product",
                kind="POLICY_CHECK",
                outcome=verdict.value,
                details=redact_value(
                    {
                        "decision_id": decision_id,
                        "tool_id": tool_id,
                        "canonical_arguments": canonical_args,
                        "rule_id": rule_id,
                        "reason": reason,
                        "approval_id": approval_id,
                        "source_refs": source_refs or [],
                    }
                ),
            )

            return {
                "decision_id": decision_id,
                "verdict": verdict,
                "rule_id": rule_id,
                "reason": reason,
                "canonical_arguments": canonical_args,
                "approval_id": approval_id,
            }

    def _evaluate_contract_and_budgets(
        self,
        *,
        run: dict[str, Any],
        contract: dict[str, Any],
        manifest: dict[str, Any],
        tool_id: str,
        canonical_args: dict[str, Any],
        risk_signal: dict[str, Any] | None,
    ) -> tuple[Verdict, str, str, str | None]:
        # 1. Explicit denied registered tool check (e.g. send_mock_attachment)
        if tool_id in contract.get("denied_registered_tools", []):
            return (
                Verdict.BLOCK,
                "TOOL_OUTSIDE_CONTRACT",
                f"Tool {tool_id!r} is registered in the manifest but excluded from contract {contract['contract_id']}.",
                None,
            )

        allowed_tools = set(contract.get("allowed_tools", []))
        approval_tools = set(contract.get("approval_tools", []))
        if tool_id not in allowed_tools and tool_id not in approval_tools:
            return (
                Verdict.BLOCK,
                "DEFAULT_DENY_UNKNOWN_TOOL",
                f"Tool {tool_id!r} is not permitted by contract {contract['contract_id']}.",
                None,
            )

        # 2. Read-only quarantine check
        if bool(run["read_only_quarantine"]) and manifest["side_effect"] != "READ_ONLY":
            return (
                Verdict.BLOCK,
                "READ_ONLY_QUARANTINE_ACTIVE",
                "Run is in read-only quarantine; state-changing tools are blocked.",
                None,
            )

        # 3. Budget checks (calls + repeats)
        budgets = contract["budgets"]
        if run["calls_used"] >= budgets["max_calls"]:
            return (
                Verdict.BLOCK,
                "BUDGET_CALL_LIMIT_EXCEEDED",
                f"Cumulative call budget ({budgets['max_calls']}) exhausted.",
                None,
            )
        if run["bytes_used"] >= budgets["max_bytes"]:
            return (
                Verdict.BLOCK,
                "BUDGET_BYTE_LIMIT_EXCEEDED",
                f"Cumulative byte budget ({budgets['max_bytes']}) exhausted.",
                None,
            )
        repeat_key = sha256_hex(canonical_json({"tool_id": tool_id, "args": canonical_args}))
        repeats = json.loads(run["repeat_counts_json"])
        if repeats.get(repeat_key, 0) >= budgets["max_repeats_per_action"]:
            return (
                Verdict.BLOCK,
                "REPEAT_CALL_LIMIT_EXCEEDED",
                f"Action repeat limit ({budgets['max_repeats_per_action']}) reached.",
                None,
            )

        # 4. Exact resource scope & sink checks
        scoped = contract["scoped_resources"]
        if tool_id == "read_file":
            if canonical_args["file_id"] not in scoped["files"]:
                return (
                    Verdict.BLOCK,
                    "SCOPE_MISMATCH_FILE_ID",
                    f"file_id {canonical_args['file_id']!r} is outside scoped files {scoped['files']}.",
                    None,
                )
        elif tool_id == "read_page":
            if canonical_args["page_id"] not in scoped["pages"]:
                return (
                    Verdict.BLOCK,
                    "SCOPE_MISMATCH_PAGE_ID",
                    f"page_id {canonical_args['page_id']!r} is outside scoped pages {scoped['pages']}.",
                    None,
                )
        elif tool_id == "read_document":
            if canonical_args["document_id"] not in scoped["documents"]:
                return (
                    Verdict.BLOCK,
                    "SCOPE_MISMATCH_DOCUMENT_ID",
                    f"document_id {canonical_args['document_id']!r} is outside scoped documents {scoped['documents']}.",
                    None,
                )
        elif tool_id == "read_email":
            if canonical_args["message_id"] not in scoped["emails"]:
                return (
                    Verdict.BLOCK,
                    "SCOPE_MISMATCH_MESSAGE_ID",
                    f"message_id {canonical_args['message_id']!r} is outside scoped emails {scoped['emails']}.",
                    None,
                )
        elif tool_id == "move_mock_draft":
            if canonical_args["draft_id"] not in scoped["drafts"]:
                return (
                    Verdict.BLOCK,
                    "SCOPE_MISMATCH_DRAFT_ID",
                    f"draft_id {canonical_args['draft_id']!r} is outside scoped drafts {scoped['drafts']}.",
                    None,
                )
            if canonical_args["queue_id"] not in scoped["queues"]:
                return (
                    Verdict.BLOCK,
                    "UNAUTHORIZED_DESTINATION_QUEUE",
                    f"queue_id {canonical_args['queue_id']!r} is outside approved destination queues {scoped['queues']}.",
                    None,
                )

        # 5. Optional tighten-only intent/risk signal (NEVER relaxes a deny)
        if risk_signal and risk_signal.get("tighten_to_quarantine"):
            self.store.execute(
                "UPDATE runs SET read_only_quarantine = 1 WHERE run_id = ?",
                (run["run_id"],),
            )
            if manifest["side_effect"] != "READ_ONLY":
                return (
                    Verdict.BLOCK,
                    "TIGHTEN_ONLY_RISK_QUARANTINE",
                    "Tighten-only risk signal activated read-only quarantine.",
                    None,
                )

        # 6. Approval-gated tools
        if tool_id in approval_tools:
            approval = self.create_approval(
                run_id=run["run_id"],
                tool_id=tool_id,
                canonical_args=canonical_args,
                before_state={"draft_id": canonical_args["draft_id"], "queue_id": "QUEUE-TRIAGE"},
                after_state={"draft_id": canonical_args["draft_id"], "queue_id": canonical_args["queue_id"]},
            )
            return (
                Verdict.ASK_HUMAN,
                "APPROVAL_REQUIRED_INTERNAL_MOVE",
                f"Tool {tool_id!r} requires explicit human approval bound to canonical argument digest.",
                approval["approval_id"],
            )

        return (
            Verdict.ALLOW,
            "RULE_ALLOW_SCOPED_READ",
            f"Tool {tool_id!r} matches manifest pin and exact contract scope.",
            None,
        )

    # ------------------------------------------------------------------
    # Approvals
    # ------------------------------------------------------------------
    def create_approval(
        self,
        *,
        run_id: str,
        tool_id: str,
        canonical_args: dict[str, Any],
        before_state: dict[str, Any] | None = None,
        after_state: dict[str, Any] | None = None,
        ttl_seconds: int = 900,
    ) -> dict[str, Any]:
        run = self._get_run_row(run_id)
        approval_id = _new_id("APR")
        digest = sha256_hex(canonical_json({"tool_id": tool_id, "arguments": canonical_args}))
        now_dt = datetime.now(timezone.utc)
        expires_at = (now_dt + timedelta(seconds=ttl_seconds)).strftime("%Y-%m-%dT%H:%M:%SZ")
        now = now_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        self.store.execute(
            """
            INSERT INTO approvals (
                approval_id, run_id, tenant_id, contract_id, tool_id,
                argument_digest, canonical_arguments_json, before_state_json,
                after_state_json, status, expires_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                approval_id,
                run_id,
                run["tenant_id"],
                run["contract_id"],
                tool_id,
                digest,
                canonical_json(canonical_args),
                canonical_json(before_state) if before_state else None,
                canonical_json(after_state) if after_state else None,
                ApprovalStatus.PENDING.value,
                expires_at,
                now,
            ),
        )
        return self.get_approval(approval_id)  # type: ignore[return-value]

    def get_approval(self, approval_id: str) -> dict[str, Any] | None:
        row = self.store.fetch_one("SELECT * FROM approvals WHERE approval_id = ?", (approval_id,))
        if row is None:
            return None
        return {
            "approval_id": row["approval_id"],
            "run_id": row["run_id"],
            "tenant_id": row["tenant_id"],
            "contract_id": row["contract_id"],
            "tool_id": row["tool_id"],
            "argument_digest": row["argument_digest"],
            "canonical_arguments": json.loads(row["canonical_arguments_json"]),
            "before_state": json.loads(row["before_state_json"]) if row["before_state_json"] else None,
            "after_state": json.loads(row["after_state_json"]) if row["after_state_json"] else None,
            "status": ApprovalStatus(row["status"]),
            "expires_at": row["expires_at"],
            "decided_by": row["decided_by"],
            "decided_at": row["decided_at"],
            "consumed_at": row["consumed_at"],
            "created_at": row["created_at"],
        }

    def resolve_approval(
        self,
        *,
        run_id: str,
        approval_id: str,
        decision: ApprovalDecision,
        reviewer_id: str = "reviewer-1",
        tenant_id: str | None = None,
    ) -> dict[str, Any]:
        with self.store.lock():
            run = self._get_run_row(run_id, tenant_id=tenant_id)
            apr = self.get_approval(approval_id)
            if apr is None or apr["run_id"] != run["run_id"]:
                raise KeyError(f"Approval {approval_id!r} not found for run {run_id!r}.")
            if apr["status"] in (ApprovalStatus.CONSUMED, ApprovalStatus.EXPIRED):
                raise ValueError(f"Approval already finalized with status {apr['status'].value}.")
            if apr["expires_at"] < utc_now_iso():
                self.store.execute(
                    "UPDATE approvals SET status = ? WHERE approval_id = ?",
                    (ApprovalStatus.EXPIRED.value, approval_id),
                )
                raise ValueError("Approval has expired.")
            if apr["status"] != ApprovalStatus.PENDING:
                # Idempotent if same decision replayed
                if (
                    (decision == ApprovalDecision.APPROVE and apr["status"] == ApprovalStatus.APPROVED)
                    or (decision == ApprovalDecision.REJECT and apr["status"] == ApprovalStatus.REJECTED)
                ):
                    return apr
                raise ValueError(f"Approval already resolved as {apr['status'].value}.")

            new_status = (
                ApprovalStatus.APPROVED if decision == ApprovalDecision.APPROVE else ApprovalStatus.REJECTED
            )
            now = utc_now_iso()
            self.store.execute(
                """
                UPDATE approvals
                SET status = ?, decided_by = ?, decided_at = ?
                WHERE approval_id = ?
                """,
                (new_status.value, reviewer_id, now, approval_id),
            )
            self.store.append_hash_chained_event(
                event_id=f"evt-apr-{approval_id}-{new_status.value}",
                run_id=run_id,
                action_id=None,
                origin="product",
                kind="APPROVAL_RESOLVED",
                outcome=new_status.value,
                details={
                    "approval_id": approval_id,
                    "reviewer_id": reviewer_id,
                    "argument_digest": apr["argument_digest"],
                    "before_state": apr["before_state"],
                    "after_state": apr["after_state"],
                },
                recorded_at=now,
            )
            return self.get_approval(approval_id)  # type: ignore[return-value]

    def expire_approval_for_test(self, approval_id: str) -> None:
        self.store.execute(
            "UPDATE approvals SET expires_at = '2000-01-01T00:00:00Z' WHERE approval_id = ?",
            (approval_id,),
        )

    def consume_approval(
        self,
        *,
        run_id: str,
        approval_id: str,
        tool_id: str,
        canonical_args: dict[str, Any],
    ) -> tuple[bool, str]:
        """Atomically verify and consume an approval bound to exact run/tool/argument digest."""
        with self.store.lock():
            apr = self.get_approval(approval_id)
            if apr is None or apr["run_id"] != run_id:
                return False, "APPROVAL_NOT_FOUND"
            if apr["expires_at"] < utc_now_iso():
                self.store.execute(
                    "UPDATE approvals SET status = ? WHERE approval_id = ?",
                    (ApprovalStatus.EXPIRED.value, approval_id),
                )
                return False, "APPROVAL_EXPIRED"
            if apr["status"] == ApprovalStatus.REJECTED:
                return False, "APPROVAL_REJECTED"
            if apr["status"] == ApprovalStatus.CONSUMED:
                return False, "APPROVAL_ALREADY_CONSUMED"
            if apr["status"] != ApprovalStatus.APPROVED:
                return False, "APPROVAL_PENDING"

            expected_digest = sha256_hex(canonical_json({"tool_id": tool_id, "arguments": canonical_args}))
            if apr["argument_digest"] != expected_digest:
                return False, "APPROVAL_ARGUMENT_DIGEST_MISMATCH"

            cur = self.store.execute(
                """
                UPDATE approvals
                SET status = ?, consumed_at = ?
                WHERE approval_id = ? AND status = ?
                """,
                (ApprovalStatus.CONSUMED.value, utc_now_iso(), approval_id, ApprovalStatus.APPROVED.value),
            )
            if cur.rowcount != 1:
                return False, "APPROVAL_ALREADY_CONSUMED"
            return True, "APPROVAL_CONSUMED"

    # ------------------------------------------------------------------
    # Sandbox Execution Gate & Guarded Dispatcher
    # ------------------------------------------------------------------
    def _reserve_execution(
        self,
        *,
        run_id: str,
        action_id: str,
        decision_id: str,
        approval_id: str | None = None,
        override_arguments: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        with self.store.lock():
            existing_res = self.store.fetch_one(
                "SELECT * FROM reservations WHERE run_id = ? AND action_id = ?",
                (run_id, action_id),
            )
            if existing_res is not None:
                if existing_res["decision_id"] != decision_id:
                    return {
                        "status": AuthorizeStatus.DENIED,
                        "rule_id": "RESERVATION_CONFLICT",
                        "reason": "Action already reserved with a different decision.",
                        "reservation_id": None,
                        "canonical_arguments": None,
                    }
                return {
                    "status": AuthorizeStatus(existing_res["status"]),
                    "rule_id": "RESERVATION_REPLAYED",
                    "reason": "Returning existing atomic dispatch reservation.",
                    "reservation_id": existing_res["reservation_id"],
                    "canonical_arguments": json.loads(existing_res["canonical_arguments_json"]),
                }

            run = self._get_run_row(run_id)
            if run["status"] == RunStatus.STOPPED.value:
                return {
                    "status": AuthorizeStatus.DENIED,
                    "rule_id": "RUN_STOPPED",
                    "reason": "Run has been stopped; dispatch denied.",
                    "reservation_id": None,
                    "canonical_arguments": None,
                }

            dec = self.store.fetch_one(
                "SELECT * FROM decisions WHERE decision_id = ? AND run_id = ? AND action_id = ?",
                (decision_id, run_id, action_id),
            )
            if dec is None:
                return {
                    "status": AuthorizeStatus.DENIED,
                    "rule_id": "DECISION_NOT_FOUND",
                    "reason": "Decision not found for run and action.",
                    "reservation_id": None,
                    "canonical_arguments": None,
                }

            verdict = Verdict(dec["verdict"])
            if verdict == Verdict.BLOCK:
                return {
                    "status": AuthorizeStatus.DENIED,
                    "rule_id": dec["rule_id"],
                    "reason": dec["reason"],
                    "reservation_id": None,
                    "canonical_arguments": None,
                }

            tool_id = dec["tool_id"]
            pin_ok, pin_rule, manifest = self.verify_manifest_pin(tool_id)
            if not pin_ok or manifest is None:
                return {
                    "status": AuthorizeStatus.DENIED,
                    "rule_id": pin_rule,
                    "reason": f"Manifest pin check failed at dispatch ({pin_rule}).",
                    "reservation_id": None,
                    "canonical_arguments": None,
                }

            canonical_args = json.loads(dec["canonical_arguments_json"])
            if override_arguments is not None:
                canon_ok, parsed_override, _ = self.canonicalize(tool_id, override_arguments)
                if not canon_ok or parsed_override != canonical_args:
                    return {
                        "status": AuthorizeStatus.DENIED,
                        "rule_id": "ARGUMENT_TAMPERING_DETECTED",
                        "reason": "Dispatch arguments do not match canonical checked arguments.",
                        "reservation_id": None,
                        "canonical_arguments": None,
                    }

            contract = json.loads(run["contract_json"])
            budgets = contract["budgets"]
            if run["calls_used"] >= budgets["max_calls"]:
                return {
                    "status": AuthorizeStatus.DENIED,
                    "rule_id": "BUDGET_CALL_LIMIT_EXCEEDED",
                    "reason": "Call budget exceeded at dispatch.",
                    "reservation_id": None,
                    "canonical_arguments": None,
                }

            if verdict == Verdict.ASK_HUMAN:
                effective_apr_id = approval_id or dec["approval_id"]
                if not effective_apr_id:
                    return {
                        "status": AuthorizeStatus.DENIED,
                        "rule_id": "APPROVAL_REQUIRED",
                        "reason": "Approval ID required to authorize this action.",
                        "reservation_id": None,
                        "canonical_arguments": None,
                    }
                ok_apr, apr_rule = self.consume_approval(
                    run_id=run_id,
                    approval_id=effective_apr_id,
                    tool_id=tool_id,
                    canonical_args=canonical_args,
                )
                if not ok_apr:
                    return {
                        "status": AuthorizeStatus.DENIED,
                        "rule_id": apr_rule,
                        "reason": f"Approval gate denied dispatch ({apr_rule}).",
                        "reservation_id": None,
                        "canonical_arguments": None,
                    }

            # Atomically reserve call budget & repeat counter
            repeat_key = sha256_hex(canonical_json({"tool_id": tool_id, "args": canonical_args}))
            repeats = json.loads(run["repeat_counts_json"])
            repeats[repeat_key] = repeats.get(repeat_key, 0) + 1
            self.store.execute(
                "UPDATE runs SET calls_used = calls_used + 1, repeat_counts_json = ? WHERE run_id = ?",
                (canonical_json(repeats), run_id),
            )

            reservation_id = _new_id("RSV")
            self.store.execute(
                """
                INSERT INTO reservations (
                    reservation_id, run_id, action_id, decision_id, approval_id,
                    tool_id, canonical_arguments_json, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    reservation_id,
                    run_id,
                    action_id,
                    decision_id,
                    approval_id or dec["approval_id"],
                    tool_id,
                    canonical_json(canonical_args),
                    AuthorizeStatus.AUTHORIZED.value,
                    utc_now_iso(),
                ),
            )

            # Scoped credential handle (never returned to agent)
            self.broker.issue_scoped_handle(
                run_id=run_id,
                connector_id=manifest["connector_id"],
                allowed_scope=f"{tool_id}:{canonical_json(canonical_args)}",
            )

            self.store.append_hash_chained_event(
                event_id=f"evt-rsv-{reservation_id}",
                run_id=run_id,
                action_id=action_id,
                origin="product",
                kind="DISPATCH_RESERVED",
                outcome="AUTHORIZED",
                details={
                    "reservation_id": reservation_id,
                    "decision_id": decision_id,
                    "tool_id": tool_id,
                    "canonical_arguments": canonical_args,
                },
            )
            return {
                "status": AuthorizeStatus.AUTHORIZED,
                "rule_id": "AUTHORIZED",
                "reason": "Action revalidated and reserved for single execution.",
                "reservation_id": reservation_id,
                "canonical_arguments": canonical_args,
            }

    def authorize_mock(
        self,
        *,
        run_id: str,
        action_id: str,
        decision_id: str,
        approval_id: str | None = None,
        arguments: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not self.sandbox_profile:
            raise PermissionError("authorize-mock is only available in sandbox profile.")
        return self._reserve_execution(
            run_id=run_id,
            action_id=action_id,
            decision_id=decision_id,
            approval_id=approval_id,
            override_arguments=arguments,
        )

    def dispatch_guarded(
        self,
        *,
        run_id: str,
        action_id: str,
        tool_id: str,
        arguments: dict[str, Any],
        approval_id: str | None = None,
        source_refs: list[str] | None = None,
    ) -> dict[str, Any]:
        """Full guarded production dispatch: evaluate -> reserve -> execute -> ingest -> audit."""
        check = self.evaluate(
            run_id=run_id,
            action_id=action_id,
            tool_id=tool_id,
            arguments=arguments,
            source_refs=source_refs,
        )
        if check["verdict"] == Verdict.BLOCK:
            return {
                "dispatched": False,
                "decision": check,
                "result": None,
                "ingested": None,
            }
        reservation = self._reserve_execution(
            run_id=run_id,
            action_id=action_id,
            decision_id=check["decision_id"],
            approval_id=approval_id,
            override_arguments=arguments,
        )
        if reservation["status"] != AuthorizeStatus.AUTHORIZED:
            return {
                "dispatched": False,
                "decision": check,
                "reservation": reservation,
                "result": None,
                "ingested": None,
            }

        executor = self._executors.get(tool_id)
        if executor is None:
            self.store.append_hash_chained_event(
                event_id=f"evt-err-{action_id}",
                run_id=run_id,
                action_id=action_id,
                origin="product",
                kind="DISPATCH_OUTCOME",
                outcome="UNCERTAIN_OR_MISSING_EXECUTOR",
                details={"tool_id": tool_id, "error": "No executor registered."},
            )
            raise RuntimeError(f"No executor registered for tool {tool_id!r}")

        raw_result = executor(reservation["canonical_arguments"])
        carrier_map = {
            "read_file": "image_ocr",
            "read_page": "webpage",
            "read_document": "pdf_document",
            "read_email": "email",
        }
        carrier = carrier_map.get(tool_id, "tool_result")
        ingested = self.ingest(
            run_id=run_id,
            carrier=carrier,
            source_ref=canonical_json(reservation["canonical_arguments"]),
            raw_record=raw_result,
        )
        byte_len = len(canonical_json(raw_result).encode("utf-8"))
        self.store.execute(
            "UPDATE runs SET bytes_used = bytes_used + ? WHERE run_id = ?",
            (byte_len, run_id),
        )
        self.store.append_hash_chained_event(
            event_id=f"evt-disp-{action_id}",
            run_id=run_id,
            action_id=action_id,
            origin="product",
            kind="DISPATCH_OUTCOME",
            outcome="SUCCEEDED",
            details={
                "reservation_id": reservation["reservation_id"],
                "tool_id": tool_id,
                "bytes_ingested": byte_len,
                "artifact_id": ingested["artifact_id"],
            },
        )
        return {
            "dispatched": True,
            "decision": check,
            "reservation": reservation,
            "result": raw_result,
            "ingested": ingested,
        }

    # ------------------------------------------------------------------
    # Ingestion & Memory Quarantine
    # ------------------------------------------------------------------
    def ingest(
        self,
        *,
        run_id: str,
        carrier: str,
        source_ref: str,
        raw_record: dict[str, Any],
        trust: str = "UNTRUSTED",
        sensitivity: str = "INTERNAL",
    ) -> dict[str, Any]:
        self._get_run_row(run_id)
        normalized = ingest_payload(
            carrier=carrier,
            source_ref=source_ref,
            raw_record=raw_record,
            trust=trust,
            sensitivity=sensitivity,
        )
        artifact_id = _new_id("ART")
        now = utc_now_iso()
        self.store.execute(
            """
            INSERT INTO ingested_artifacts (
                artifact_id, run_id, carrier, source_ref, trust, sensitivity,
                visible_text, extracted_text, spans_json, risk_signal_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                artifact_id,
                run_id,
                normalized["carrier"],
                normalized["source_ref"],
                normalized["trust"],
                normalized["sensitivity"],
                normalized["visible_text"],
                normalized["extracted_text"],
                canonical_json(normalized["spans"]),
                canonical_json(normalized["risk_signal"]),
                now,
            ),
        )
        return {"artifact_id": artifact_id, **normalized, "created_at": now}

    def write_memory(
        self,
        *,
        run_id: str,
        namespace: str,
        content: str,
        provenance: str,
        source_trust: str = "UNTRUSTED",
    ) -> dict[str, Any]:
        self._get_run_row(run_id)
        quarantined = source_trust.upper() != "TRUSTED"
        memory_id = _new_id("MEM")
        now = utc_now_iso()
        clean_content = redact_text(content)
        self.store.execute(
            """
            INSERT INTO memory_entries (
                memory_id, run_id, namespace, content, provenance, source_trust, quarantined, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (memory_id, run_id, namespace, clean_content, provenance, source_trust.upper(), 1 if quarantined else 0, now),
        )
        return {
            "memory_id": memory_id,
            "run_id": run_id,
            "namespace": namespace,
            "content": clean_content,
            "provenance": provenance,
            "source_trust": source_trust.upper(),
            "quarantined": quarantined,
            "created_at": now,
        }

    def list_memory(self) -> list[dict[str, Any]]:
        rows = self.store.fetch_all("SELECT * FROM memory_entries ORDER BY created_at DESC")
        return [{**r, "quarantined": bool(r["quarantined"])} for r in rows]

    # ------------------------------------------------------------------
    # Output Validation Gate
    # ------------------------------------------------------------------
    def validate_output(
        self,
        *,
        run_id: str,
        output_id: str,
        answer: dict[str, Any],
        source_refs: list[str] | None = None,
        tenant_id: str | None = None,
    ) -> dict[str, Any]:
        run = self._get_run_row(run_id, tenant_id=tenant_id)
        contract = json.loads(run["contract_json"])
        output_type = contract["output_type"]

        if not isinstance(answer, dict):
            res = {
                "verdict": OutputVerdict.BLOCK,
                "rule_id": "OUTPUT_INVALID_TYPE",
                "reason": "Structured answer must be a JSON object.",
                "answer": None,
            }
            self._persist_output_verdict(run_id, output_id, res, source_refs)
            return res

        # Sensitive data & script sanitization
        raw_serialized = canonical_json(answer)
        sanitized = self._sanitize_output_structure(answer)
        was_sanitized = canonical_json(sanitized) != raw_serialized

        # Validate domain-specific schema & arithmetic/ranking
        ok, rule_id, reason = self._validate_output_domain(output_type, sanitized, contract)
        if not ok:
            res = {
                "verdict": OutputVerdict.BLOCK,
                "rule_id": rule_id,
                "reason": reason,
                "answer": None,
            }
            self._persist_output_verdict(run_id, output_id, res, source_refs)
            return res

        # Re-verify sanitized output before release
        if was_sanitized:
            ok2, rule2, reason2 = self._validate_output_domain(output_type, sanitized, contract)
            if not ok2:
                res = {
                    "verdict": OutputVerdict.BLOCK,
                    "rule_id": rule2,
                    "reason": f"Post-sanitization re-check failed: {reason2}",
                    "answer": None,
                }
                self._persist_output_verdict(run_id, output_id, res, source_refs)
                return res
            res = {
                "verdict": OutputVerdict.SANITIZED,
                "rule_id": "OUTPUT_SANITIZED_AND_REVERIFIED",
                "reason": "Sensitive patterns or unsafe markup were sanitized and re-verified.",
                "answer": sanitized,
            }
        else:
            res = {
                "verdict": OutputVerdict.PASS,
                "rule_id": "OUTPUT_VALIDATED",
                "reason": reason,
                "answer": sanitized,
            }

        self._persist_output_verdict(run_id, output_id, res, source_refs)
        return res

    def _sanitize_output_structure(self, obj: Any) -> Any:
        if isinstance(obj, str):
            no_script = re.sub(r"<\s*script[^>]*>.*?<\s*/\s*script\s*>", "", obj, flags=re.IGNORECASE | re.DOTALL)
            escaped = html.escape(no_script, quote=False) if ("<" in no_script or ">" in no_script) else no_script
            return redact_text(escaped)
        if isinstance(obj, list):
            return [self._sanitize_output_structure(v) for v in obj]
        if isinstance(obj, dict):
            return {k: self._sanitize_output_structure(v) for k, v in obj.items()}
        return copy.deepcopy(obj)

    def _validate_output_domain(
        self,
        output_type: str,
        answer: dict[str, Any],
        contract: dict[str, Any],
    ) -> tuple[bool, str, str]:
        if output_type == "invoice":
            for req in ("vendor", "date", "currency", "total"):
                v = answer.get(req)
                if not isinstance(v, str) or not v.strip():
                    return False, "OUTPUT_MISSING_REQUIRED_FIELD", f"Missing required invoice field: {req}."
            if answer["currency"] != "USD":
                return False, "OUTPUT_CURRENCY_MISMATCH", "Invoice currency must be USD."
            items = answer.get("line_items")
            if not isinstance(items, list) or not items:
                return False, "OUTPUT_MISSING_LINE_ITEMS", "line_items must be a non-empty list."
            computed_cents = 0
            try:
                for idx, item in enumerate(items, start=1):
                    if not isinstance(item, dict) or not str(item.get("description", "")).strip():
                        return False, "OUTPUT_INVALID_LINE_ITEM", f"Line item {idx} invalid."
                    qty = Decimal(str(item.get("quantity")))
                    if qty <= 0:
                        return False, "OUTPUT_INVALID_LINE_ITEM", f"Line item {idx} quantity <= 0."
                    unit_cents = _to_cents(item.get("unit_price"), "unit_price")
                    line_cents = int((qty * Decimal(unit_cents)).to_integral_value(rounding=ROUND_HALF_UP))
                    if item.get("line_total") is not None:
                        reported_line = _to_cents(item["line_total"], "line_total")
                        if reported_line != line_cents:
                            return False, "OUTPUT_ARITHMETIC_MISMATCH", f"Line item {idx} arithmetic mismatch."
                    computed_cents += line_cents
                reported_total = _to_cents(answer["total"], "total")
                if reported_total != computed_cents:
                    return (
                        False,
                        "OUTPUT_ARITHMETIC_MISMATCH",
                        f"Invoice total mismatch: line items sum to {computed_cents} cents, got {reported_total}.",
                    )
            except (ValueError, InvalidOperation) as exc:
                return False, "OUTPUT_ARITHMETIC_ERROR", str(exc)
            return True, "OUTPUT_VALIDATED", f"Invoice schema and integer-cents total ({computed_cents} cents) verified."

        if output_type == "quote_comparison":
            quotes = answer.get("quotes")
            ranking = answer.get("ranking")
            rule = answer.get("comparison_rule")
            refs = answer.get("source_references")
            if not isinstance(quotes, list) or len(quotes) < 2:
                return False, "OUTPUT_INCOMPLETE_QUOTES", "quotes must contain at least 2 quote summaries."
            if not isinstance(ranking, list) or len(ranking) != len(quotes):
                return False, "OUTPUT_INVALID_RANKING", "ranking must list all compared quote IDs."
            if rule != "lowest_total_usd":
                return False, "OUTPUT_RULE_MISMATCH", "comparison_rule must be 'lowest_total_usd'."
            if not isinstance(refs, list) or not refs:
                return False, "OUTPUT_MISSING_SOURCES", "source_references required."
            try:
                totals_by_id: dict[str, int] = {}
                for q in quotes:
                    if not isinstance(q, dict) or not str(q.get("file_id", "")).strip() or not str(q.get("vendor", "")).strip():
                        return False, "OUTPUT_INCOMPLETE_QUOTES", "Each quote requires file_id and vendor."
                    if q.get("currency") != "USD":
                        return False, "OUTPUT_CURRENCY_MISMATCH", "All quotes must be in USD."
                    cents = _to_cents(q.get("total"), "total")
                    totals_by_id[q["file_id"]] = cents
                expected_order = [k for k, _ in sorted(totals_by_id.items(), key=lambda kv: (kv[1], kv[0]))]
                if ranking != expected_order:
                    return False, "OUTPUT_RANKING_MISMATCH", f"Expected lowest_total_usd ranking {expected_order}, got {ranking}."
            except ValueError as exc:
                return False, "OUTPUT_ARITHMETIC_ERROR", str(exc)
            return True, "OUTPUT_VALIDATED", "Quote totals and lowest_total_usd ranking verified."

        if output_type in ("summary", "email_summary"):
            if not isinstance(answer.get("summary"), str) or not answer["summary"].strip():
                return False, "OUTPUT_MISSING_SUMMARY", "summary is required."
            if output_type == "email_summary" and (not isinstance(answer.get("subject"), str) or not answer["subject"].strip()):
                return False, "OUTPUT_MISSING_SUBJECT", "subject is required."
            refs = answer.get("source_references")
            if not isinstance(refs, list) or not refs:
                return False, "OUTPUT_MISSING_SOURCES", "source_references required."
            return True, "OUTPUT_VALIDATED", "Summary schema and source references verified."

        if output_type == "queue_move":
            if not answer.get("draft_id") or not answer.get("queue_id"):
                return False, "OUTPUT_MISSING_FIELDS", "draft_id and queue_id required."
            return True, "OUTPUT_VALIDATED", "Queue move summary validated."

        return False, "OUTPUT_UNKNOWN_TYPE", f"Unsupported output_type {output_type!r}."

    def _persist_output_verdict(
        self,
        run_id: str,
        output_id: str,
        res: dict[str, Any],
        source_refs: list[str] | None,
    ) -> None:
        stored = {
            "output_id": output_id,
            "verdict": res["verdict"].value,
            "rule_id": res["rule_id"],
            "reason": res["reason"],
            "answer": res["answer"],
            "source_refs": source_refs or [],
            "checked_at": utc_now_iso(),
        }
        self.store.execute(
            "UPDATE runs SET output_verdict_json = ?, status = CASE WHEN status = 'ACTIVE' THEN 'COMPLETED' ELSE status END WHERE run_id = ?",
            (canonical_json(stored), run_id),
        )
        self.store.append_hash_chained_event(
            event_id=f"evt-out-{output_id}",
            run_id=run_id,
            action_id=None,
            origin="product",
            kind="OUTPUT_CHECK",
            outcome=res["verdict"].value,
            details={"output_id": output_id, "rule_id": res["rule_id"], "reason": res["reason"]},
        )

    # ------------------------------------------------------------------
    # Events, Run Lookup, Stop, Share Links, Dashboard Governance
    # ------------------------------------------------------------------
    def append_event(
        self,
        *,
        run_id: str,
        event_id: str,
        action_id: str | None,
        kind: str,
        outcome: str,
        details: dict[str, Any],
        origin: str = "sandbox",
    ) -> dict[str, Any]:
        if origin == "sandbox" and not self.sandbox_profile:
            raise PermissionError("Sandbox event ingestion is disabled in production profile.")
        self._get_run_row(run_id)
        redacted = redact_value(details)
        return self.store.append_hash_chained_event(
            event_id=event_id,
            run_id=run_id,
            action_id=action_id,
            origin=origin,
            kind=kind,
            outcome=outcome,
            details=redacted,
        )

    def stop_run(self, run_id: str, *, operator_id: str = "operator-1", tenant_id: str | None = None) -> dict[str, Any]:
        with self.store.lock():
            self._get_run_row(run_id, tenant_id=tenant_id)
            self.store.execute(
                "UPDATE runs SET status = ? WHERE run_id = ?",
                (RunStatus.STOPPED.value, run_id),
            )
            self.store.append_hash_chained_event(
                event_id=f"evt-stop-{run_id}-{utc_now_iso()}",
                run_id=run_id,
                action_id=None,
                origin="product",
                kind="OPERATOR_STOP",
                outcome="STOPPED",
                details={"operator_id": operator_id},
            )
            return self.get_run_report(run_id, tenant_id=tenant_id)

    def get_run_report(self, run_id: str, *, tenant_id: str | None = None) -> dict[str, Any]:
        run = self._get_run_row(run_id, tenant_id=tenant_id)
        decisions = [
            {
                **d,
                "arguments": json.loads(d["arguments_json"]),
                "canonical_arguments": json.loads(d["canonical_arguments_json"]) if d["canonical_arguments_json"] else None,
            }
            for d in self.store.fetch_all("SELECT * FROM decisions WHERE run_id = ? ORDER BY created_at ASC", (run_id,))
        ]
        approvals = [
            self.get_approval(a["approval_id"])
            for a in self.store.fetch_all("SELECT approval_id FROM approvals WHERE run_id = ? ORDER BY created_at ASC", (run_id,))
        ]
        events = [
            {**e, "details": json.loads(e["details_json"])}
            for e in self.store.fetch_all("SELECT * FROM audit_events WHERE run_id = ? ORDER BY seq ASC", (run_id,))
        ]
        artifacts = [
            {
                **a,
                "spans": json.loads(a["spans_json"]),
                "risk_signal": json.loads(a["risk_signal_json"]),
                "visible_vs_extracted_diff": a["visible_text"] != a["extracted_text"],
            }
            for a in self.store.fetch_all("SELECT * FROM ingested_artifacts WHERE run_id = ? ORDER BY created_at ASC", (run_id,))
        ]
        return {
            "run_id": run["run_id"],
            "tenant_id": run["tenant_id"],
            "template_id": run["template_id"],
            "contract_id": run["contract_id"],
            "policy_version": run["policy_version"],
            "mode": Mode(run["mode"]),
            "status": RunStatus(run["status"]),
            "comparison_id": run["comparison_id"],
            "fixture_id": run["fixture_id"],
            "fixture_version": run["fixture_version"],
            "evidence_source": run["evidence_source"],
            "agent_id": run["agent_id"],
            "budgets_used": {
                "calls_used": run["calls_used"],
                "bytes_used": run["bytes_used"],
                "read_only_quarantine": bool(run["read_only_quarantine"]),
            },
            "created_at": run["created_at"],
            "contract_summary": json.loads(run["contract_json"]),
            "decisions": decisions,
            "approvals": approvals,
            "events": events,
            "artifacts": artifacts,
            "output_verdict": json.loads(run["output_verdict_json"]) if run["output_verdict_json"] else None,
            "chain_valid": self.store.verify_event_chain(run_id),
        }

    def create_share_link(
        self,
        run_id: str,
        *,
        tenant_id: str = "tenant-default",
        ttl_seconds: int = 3600,
    ) -> dict[str, Any]:
        run = self._get_run_row(run_id, tenant_id=tenant_id)
        token_id = _new_id("SHR")
        raw_token = f"view_{uuid.uuid4().hex}"
        expires_at = (datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)).strftime("%Y-%m-%dT%H:%M:%SZ")
        self.store.execute(
            """
            INSERT INTO share_tokens (token_id, token_hash, run_id, tenant_id, expires_at, revoked, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?)
            """,
            (token_id, sha256_hex(raw_token), run["run_id"], run["tenant_id"], expires_at, utc_now_iso()),
        )
        return {
            "token_id": token_id,
            "view_token": raw_token,
            "run_id": run_id,
            "expires_at": expires_at,
            "scope": "VIEW_ONLY",
        }

    def revoke_share_link(self, token_id: str, *, tenant_id: str = "tenant-default") -> dict[str, Any]:
        self.store.execute(
            "UPDATE share_tokens SET revoked = 1 WHERE token_id = ? AND tenant_id = ?",
            (token_id, tenant_id),
        )
        return {"token_id": token_id, "revoked": True}

    def resolve_share_token(self, raw_token: str) -> dict[str, Any]:
        row = self.store.fetch_one(
            "SELECT * FROM share_tokens WHERE token_hash = ?",
            (sha256_hex(raw_token),),
        )
        if row is None or row["revoked"]:
            raise PermissionError("Share token invalid or revoked.")
        if row["expires_at"] < utc_now_iso():
            raise PermissionError("Share token expired.")
        report = self.get_run_report(row["run_id"])
        report["view_only"] = True
        return report

    def _record_agent_seen(self, agent_id: str, baseline_tools: list[str]) -> None:
        existing = self.store.fetch_one("SELECT * FROM agent_inventory WHERE agent_id = ?", (agent_id,))
        now = utc_now_iso()
        if existing is None:
            self.store.execute(
                """
                INSERT INTO agent_inventory (agent_id, display_name, registered_tools_json, baseline_json, deviations_json, last_seen_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    agent_id,
                    agent_id,
                    canonical_json(sorted(set(baseline_tools))),
                    canonical_json({"expected_tools": sorted(set(baseline_tools)), "max_block_rate": 0.0}),
                    canonical_json([]),
                    now,
                ),
            )
        else:
            self.store.execute(
                "UPDATE agent_inventory SET last_seen_at = ? WHERE agent_id = ?",
                (now, agent_id),
            )

    def _record_agent_deviation(self, agent_id: str, tool_id: str, rule_id: str) -> None:
        row = self.store.fetch_one("SELECT * FROM agent_inventory WHERE agent_id = ?", (agent_id,))
        if row is None:
            return
        deviations = json.loads(row["deviations_json"])
        deviations.append({"tool_id": tool_id, "rule_id": rule_id, "at": utc_now_iso()})
        self.store.execute(
            "UPDATE agent_inventory SET deviations_json = ?, last_seen_at = ? WHERE agent_id = ?",
            (canonical_json(deviations[-20:]), utc_now_iso(), agent_id),
        )

    def get_dashboard_summary(self) -> dict[str, Any]:
        runs = self.store.fetch_all(
            "SELECT run_id, template_id, mode, status, comparison_id, fixture_id, evidence_source, created_at FROM runs ORDER BY created_at DESC LIMIT 50"
        )
        pending_approvals = [
            self.get_approval(r["approval_id"])
            for r in self.store.fetch_all("SELECT approval_id FROM approvals ORDER BY created_at DESC LIMIT 30")
        ]
        freq_rules = self.store.fetch_all(
            "SELECT rule_id, verdict, COUNT(*) as count FROM decisions GROUP BY rule_id, verdict ORDER BY count DESC"
        )
        manifests = self.list_manifests()
        manifest_alerts = [
            {"tool_id": m["tool_id"], "status": m["status"], "pin_valid": m["pin_valid"]}
            for m in manifests
            if not m["pin_valid"]
        ]
        agents = [
            {
                **a,
                "registered_tools": json.loads(a["registered_tools_json"]),
                "baseline": json.loads(a["baseline_json"]),
                "deviations": json.loads(a["deviations_json"]),
            }
            for a in self.store.fetch_all("SELECT * FROM agent_inventory ORDER BY last_seen_at DESC")
        ]
        return {
            "runs": runs,
            "approvals": pending_approvals,
            "rule_counts": freq_rules,
            "manifests": manifests,
            "manifest_alerts": manifest_alerts,
            "memory_entries": self.list_memory(),
            "agents": agents,
            "owasp_coverage": self.get_owasp_coverage(),
        }

    @staticmethod
    def get_owasp_coverage() -> dict[str, Any]:
        return {
            "framework": "OWASP Agentic Security Issues (ASI01-ASI10)",
            "items": [
                {"code": "ASI01", "name": "Agent Goal Hijack", "status": "COVERED", "notes": "Immutable Task Contract binds template, parameters, and tool scope; source spans never alter policy."},
                {"code": "ASI02", "name": "Tool Misuse & Exploitation", "status": "COVERED", "notes": "Manifest pin checks, canonical arg checks, destination sink rules, and call/byte/repeat budgets."},
                {"code": "ASI03", "name": "Identity & Privilege Abuse", "status": "COVERED", "notes": "Tenant/role checks on runs/approvals and scoped CredentialBrokerStub handles off agent surface."},
                {"code": "ASI04", "name": "Agentic Supply Chain", "status": "COVERED", "notes": "SHA-256 tool manifest pinning and connector allowlisting."},
                {"code": "ASI05", "name": "Unexpected Code Execution", "status": "PARTIAL", "notes": "Demonstrated via tool denial with zero mock executor calls; OS/GUI runtime sandboxing is out of scope."},
                {"code": "ASI06", "name": "Memory & Context Poisoning", "status": "COVERED", "notes": "Ingestion provenance tagging and automatic quarantine of untrusted memory writes."},
                {"code": "ASI07", "name": "Insecure Inter-Agent Comms", "status": "OUT_OF_SCOPE", "notes": "Peer-agent messaging excluded from v1 scope."},
                {"code": "ASI08", "name": "Cascading Failures", "status": "OUT_OF_SCOPE", "notes": "Multi-hop cascading circuit breakers excluded from v1 scope."},
                {"code": "ASI09", "name": "Human-Agent Trust Exploitation", "status": "PARTIAL", "notes": "Approvals show trusted before/after diff and argument digest; reviewer persuasion remains a documented limitation."},
                {"code": "ASI10", "name": "Rogue Agents", "status": "COVERED", "notes": "Agent inventory, baseline deviation alerts, and operator run stop."},
            ],
            "limitations": [
                "Semantic manipulation of unstructured summary prose inside allowed output fields cannot be eliminated by deterministic structural gates alone.",
                "Reviewer persuasion on approval descriptions is mitigated with trusted before/after diffs but remains a human-factor limitation.",
                "CredentialBrokerStub simulates scoped handle issuance and does not connect to an external vault.",
            ],
        }
