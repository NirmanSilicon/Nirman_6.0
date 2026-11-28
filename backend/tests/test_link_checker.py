import pytest
from app.engine.link_checker import analyze_citizen_link


def test_official_sbi_domain_is_safe():
    res = analyze_citizen_link("https://onlinesbi.sbi")
    assert res.verdict == "SAFE"
    assert res.risk_score == 0
    assert res.matched_brand == "State Bank of India (SBI)"


def test_catches_sbi_lowercase_l_lookalike():
    res = analyze_citizen_link("https://SBl.co.in/login")
    assert res.verdict == "DANGEROUS"
    assert res.matched_brand == "State Bank of India (SBI)"
    assert res.official_domain == "onlinesbi.sbi"
    assert len(res.character_diffs) == 1
    assert res.character_diffs[0].typed_char == "l"
    assert res.character_diffs[0].expected_char == "i"


def test_catches_onlinesbl_lookalike():
    res = analyze_citizen_link("https://onlinesbl.com/kyc-verify")
    assert res.verdict == "DANGEROUS"
    assert any(s.code == "HOMOGLYPH_LOOKALIKE_SPOOF" for s in res.signals)
    assert any(s.code == "RBI_BANK_IN_MISMATCH" for s in res.signals)


def test_catches_punycode_cyrillic_homograph():
    # xn--pple-43d.com decodes to Cyrillic 'а' + 'pple.com'
    res = analyze_citizen_link("https://xn--pple-43d.com")
    assert res.verdict == "DANGEROUS"
    assert any(s.code == "IDN_HOMOGRAPH_ATTACK" for s in res.signals)
    assert res.matched_brand == "Apple"


def test_catches_subdomain_and_at_spoofing():
    res = analyze_citizen_link("https://onlinesbi.sbi@kyc-verify.xyz/login")
    assert res.verdict == "DANGEROUS"
    assert any(s.code == "AT_SYMBOL_DECEPTION" for s in res.signals)


@pytest.mark.parametrize(
    "malicious",
    [
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "file:///etc/passwd",
        "http://169.254.169.254/latest/meta-data/",
        "http://127.0.0.1:8000",
        "http://localhost/admin",
    ],
)
def test_self_defense_blocks_malicious_inputs(malicious):
    res = analyze_citizen_link(malicious)
    assert res.verdict == "BLOCKED"
    assert res.risk_score == 100