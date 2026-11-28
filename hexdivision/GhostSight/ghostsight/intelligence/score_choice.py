"""Choose which CVSS score a finding shows (decision 36 b).

Nothing here uses the network or touches a file.

Policy:

* Show the Primary score (NVD's own). CVSS 3.1 comes before 2.0.
* With no Primary score, show every score, each with its source.
* Never average, maximise or minimise.
* Say so when sources disagree. Only scores of the same CVSS version
  are compared, because 3.1 and 2.0 are different scales.
* No scores at all is stated plainly. It is not a clean result.
"""

from dataclasses import dataclass

from ghostsight.intelligence.nvd_reader import CvssScore

_PRIMARY = "Primary"

# Newest first. A version not listed here ranks last.
_VERSION_ORDER = ("3.1", "2.0")

_NO_SCORES_NOTE = (
    "No score is available for this CVE. "
    "That does not mean the CVE is harmless."
)


@dataclass(frozen=True)
class ScoreChoice:
    """The scores to show, and one sentence about how they were chosen."""

    shown: tuple[CvssScore, ...]
    note: str


def _version_rank(score: CvssScore) -> int:
    """0 for the newest known CVSS version, larger for older or unknown."""
    if score.cvss_version in _VERSION_ORDER:
        return _VERSION_ORDER.index(score.cvss_version)
    return len(_VERSION_ORDER)


def _best_primary(primaries: list[CvssScore]) -> tuple[CvssScore, ...]:
    """The Primary scores of the newest CVSS version present."""
    best = min(_version_rank(s) for s in primaries)
    return tuple(s for s in primaries if _version_rank(s) == best)


def _describe(score: CvssScore) -> str:
    return f"{score.source} {score.base_score:.1f}"


def _disagreement_note(
    shown: tuple[CvssScore, ...], scores: tuple[CvssScore, ...]
) -> str:
    """One sentence per shown CVSS version whose sources give different scores."""
    sentences = []
    for version in dict.fromkeys(s.cvss_version for s in shown):
        same = [s for s in scores if s.cvss_version == version]
        if len({s.base_score for s in same}) > 1:
            listed = ", ".join(_describe(s) for s in same)
            sentences.append(
                f"Sources disagree on the CVSS {version} score: {listed}."
            )
    return " ".join(sentences)


def choose_scores(scores: tuple[CvssScore, ...]) -> ScoreChoice:
    """Pick the scores to show for one CVE, with a note saying why."""
    if not scores:
        return ScoreChoice(shown=(), note=_NO_SCORES_NOTE)

    primaries = [s for s in scores if s.score_type == _PRIMARY]
    if primaries:
        shown = _best_primary(primaries)
        sources = ", ".join(dict.fromkeys(s.source for s in shown))
        base = f"Showing the Primary score (CVSS {shown[0].cvss_version}) from {sources}."
    else:
        shown = tuple(scores)
        base = "No Primary score is available, so every score is shown, each with its source."

    parts = [base, _disagreement_note(shown, scores)]
    return ScoreChoice(shown=shown, note=" ".join(p for p in parts if p))
