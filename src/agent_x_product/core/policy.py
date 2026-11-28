"""Deterministic scaffold rules. No HTTP, model-provider, or executor imports."""

from dataclasses import dataclass

from pydantic import ValidationError

from agent_x_product.core.contracts import (
    DocumentParameters,
    DraftParameters,
    EmailParameters,
    FileParameters,
    PageParameters,
)
from agent_x_shared.catalog import digest
from agent_x_shared.models import StrictModel


class SendArguments(StrictModel):
    record_id: str
    mailbox_id: str


ARGUMENT_TYPES = {
    "read_file": FileParameters, "read_page": PageParameters,
    "read_document": DocumentParameters, "read_email": EmailParameters,
    "move_mock_draft": DraftParameters, "send_mock_attachment": SendArguments,
}


@dataclass(frozen=True)
class Manifest:
    tool_id: str
    fingerprint: str
    approved: bool = True


def sandbox_manifests() -> dict[str, Manifest]:
    # Explicitly reviewed local mock connector only; never used in production.
    return {
        tool: Manifest(tool, digest({"connector": "local-mock-v1", "tool": tool,
                                   "schema": model.model_json_schema()}))
        for tool, model in ARGUMENT_TYPES.items()
    }


def evaluate(contract: dict, tool_id: str, arguments: dict, manifests: dict,
             status: str = "ACTIVE") -> tuple[str, str, dict | None]:
    if status != "ACTIVE":
        return "BLOCK", "RUN_STOPPED", None
    manifest = manifests.get(tool_id)
    if manifest is None or not manifest.approved or tool_id not in ARGUMENT_TYPES:
        return "BLOCK", "MANIFEST_UNAPPROVED", None
    try:
        checked = ARGUMENT_TYPES[tool_id].model_validate(arguments).model_dump()
    except ValidationError:
        return "BLOCK", "ARGUMENTS_INVALID", None
    if tool_id not in contract["allowed_tools"]:
        return "BLOCK", "TOOL_OUT_OF_SCOPE", checked
    if tool_id == "move_mock_draft":
        if checked != contract["parameters"]:
            return "BLOCK", "DESTINATION_OUT_OF_SCOPE", checked
        return "ASK_HUMAN", "APPROVAL_REQUIRED", checked
    if next(iter(checked.values())) not in contract["resources"]:
        return "BLOCK", "RESOURCE_OUT_OF_SCOPE", checked
    return "ALLOW", "SCOPE_ALLOWED", checked
