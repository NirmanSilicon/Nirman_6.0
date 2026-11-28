from typing import List, Tuple
from app.schemas import FindingSchema, Severity

# Point deductions per severity tier (OWASP-aligned)
SEVERITY_WEIGHTS = {
    Severity.CRITICAL: 25,
    Severity.HIGH: 15,
    Severity.MEDIUM: 8,
    Severity.LOW: 3,
    Severity.INFO: 0,
}

# Display ordering: worst risks always surface first
SEVERITY_RANK = {
    Severity.CRITICAL: 0,
    Severity.HIGH: 1,
    Severity.MEDIUM: 2,
    Severity.LOW: 3,
    Severity.INFO: 4,
}


def sort_findings(findings: List[FindingSchema]) -> List[FindingSchema]:
    """Return a new list sorted from CRITICAL down to INFO."""
    return sorted(findings, key=lambda f: (SEVERITY_RANK[f.severity], f.module, f.code))


def calculate_score(findings: List[FindingSchema]) -> Tuple[int, str]:
    """Compute a deterministic 0-100 security score and letter grade."""
    total_penalty = sum(SEVERITY_WEIGHTS[f.severity] for f in findings)
    score = max(0, 100 - total_penalty)

    if score >= 90:
        grade = "A"
    elif score >= 80:
        grade = "B"
    elif score >= 65:
        grade = "C"
    elif score >= 50:
        grade = "D"
    else:
        grade = "F"

    return score, grade