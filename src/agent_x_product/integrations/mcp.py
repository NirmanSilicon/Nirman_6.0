"""Small MCP 2025-11-25 JSON-RPC tool proxy with an injected guarded dispatcher.

The proxy never owns an executor or tool credential. It supports the legacy MCP
initialize/tools surface; it does not claim the newer 2026 protocol or HTTP sessions.
"""

import json
from collections.abc import Callable

from agent_x_product.core.policy import ARGUMENT_TYPES


class MCPToolProxy:
    def __init__(self, dispatch: Callable, tools: list[str]):
        self.dispatch = dispatch
        self.tools = tools

    def handle(self, request: dict) -> dict | None:
        request_id = request.get("id")
        method = request.get("method")
        if method == "notifications/initialized":
            return None
        if request.get("jsonrpc") != "2.0":
            return {"jsonrpc": "2.0", "id": request_id,
                    "error": {"code": -32600, "message": "Invalid JSON-RPC request"}}
        if method == "initialize":
            result = {"protocolVersion": "2025-11-25", "capabilities": {"tools": {}},
                      "serverInfo": {"name": "agent-x-guarded-proxy", "version": "0.2.0"}}
        elif method == "tools/list":
            result = {"tools": [{"name": name, "description": f"Guarded local fixture tool: {name}",
                                 "inputSchema": ARGUMENT_TYPES[name].model_json_schema()}
                                for name in self.tools if name in ARGUMENT_TYPES]}
        elif method == "tools/call":
            params = request.get("params", {})
            name, arguments = params.get("name"), params.get("arguments", {})
            if name not in self.tools or not isinstance(arguments, dict):
                result = {"isError": True, "content": [{"type": "text", "text": "Tool unavailable"}]}
            else:
                value = self.dispatch(str(request_id), name, arguments)
                result = {"isError": value.get("status") != "EXECUTED",
                          "content": [{"type": "text", "text": json.dumps(value)}]}
        elif method == "ping":
            result = {}
        else:
            return {"jsonrpc": "2.0", "id": request_id,
                    "error": {"code": -32601, "message": "Method not found"}}
        return {"jsonrpc": "2.0", "id": request_id, "result": result}
