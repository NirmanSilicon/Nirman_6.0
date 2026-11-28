"""Extension contracts; no live executor or permissive fallback is shipped."""

from typing import Any, Protocol


class IngestionAdapter(Protocol):
    def ingest(self, content: bytes, source_id: str) -> dict[str, Any]:
        """Return extracted/normalized text, spans, provenance and sensitivity labels."""
        ...


class GuardedDispatcher(Protocol):
    def dispatch_guarded(self, run_id: str, action_id: str) -> dict[str, Any]:
        """Recheck policy, reserve budget, consume approval, then own actual execution."""
        ...


class CredentialBrokerStub:
    """Stub only: cannot issue credentials."""

    def issue(self, run_id: str, tool_id: str) -> str:
        raise NotImplementedError("Scoped credential broker is not implemented")


class MCPProxyStub:
    def call_tool(self, name: str, arguments: dict) -> dict:
        raise NotImplementedError("MCP transport and guarded live dispatch are not implemented")
