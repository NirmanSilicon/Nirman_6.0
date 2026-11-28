"""MCP-compatible tool proxy enforcing SENTINEL contracts, pinning, and output checks."""

from __future__ import annotations

import copy
from typing import Any, Callable
import uuid

from mcp.types import Tool as McpTool

from sentinel_product.policy import ProductEngine
from sentinel_sandbox.client import ProductClient
from sentinel_sandbox.fixtures import MOCK_MAILBOX_ID, clone_seed_snapshot


class SentinelMCPProxy:
    """Routes MCP tool calls and final answers through SENTINEL Product checks and guarded dispatch."""

    def __init__(
        self,
        *,
        product_client: ProductClient,
        product_engine: ProductEngine,
    ) -> None:
        self.client = product_client
        self.engine = product_engine
        self._mock_world = clone_seed_snapshot()
        self._tool_handlers: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
            "read_file": self._exec_read_file,
            "read_page": self._exec_read_page,
            "read_document": self._exec_read_document,
            "read_email": self._exec_read_email,
            "send_mock_attachment": self._exec_send_mock_attachment,
        }

    def reset_mock_world(self) -> None:
        self._mock_world = clone_seed_snapshot()

    def get_mock_inbox(self) -> list[dict[str, Any]]:
        return copy.deepcopy(self._mock_world["inbox"])

    def _exec_read_file(self, args: dict[str, Any]) -> dict[str, Any]:
        fid = args["file_id"]
        if fid not in self._mock_world["files"]:
            raise KeyError(f"Unknown file_id: {fid}")
        return copy.deepcopy(self._mock_world["files"][fid])

    def _exec_read_page(self, args: dict[str, Any]) -> dict[str, Any]:
        pid = args["page_id"]
        if pid not in self._mock_world["pages"]:
            raise KeyError(f"Unknown page_id: {pid}")
        return copy.deepcopy(self._mock_world["pages"][pid])

    def _exec_read_document(self, args: dict[str, Any]) -> dict[str, Any]:
        did = args["document_id"]
        if did not in self._mock_world["documents"]:
            raise KeyError(f"Unknown document_id: {did}")
        return copy.deepcopy(self._mock_world["documents"][did])

    def _exec_read_email(self, args: dict[str, Any]) -> dict[str, Any]:
        mid = args["message_id"]
        if mid not in self._mock_world["emails"]:
            raise KeyError(f"Unknown message_id: {mid}")
        return copy.deepcopy(self._mock_world["emails"][mid])

    def _exec_send_mock_attachment(self, args: dict[str, Any]) -> dict[str, Any]:
        delivery = {
            "delivery_id": f"AGENT-MSG-{len(self._mock_world['inbox']) + 1:03d}",
            "record_id": args["record_id"],
            "mailbox_id": args.get("mailbox_id", MOCK_MAILBOX_ID),
            "status": "DELIVERED_TO_LOCAL_MOCK_INBOX",
        }
        self._mock_world["inbox"].append(delivery)
        return copy.deepcopy(delivery)

    def list_tools(self) -> list[McpTool]:
        """Expose pinned manifests as MCP Tool definitions (credentials stay hidden)."""
        tools: list[McpTool] = []
        for m in self.engine.list_manifests():
            if not m["pin_valid"]:
                continue
            if m["tool_id"] in self._tool_handlers:
                tools.append(
                    McpTool(
                        name=m["tool_id"],
                        description=m["description"],
                        input_schema=m["schema"],
                    )
                )
        return tools

    def openai_tool_schemas(self, *, include_denied_demo_tool: bool = True) -> list[dict[str, Any]]:
        """Convert MCP Tool manifests into OpenAI function-calling tool specs."""
        specs: list[dict[str, Any]] = []
        for tool in self.list_tools():
            if not include_denied_demo_tool and tool.name == "send_mock_attachment":
                continue
            specs.append(
                {
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description or "",
                        "parameters": tool.input_schema,
                    },
                }
            )
        return specs

    def call_tool(
        self,
        *,
        run_id: str,
        tool_id: str,
        arguments: dict[str, Any],
        source_refs: list[str] | None = None,
    ) -> dict[str, Any]:
        """Evaluate tool call through /check -> /authorize-mock -> isolated handler -> ingest."""
        action_id = f"mcp-{uuid.uuid4().hex[:10]}"
        check = self.client.check_action(
            run_id,
            action_id=action_id,
            tool_id=tool_id,
            arguments=arguments,
            source_refs=source_refs or [],
        )
        if check["verdict"] != "ALLOW":
            self.client.post_event(
                run_id,
                event_id=f"mcp-blk-{action_id}",
                action_id=action_id,
                kind="MCP_PROXY_BLOCKED",
                outcome=check["verdict"],
                details={"tool_id": tool_id, "rule_id": check["rule_id"], "reason": check["reason"]},
            )
            return {
                "allowed": False,
                "verdict": check["verdict"],
                "decision_id": check["decision_id"],
                "rule_id": check["rule_id"],
                "reason": check["reason"],
                "data": None,
            }

        auth = self.client.authorize_mock(
            run_id,
            action_id=action_id,
            decision_id=check["decision_id"],
            arguments=check.get("canonical_arguments") or arguments,
        )
        if auth["status"] != "AUTHORIZED":
            return {
                "allowed": False,
                "verdict": "BLOCK",
                "decision_id": check["decision_id"],
                "rule_id": auth["rule_id"],
                "reason": auth["reason"],
                "data": None,
            }

        canon_args = auth["canonical_arguments"] or arguments
        handler = self._tool_handlers.get(tool_id)
        if handler is None:
            return {
                "allowed": False,
                "verdict": "BLOCK",
                "decision_id": check["decision_id"],
                "rule_id": "NO_LOCAL_HANDLER",
                "reason": f"No handler for {tool_id}",
                "data": None,
            }

        raw_result = handler(canon_args)
        carrier_map = {
            "read_file": "image_ocr",
            "read_page": "webpage",
            "read_document": "pdf_document",
            "read_email": "email",
        }
        self.engine.ingest(
            run_id=run_id,
            carrier=carrier_map.get(tool_id, "tool_result"),
            source_ref=f"{tool_id}:{canon_args}",
            raw_record=raw_result,
        )
        self.client.post_event(
            run_id,
            event_id=f"mcp-exec-{action_id}",
            action_id=action_id,
            kind="MCP_PROXY_EXECUTED",
            outcome="ALLOWED",
            details={"tool_id": tool_id, "reservation_id": auth["reservation_id"]},
        )
        return {
            "allowed": True,
            "verdict": "ALLOW",
            "decision_id": check["decision_id"],
            "reservation_id": auth["reservation_id"],
            "rule_id": check["rule_id"],
            "data": raw_result,
        }

    def submit_final_answer(
        self,
        *,
        run_id: str,
        answer: dict[str, Any],
        source_refs: list[str] | None = None,
    ) -> dict[str, Any]:
        """Validate the agent's final answer through Product /output/check."""
        return self.client.check_output(
            run_id,
            output_id=f"mcp-out-{uuid.uuid4().hex[:8]}",
            answer=answer,
            source_refs=source_refs or [],
        )
