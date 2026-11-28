import asyncio
import time
from typing import Dict, List, Tuple

from app.scanners.base import ScannerResult
from app.scanners.dns_scanner import scan_dns
from app.scanners.header_scanner import scan_headers
from app.scanners.surface_scanner import scan_surface
from app.scanners.tls_scanner import scan_tls
from app.schemas import FindingSchema, ModuleSummary
from app.security.ssrf_guard import ValidatedTarget

MODULE_ORDER = ("tls", "headers", "dns", "surface")


async def run_all_scanners(
    target: ValidatedTarget,
) -> Tuple[Dict[str, ModuleSummary], List[FindingSchema], int]:
    """Run all 4 passive scanners concurrently and aggregate summaries + findings with wall-clock timing."""
    start = time.perf_counter()

    raw_results = await asyncio.gather(
        scan_tls(target),
        scan_headers(target),
        scan_dns(target),
        scan_surface(target),
        return_exceptions=True,
    )

    duration_ms = int((time.perf_counter() - start) * 1000)
    module_summary: Dict[str, ModuleSummary] = {}
    all_findings: List[FindingSchema] = []

    for mod_name, result in zip(MODULE_ORDER, raw_results):
        if isinstance(result, Exception):
            module_summary[mod_name] = ModuleSummary(
                status="error",
                checks_passed=0,
                checks_failed=0,
                error_message=f"Unexpected scanner error: {type(result).__name__}",
            )
            continue

        assert isinstance(result, ScannerResult)
        module_summary[result.module] = result.summary
        all_findings.extend(result.findings)

    return module_summary, all_findings, duration_ms