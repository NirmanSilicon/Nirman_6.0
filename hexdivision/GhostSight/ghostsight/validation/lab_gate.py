"""The lab gate: the check that must pass before any lab validation.

Pure module: no files, no network, no Metasploit.

Rules:
- The target must pass the scope check. A scope denial is passed on
  with the scope's own reason.
- The target must also pass the lab rule in the policy ([lab] allowed).
  That rule needs a single private address inside a listed range.
- Either one failing means refused. Neither can make up for the other.
- Anything odd is refused, never allowed.
"""

from ghostsight.security.policy import (
    Policy,
    PolicyDecision,
    evaluate_lab_target,
)
from ghostsight.security.scope_manager import ScopeDecision, parse_network


def check_lab_gate(policy: Policy, scope_decision: ScopeDecision) -> PolicyDecision:
    """Decide whether a scope-checked target may be validated in the lab."""
    if not scope_decision.allowed or scope_decision.normalised is None:
        return PolicyDecision(False, scope_decision.reason)

    try:
        network = parse_network(scope_decision.normalised)
    except ValueError:
        return PolicyDecision(
            False, "Refused: the approved target could not be read as an address."
        )

    lab_decision = evaluate_lab_target(policy, network)
    if not lab_decision.allowed:
        return lab_decision
    return PolicyDecision(
        True, f"{scope_decision.reason} {lab_decision.reason}"
    )
