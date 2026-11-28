"""Seed-backed integrity gate; production output adapters deliberately unavailable."""

from decimal import ROUND_HALF_EVEN, Decimal


def validate_output(contract: dict, answer: dict, source_refs: list[str], records: dict) -> bool:
    if set(source_refs) != set(contract["resources"]):
        return False
    if any(ref not in records for ref in source_refs):
        return False
    template = contract["template_id"]
    if template == "extract_invoice":
        expected = records[source_refs[0]]["answer"]
        try:
            total = sum((Decimal(item["quantity"]) * Decimal(item["unit_price"])
                         for item in answer["line_items"]), Decimal("0"))
            if not total.is_finite():
                return False
            if total.quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN) != Decimal(answer["total"]):
                return False
        except (KeyError, TypeError, ValueError, ArithmeticError):
            return False
        return answer == expected
    if template == "compare_quotes":
        ranked = sorted(source_refs, key=lambda ref: (Decimal(records[ref]["total"]), ref))
        currencies = {records[ref]["currency"] for ref in source_refs}
        return len(currencies) == 1 and answer == {
            "currency": next(iter(currencies)), "ranking": ranked,
            "totals": {ref: records[ref]["total"] for ref in ranked},
        }
    if template in {"summarize_page", "summarize_document", "summarize_email"}:
        return answer == records[source_refs[0]]["answer"]
    return False
