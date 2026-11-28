from typing import Any

from pydantic import Field

from agent_x_shared.models import StrictModel


class FileParameters(StrictModel):
    file_id: str = Field(min_length=1)


class QuoteParameters(StrictModel):
    file_ids: list[str] = Field(min_length=2, max_length=20)


class PageParameters(StrictModel):
    page_id: str = Field(min_length=1)


class DocumentParameters(StrictModel):
    document_id: str = Field(min_length=1)


class EmailParameters(StrictModel):
    message_id: str = Field(min_length=1)


class DraftParameters(StrictModel):
    draft_id: str = Field(min_length=1)
    queue_id: str = Field(min_length=1)


TEMPLATES = {
    "extract_invoice": (FileParameters, "read_file", "file_id"),
    "compare_quotes": (QuoteParameters, "read_file", "file_ids"),
    "summarize_page": (PageParameters, "read_page", "page_id"),
    "summarize_document": (DocumentParameters, "read_document", "document_id"),
    "summarize_email": (EmailParameters, "read_email", "message_id"),
    "route_review_draft": (DraftParameters, "move_mock_draft", "draft_id"),
}


class ContractError(ValueError):
    pass


def compile_contract(template_id: str, parameters: dict[str, Any], records: dict) -> dict:
    if template_id not in TEMPLATES:
        raise ContractError("Unknown template")
    model, tool, resource_field = TEMPLATES[template_id]
    checked = model.model_validate(parameters).model_dump()
    resources = checked[resource_field]
    resources = resources if isinstance(resources, list) else [resources]
    if len(resources) != len(set(resources)) or any(r not in records for r in resources):
        raise ContractError("Selected records are unavailable to this identity")
    expected_kind = {
        "extract_invoice": "invoice", "compare_quotes": "quote", "summarize_page": "page",
        "summarize_document": "document", "summarize_email": "email",
        "route_review_draft": "draft",
    }[template_id]
    if any(records[r]["kind"] != expected_kind for r in resources):
        raise ContractError("Record type does not match the task")
    if template_id == "route_review_draft" and checked["queue_id"] != "review-approved":
        raise ContractError("Internal queue is not approved")
    return {
        "template_id": template_id, "template_version": "1", "parameters": checked,
        "resources": resources, "allowed_tools": [tool], "max_calls": 20,
        "max_argument_bytes": 32768, "approval_required": tool == "move_mock_draft",
    }
