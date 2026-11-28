"""GhostSight CLI entry point.

This is the only module that imports Typer. All other modules
are plain Python with no CLI dependency, so they can be tested
and reused independently.
"""

import logging
from datetime import datetime, timezone
from pathlib import Path
from time import sleep

import typer
from rich.console import Console
from rich.markup import escape
from rich.table import Table

from ghostsight import __version__
from ghostsight.integrations.metasploit_check import module_supports_check
from ghostsight.integrations.metasploit_queries import (
    get_module_stats,
    get_version,
    search_modules,
)
from ghostsight.integrations.metasploit_rpc import RpcError, RpcSettings, load_settings
from ghostsight.integrations.nmap_executor import (
    PROFILE_TIMEOUT_SECONDS,
    NmapRunError,
)
from ghostsight.integrations.nmap_runner import DEFAULT_PROFILE, ScanProfile
from ghostsight.intelligence.ai_apply import apply_ai_text
from ghostsight.intelligence.ai_explanation import AiOutputError
from ghostsight.intelligence.ai_prompt import build_prompt
from ghostsight.intelligence.ai_text import format_explanation
from ghostsight.intelligence.analysis import Analysis, analyse_services
from ghostsight.intelligence.analysis_apply import (
    SaveRefusedError,
    apply_analysis,
    is_demo_scan,
)
from ghostsight.intelligence.nvd_cache import (
    UnsafeNameError,
    read_cache,
    safe_name,
)
from ghostsight.intelligence.nvd_download import DownloadError
from ghostsight.intelligence.nvd_http import fetch_nvd
from ghostsight.intelligence.nvd_update import update_cache
from ghostsight.intelligence.ollama_client import OllamaError, generate_explanation
from ghostsight.intelligence.scan_facts import format_facts
from ghostsight.logging_config import setup_logging
from ghostsight.reporting.generator import generate_scan_reports
from ghostsight.reporting.models import (
    Finding,
    FindingStatus,
    ScanResult,
    Service,
)
from ghostsight.reporting.scan_finder import (
    SCAN_DATA_FILE,
    ScanNotFoundError,
    find_scan_dir,
)
from ghostsight.reporting.scan_reader import ScanDataError, read_scan_file
from ghostsight.scanner import perform_scan
from ghostsight.security.audit_log import (
    AuditError,
    append_record,
    default_audit_path,
    verify_chain,
)
from ghostsight.security.policy import (
    PolicyError,
    default_policy_path,
    evaluate_scan,
    load_policy,
)
from ghostsight.security.scope_manager import (
    ScopeDecision,
    ScopeError,
    default_scope_path,
    load_scope,
    parse_network,
)
from ghostsight.system_check import CheckStatus, has_failures, run_all_checks
from ghostsight.validation.check_plan import PlannedCheck, plan_checks
from ghostsight.validation.check_run import (
    NO_CANDIDATE_NOTE,
    NO_CHECK_NOTE,
    CheckRun,
    find_candidates,
    run_planned_checks,
)
from ghostsight.validation.lab_gate import check_lab_gate
from ghostsight.validation.validation_apply import apply_validation

app = typer.Typer(
    name="ghostsight",
    help="AI-Powered Automated Vulnerability Assessment and Security Validation CLI.",
    no_args_is_help=True,
)
console = Console()
error_console = Console(stderr=True)
logger = logging.getLogger(__name__)

STATUS_DISPLAY = {
    CheckStatus.OK: "[green]OK[/green]",
    CheckStatus.WARN: "[yellow]WARN[/yellow]",
    CheckStatus.MISSING: "[yellow]MISSING[/yellow]",
    CheckStatus.FAIL: "[red]FAIL[/red]",
}

# Exit code 2 is already used by Typer for usage errors, so a broken scope file uses 3.
SCOPE_ERROR_EXIT_CODE = 3
# The target was allowed, but the scan could not complete or its reports could not be written.
SCAN_FAILED_EXIT_CODE = 4
# The NVD download failed, or the cache could not be written.
NVD_FETCH_FAILED_EXIT_CODE = 4
# No such scan, or a bad scan name. Typer also uses 2 for usage errors.
SCAN_NOT_FOUND_EXIT_CODE = 2
# The scan file exists but could not be read, or it is damaged.
ANALYSE_FAILED_EXIT_CODE = 4
# analyse --save: the analysis was refused (demo scan, or nothing checked).
SAVE_REFUSED_EXIT_CODE = 2

# The local AI model used by explain. To become a config setting.
AI_MODEL = "qwen3:4b"
# Exit code when the local AI gives no usable reply or a save fails.
EXPLAIN_FAILED_EXIT_CODE = 4


def _version_callback(value: bool) -> None:
    """Print the version and exit immediately.

    Used with is_eager=True so it runs before any other option
    is parsed.
    """
    if value:
        console.print(f"GhostSight v{__version__}")
        raise typer.Exit()


@app.callback()
def main(
    ctx: typer.Context,
    version: bool = typer.Option(
        False,
        "--version",
        "-v",
        callback=_version_callback,
        is_eager=True,
        help="Show version and exit.",
    ),
    verbose: bool = typer.Option(
        False,
        "--verbose",
        help="Write detailed debug messages to the log file.",
    ),
) -> None:
    """GhostSight: Discover, Analyse, Assess, Validate, Report."""
    log_path = setup_logging(verbose=verbose)
    if log_path is None:
        error_console.print(
            "[yellow]Warning:[/yellow] could not write the log file. "
            "Continuing without logging."
        )
    logger.info("GhostSight v%s started, command=%s", __version__, ctx.invoked_subcommand)
    logger.debug("Log file: %s", log_path)


@app.command()
def status() -> None:
    """Show GhostSight system and dependency status."""
    results = run_all_checks()

    table = Table(title="GhostSight Status")
    table.add_column("Check")
    table.add_column("Status")
    table.add_column("Details")
    table.add_column("Needed for")
    for result in results:
        table.add_row(
            result.name,
            STATUS_DISPLAY[result.status],
            escape(result.detail),
            result.purpose,
        )
    console.print(table)

    not_ready = [
        result
        for result in results
        if result.status in (CheckStatus.WARN, CheckStatus.MISSING)
    ]
    logger.info(
        "Status checks finished: %d results, %d not ready, failures=%s",
        len(results),
        len(not_ready),
        has_failures(results),
    )

    if has_failures(results):
        error_console.print("[red]A required check failed. GhostSight cannot run correctly.[/red]")
        raise typer.Exit(code=1)

    console.print("[green]All required checks passed.[/green]")
    if not_ready:
        console.print(
            f"{len(not_ready)} optional item(s) are not ready. "
            "Each tool is set up in the milestone that needs it."
        )


def _evaluate_target(target: str) -> ScopeDecision:
    """Ask the scope manager about a target and show the decision.

    This is the single place the CLI loads the scope file. A broken scope
    file stops the command here, so it can never turn into 'allowed'.
    """
    scope_path = default_scope_path()
    try:
        allowed_scope = load_scope(scope_path)
    except ScopeError as error:
        logger.error("Scope file problem: %s", error)
        error_console.print(f"[red]Scope file problem:[/red] {escape(str(error))}")
        raise typer.Exit(code=SCOPE_ERROR_EXIT_CODE)

    decision = allowed_scope.check(target)
    logger.info("Scope check: target=%r allowed=%s", decision.target, decision.allowed)

    table = Table(title="GhostSight Scope Check", show_header=False, box=None)
    table.add_row("Target", escape(decision.target.strip()))
    table.add_row("Scope file", escape(str(scope_path)))
    if decision.allowed:
        table.add_row("Result", "[green]ALLOWED[/green]")
        table.add_row("Scan as", escape(decision.normalised or ""))
    else:
        table.add_row("Result", "[red]DENIED[/red]")
    table.add_row("Reason", escape(decision.reason))
    console.print(table)

    if not scope_path.exists():
        console.print(
            "No scope file found. To allow targets, copy config/scope.example.toml "
            "to config/scope.local.toml and list only systems you are permitted to test."
        )
    return decision


@app.command()
def scope(
    target: str = typer.Argument(
        ...,
        help=(
            "IP address or CIDR range to check, for example 192.168.56.10. "
            "Put -- before a value that starts with a dash."
        ),
    ),
) -> None:
    """Check whether a target is inside your allowed scope.

    Reads config/scope.local.toml and sends no network traffic.
    Exit code 0 means allowed, 1 means denied, 3 means the scope file is broken.
    """
    decision = _evaluate_target(target)
    if not decision.allowed:
        raise typer.Exit(code=1)


def _start_scan(
    decision: ScopeDecision,
    profile: ScanProfile,
    skip_discovery: bool = False,
) -> None:
    """Scan a target the scope manager approved, then write the reports.

    The scope decision, not an option or flag, is what marks the scan as
    authorised. The profile only chooses how the scan is run. If anything
    fails, no report is written.
    """
    minutes = PROFILE_TIMEOUT_SECONDS[profile] // 60
    console.print(
        f"Scanning {escape(decision.normalised or '')} with the "
        f"{profile.value} profile. GhostSight stops the scan after "
        f"{minutes} minutes at most."
    )

    try:
        scan_result = perform_scan(decision, profile, skip_discovery)
    except NmapRunError as error:
        logger.error("Scan failed: %s", error)
        error_console.print(f"[red]Scan failed:[/red] {escape(str(error))}")
        console.print("No report was written.")
        raise typer.Exit(code=SCAN_FAILED_EXIT_CODE)

    try:
        paths = generate_scan_reports(scan_result)
    except OSError as error:
        logger.error("Reports could not be written: %s", error)
        error_console.print(f"[red]Could not write the reports:[/red] {escape(str(error))}")
        raise typer.Exit(code=SCAN_FAILED_EXIT_CODE)

    table = Table(title="GhostSight Scan Complete", show_header=False, box=None)
    table.add_row("Report folder", escape(paths.directory.name))
    table.add_row("Target", escape(scan_result.target))
    table.add_row("Profile", escape(scan_result.profile))
    table.add_row("Open services", str(len(scan_result.services)))
    table.add_row("Directory", escape(str(paths.directory)))
    console.print(table)

    console.print("Notes:")
    for note in scan_result.notes:
        console.print(f"  - {escape(note)}")
    console.print(f"[green]Report written to:[/green] {escape(str(paths.final_report))}")
    logger.info(
        "Scan complete: target=%r profile=%s services=%d report=%s",
        scan_result.target,
        profile.value,
        len(scan_result.services),
        paths.final_report,
    )


@app.command()
def scan(
    target: str = typer.Option(
        ...,
        "--target",
        "-t",
        help="IP address or CIDR range to scan. It must be inside your allowed scope.",
    ),
    profile: ScanProfile = typer.Option(
        DEFAULT_PROFILE,
        "--profile",
        help=(
            "How to scan. low-noise checks the 100 most common TCP ports gently, "
            "normal checks 1000, deep checks all 65535 and is slow."
        ),
    ),
    skip_discovery: bool = typer.Option(
        False,
        "--skip-discovery",
        help=(
            "Skip the host-up check (Nmap -Pn) and try the ports anyway. "
            "Only for one address. The report says discovery was skipped."
        ),
    ),
) -> None:
    """Scan a target, but only if it is inside your allowed scope.

    Use --skip-discovery only for one address that you know is online. It
    adds Nmap -Pn, so ports are tried without a host-up check.

    The scope manager decides. There is no option to override it, and the
    profile never changes what is allowed. Low-noise reduces network load;
    it does not hide the scan from anyone watching.
    The policy file sets the largest range allowed. Each scan decision is
    recorded in the audit log.
    Exit code 1 means refused, 3 means the scope or policy file is broken,
    4 means the scan failed or its reports could not be written,
    and 5 means the audit log could not be written.
    """
    decision = _evaluate_target(target)
    if skip_discovery and decision.normalised is not None:
        if parse_network(decision.normalised).num_addresses > 1:
            error_console.print(
                "[red]Refused:[/red] skipping host discovery is only allowed "
                "for a single address.",
                soft_wrap=True,
            )
            raise typer.Exit(code=1)
    allowed, reason = _check_policy(decision)
    _audit("scan", decision.target, allowed, reason)
    if not allowed or decision.normalised is None:
        logger.warning("Scan refused for target=%r", decision.target)
        if decision.allowed:
            error_console.print(
                f"[red]{escape(reason)}[/red]", soft_wrap=True
            )
        else:
            error_console.print(
                "[red]Scan refused:[/red] the target is not inside the allowed scope."
            )
        raise typer.Exit(code=1)

    if skip_discovery:
        _start_scan(decision, profile, True)
    else:
        _start_scan(decision, profile)


# An action was refused because the audit log could not be written or is damaged.
AUDIT_FAILED_EXIT_CODE = 5


def _audit(event: str, target: str, allowed: bool, reason: str) -> None:
    """Record an action before it happens. If that fails, refuse the action."""
    try:
        append_record(default_audit_path(), event, target, allowed, reason)
    except AuditError as error:
        logger.error("Audit log problem: %s", error)
        error_console.print(f"[red]Refused:[/red] {escape(str(error))}", soft_wrap=True)
        error_console.print(
            "The action was not carried out. Run: ghostsight audit verify",
            soft_wrap=True,
        )
        raise typer.Exit(code=AUDIT_FAILED_EXIT_CODE)


def _check_policy(decision: ScopeDecision) -> tuple[bool, str]:
    """Apply the policy to a scan the scope allowed. Returns (allowed, reason).

    A scope denial passes through unchanged. A broken policy file stops the
    command here, as a broken scope file does, so it can never become 'allowed'.
    """
    if not decision.allowed or decision.normalised is None:
        return False, decision.reason
    try:
        policy = load_policy(default_policy_path())
    except PolicyError as error:
        logger.error("Policy file problem: %s", error)
        error_console.print(
            f"[red]Policy file problem:[/red] {escape(str(error))}", soft_wrap=True
        )
        raise typer.Exit(code=SCOPE_ERROR_EXIT_CODE)
    result = evaluate_scan(policy, parse_network(decision.normalised))
    if not result.allowed:
        return False, result.reason
    return True, f"{decision.reason} {result.reason}"


def _utc_now() -> str:
    """Return the current UTC time as YYYY-MM-DDTHH:MM:SSZ."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@app.command("nvd-fetch")
def nvd_fetch(
    vendor: str = typer.Option(..., "--vendor", help="CPE vendor name, for example openbsd."),
    product: str = typer.Option(..., "--product", help="CPE product name, for example openssh."),
    yes: bool = typer.Option(False, "--yes", help="Do not ask first. The warning is still shown."),
) -> None:
    """Download CVE data for one product from NVD into the local cache.

    This is the only command that contacts NVD, and it never runs by itself.
    NVD sees the product name and your IP address, and nothing about any scan.
    A download that is not complete is never stored.
    Exit code 1 means you declined, 2 means the name is not safe,
    and 4 means the download failed or the cache could not be written.
    """
    try:
        safe_vendor = safe_name(vendor)
        safe_product = safe_name(product)
    except UnsafeNameError:
        logger.warning("nvd-fetch refused: unsafe vendor or product name")
        # Exit code 2 matches a usage error. The bad text is not printed back.
        error_console.print(
            "[red]Not a safe vendor or product name.[/red] Use letters, digits, "
            "dot, underscore and hyphen only."
        )
        raise typer.Exit(code=2)

    name = f"{safe_vendor}:{safe_product}"
    console.print("This sends requests to NVD (services.nvd.nist.gov) over HTTPS.")
    console.print("NVD will see:")
    console.print(f"  - the product name: {escape(name)}")
    console.print("  - your IP address")
    console.print("NVD will not be told about any scan, target or finding.")
    console.print("A large product needs several requests, a few seconds apart.")

    if not yes and not typer.confirm("Send the request?", default=False):
        console.print("Nothing was sent.")
        raise typer.Exit(code=1)

    try:
        _audit("nvd-fetch", name, True, "Download confirmed.")
        count = update_cache(safe_vendor, safe_product, fetch_nvd, sleep, _utc_now)
    except DownloadError as error:
        logger.error("nvd-fetch failed for %s: %s", name, error)
        error_console.print(f"[red]Cache not updated:[/red] {escape(str(error))}")
        console.print("The cache was not changed.")
        raise typer.Exit(code=NVD_FETCH_FAILED_EXIT_CODE)
    except OSError as error:
        logger.error("nvd-fetch could not write the cache for %s: %s", name, error)
        error_console.print(
            f"[red]Cache not updated:[/red] could not write the cache: {escape(str(error))}"
        )
        raise typer.Exit(code=NVD_FETCH_FAILED_EXIT_CODE)

    noun = "record" if count == 1 else "records"
    console.print(f"[green]Stored {count} CVE {noun}[/green] for {escape(name)}.")
    logger.info("nvd-fetch stored %d records for %s", count, name)


MAX_LISTED_CVES = 10


def _printable(value: object, limit: int = 200) -> str:
    """Keep printable ASCII only, so a scan file cannot send control codes."""
    return "".join(ch if " " <= ch <= "~" else "?" for ch in str(value))[:limit]


def _show(text: str = "") -> None:
    """Print text literally: no markup, no emoji codes, no line wrapping."""
    console.print(text, markup=False, highlight=False, emoji=False, soft_wrap=True)


def _show_finding(number: int, finding: Finding) -> None:
    if finding.cvss_score is None:
        score = "not scored"
    else:
        score = f"{finding.cvss_score} ({_printable(finding.severity)})"
    cve_ids = [_printable(cve_id) for cve_id in finding.cve_ids]
    listed = ", ".join(cve_ids[:MAX_LISTED_CVES])
    if len(cve_ids) > MAX_LISTED_CVES:
        listed += f" ... and {len(cve_ids) - MAX_LISTED_CVES} more"
    _show(f"  {number}. {_printable(finding.title)}")
    _show(f"     Status  : {finding.status.label}")
    _show(f"     Service : {_printable(finding.affected_service)}")
    _show(f"     Score   : {score}")
    if listed:
        _show(f"     CVEs    : {listed}")


def _save_analysis(
    scan_result: ScanResult, analysis: Analysis, directory: Path
) -> None:
    """Store the analysis in the scan folder and rebuild its reports."""
    try:
        updated = apply_analysis(scan_result, analysis)
    except SaveRefusedError as error:
        logger.error("Analysis not saved: %s", error)
        error_console.print(
            f"[red]Not saved:[/red] {escape(str(error))}", soft_wrap=True
        )
        raise typer.Exit(code=SAVE_REFUSED_EXIT_CODE)
    _audit("analyse-save", directory.name, True, "Saving the analysis.")
    try:
        generate_scan_reports(updated, directory=directory)
    except OSError as error:
        logger.error("Could not save the analysis: %s", error)
        error_console.print(
            "[red]Cannot save:[/red] the scan folder could not be written.",
            soft_wrap=True,
        )
        raise typer.Exit(code=ANALYSE_FAILED_EXIT_CODE)
    _show(f"Saved: findings, notes and reports in {directory.name} were updated.")
    _show("Nothing was sent to NVD.")


@app.command()
def analyse(
    scan_name: str | None = typer.Option(
        None,
        "--scan",
        help="Scan folder to analyse, such as scan_001. Default: the newest.",
    ),
    save: bool = typer.Option(
        False,
        "--save",
        help="Store the findings in the scan folder and rebuild its reports.",
    ),
) -> None:
    """Check a saved scan against the stored NVD data. Sends nothing.

    Without --save this is a preview and no file is changed. With --save
    the findings are stored in the scan folder and the reports are rebuilt.
    """
    try:
        directory = find_scan_dir(scan_name)
        scan_result = read_scan_file(directory / SCAN_DATA_FILE)
    except ScanNotFoundError as error:
        logger.error("Could not find a scan: %s", error)
        error_console.print(
            f"[red]Cannot analyse:[/red] {escape(str(error))}", soft_wrap=True
        )
        raise typer.Exit(code=SCAN_NOT_FOUND_EXIT_CODE)
    except (ScanDataError, OSError) as error:
        logger.error("Could not read a scan: %s", error)
        error_console.print(
            f"[red]Cannot analyse:[/red] {escape(str(error))}", soft_wrap=True
        )
        raise typer.Exit(code=ANALYSE_FAILED_EXIT_CODE)

    analysis = analyse_services(scan_result.services, read_cache)

    if scan_result.scanner.startswith("none"):
        _show("DEMONSTRATION DATA: this scan was not made by a scanner.")
        _show()
    _show(f"Scan folder : {directory.name}")
    _show(f"Scan ID     : {_printable(scan_result.scan_id)}")
    _show(f"Target      : {_printable(scan_result.target)}")
    _show(f"Services    : {len(scan_result.services)}")
    if analysis.notes:
        _show()
        _show("Notes:")
        for note in analysis.notes:
            _show(f"  - {_printable(note, limit=1000)}")
    _show()
    _show(f"Findings: {len(analysis.findings)}")
    for number, finding in enumerate(analysis.findings, start=1):
        _show_finding(number, finding)
    _show()
    if save:
        _save_analysis(scan_result, analysis, directory)
    else:
        _show("Nothing was sent to NVD, and no file was changed.")
        _show("Run again with --save to store these findings in the scan reports.")


def _save_ai_text(scan_result: ScanResult, text: str, directory: Path) -> None:
    """Store the AI text in the scan folder and rebuild its reports."""
    try:
        updated = apply_ai_text(scan_result, text)
    except SaveRefusedError as error:
        logger.error("AI text not saved: %s", error)
        error_console.print(
            f"[red]Not saved:[/red] {escape(str(error))}", soft_wrap=True
        )
        raise typer.Exit(code=SAVE_REFUSED_EXIT_CODE)
    _audit("explain-save", directory.name, True, "Saving the AI text.")
    try:
        generate_scan_reports(updated, directory=directory)
    except OSError as error:
        logger.error("Could not save the AI text: %s", error)
        error_console.print(
            "[red]Cannot save:[/red] the scan folder could not be written.",
            soft_wrap=True,
        )
        raise typer.Exit(code=EXPLAIN_FAILED_EXIT_CODE)
    _show(f"Saved: the AI explanation in {directory.name} was updated.")
    _show("No finding, status, score or confidence was changed.")


@app.command()
def explain(
    scan_name: str | None = typer.Option(
        None,
        "--scan",
        help="Scan folder to explain, such as scan_001. Default: the newest.",
    ),
    save: bool = typer.Option(
        False,
        "--save",
        help="Store the AI text in the scan folder and rebuild its reports.",
    ),
) -> None:
    """Ask the local AI to explain a saved scan in plain language.

    The AI runs on this computer through Ollama (127.0.0.1) and may take
    a few minutes. Its text is labelled AI-generated, is not proof, and
    changes no finding. Without --save nothing is written.
    """
    try:
        directory = find_scan_dir(scan_name)
        scan_result = read_scan_file(directory / SCAN_DATA_FILE)
    except ScanNotFoundError as error:
        logger.error("Could not find a scan: %s", error)
        error_console.print(
            f"[red]Cannot explain:[/red] {escape(str(error))}", soft_wrap=True
        )
        raise typer.Exit(code=SCAN_NOT_FOUND_EXIT_CODE)
    except (ScanDataError, OSError) as error:
        logger.error("Could not read a scan: %s", error)
        error_console.print(
            f"[red]Cannot explain:[/red] {escape(str(error))}", soft_wrap=True
        )
        raise typer.Exit(code=ANALYSE_FAILED_EXIT_CODE)

    if is_demo_scan(scan_result):
        error_console.print(
            "[red]Not explained:[/red] this is demonstration data, not a real scan.",
            soft_wrap=True,
        )
        raise typer.Exit(code=SAVE_REFUSED_EXIT_CODE)

    _show(f"Scan folder : {directory.name}")
    _show(f"Asking the local AI model {AI_MODEL}. This may take a few minutes.")
    _show("The scan data stays on this computer.")
    try:
        explanation = generate_explanation(build_prompt(scan_result), AI_MODEL)
    except (OllamaError, AiOutputError) as error:
        logger.error("AI explanation failed: %s", error)
        error_console.print(
            f"[red]Cannot explain:[/red] {escape(str(error))}", soft_wrap=True
        )
        raise typer.Exit(code=EXPLAIN_FAILED_EXIT_CODE)

    text = format_explanation(explanation, AI_MODEL)
    _show()
    for line in format_facts(scan_result).splitlines():
        _show(line)
    _show()
    for line in text.splitlines():
        _show(line)
    _show()
    if save:
        _save_ai_text(scan_result, text, directory)
    else:
        _show("No file was changed.")
        _show("Run again with --save to store this text in the scan reports.")


# The audit log failed its check: a record was changed, removed or reordered.
AUDIT_BROKEN_EXIT_CODE = 1

audit_app = typer.Typer(
    name="audit",
    help="Check the audit log.",
    no_args_is_help=True,
)
app.add_typer(audit_app, name="audit")


@audit_app.command("verify")
def audit_verify() -> None:
    """Check that no audit record was changed, removed or reordered."""
    path = default_audit_path()
    if not path.exists():
        _show("No audit records yet.")
        return
    check = verify_chain(path)
    if not check.ok:
        _show(check.problem)
        raise typer.Exit(code=AUDIT_BROKEN_EXIT_CODE)
    _show(f"Records checked: {check.count}")


# The Metasploit settings (such as the password) are missing or not usable.
MSF_SETTINGS_EXIT_CODE = 2
# Metasploit could not be asked, or its reply could not be used.
MSF_FAILED_EXIT_CODE = 4

msf_app = typer.Typer(
    name="msf",
    help="Ask a local Metasploit server read-only questions.",
    no_args_is_help=True,
)
app.add_typer(msf_app, name="msf")


def _load_msf_settings() -> RpcSettings:
    """Read the Metasploit settings. Exit 2 if they are missing or unusable."""
    try:
        settings = load_settings()
    except RpcError as error:
        logger.error("Metasploit settings problem: %s", error)
        error_console.print(
            f"[red]Metasploit settings problem:[/red] {escape(str(error))}", soft_wrap=True
        )
        raise typer.Exit(code=MSF_SETTINGS_EXIT_CODE)
    return settings


def _msf_start(method: str) -> RpcSettings:
    """Read the settings, then record the question. Nothing is sent before that."""
    settings = _load_msf_settings()
    _audit("msf-query", settings.url, True, f"Read-only query: {method}")
    return settings


def _msf_failure(error: RpcError) -> typer.Exit:
    """Show why a Metasploit question failed and return the exit to raise."""
    logger.error("Metasploit query failed: %s", error)
    error_console.print(
        f"[red]Metasploit query failed:[/red] {escape(str(error))}", soft_wrap=True
    )
    return typer.Exit(code=MSF_FAILED_EXIT_CODE)


@msf_app.command("version")
def msf_version() -> None:
    """Show the version of the Metasploit server. Read-only."""
    settings = _msf_start("core.version")
    try:
        info = get_version(settings)
    except RpcError as error:
        raise _msf_failure(error)
    _show(f"Metasploit version: {info.version}")
    _show(f"Ruby: {info.ruby}")
    _show(f"API: {info.api}")


@msf_app.command("stats")
def msf_stats() -> None:
    """Show how many modules of each type Metasploit has loaded. Read-only."""
    settings = _msf_start("core.module_stats")
    try:
        stats = get_module_stats(settings)
    except RpcError as error:
        raise _msf_failure(error)
    _show("Modules loaded:")
    for name, count in stats.items():
        _show(f"  {name}: {count}")


@msf_app.command("search")
def msf_search(
    query: str = typer.Argument(..., help="Words to look for in Metasploit's module list."),
) -> None:
    """Search Metasploit's own module list. Nothing is sent to any target."""
    settings = _msf_start("module.search")
    try:
        result = search_modules(settings, query)
    except RpcError as error:
        raise _msf_failure(error)
    _show(f"Modules found: {result.total}")
    if result.truncated:
        _show(f"Showing the first {len(result.matches)} only.")
    for match in result.matches:
        date = match.disclosure_date or "unknown"
        _show(f"  {match.fullname} (rank {match.rank}, disclosed {date})")


# The rules said no (not a broken file or server): exit code for a refusal.
VALIDATE_REFUSED_EXIT_CODE = 1


def _refuse_validation(
    reason: str, code: int = VALIDATE_REFUSED_EXIT_CODE
) -> typer.Exit:
    """Show why validation cannot go ahead and return the exit to raise."""
    logger.error("Validation refused: %s", reason)
    error_console.print(
        f"[red]Cannot validate:[/red] {escape(reason)}", soft_wrap=True
    )
    return typer.Exit(code=code)


def _load_scan_for_validation(scan_name: str | None) -> tuple[ScanResult, Path]:
    """Find and read the scan to validate. Exit 2 if missing, 4 if unreadable."""
    try:
        directory = find_scan_dir(scan_name)
        scan_result = read_scan_file(directory / SCAN_DATA_FILE)
    except ScanNotFoundError as error:
        raise _refuse_validation(str(error), SCAN_NOT_FOUND_EXIT_CODE)
    except (ScanDataError, OSError) as error:
        raise _refuse_validation(str(error), ANALYSE_FAILED_EXIT_CODE)
    return scan_result, directory


def _refuse_unsuitable_scan(scan_result: ScanResult) -> None:
    """Refuse a demonstration scan, or one that was already validated."""
    if is_demo_scan(scan_result):
        raise _refuse_validation("this is a demonstration scan, not a real one.")
    if scan_result.validation_notes:
        raise _refuse_validation(
            "this scan already has validation results, "
            "so it cannot be validated again."
        )


def _require_lab_gate(target: str) -> str:
    """Refuse unless the scope file and the lab list both allow the target.

    Returns the normalised target.
    """
    decision = _evaluate_target(target)
    try:
        policy = load_policy(default_policy_path())
    except PolicyError as error:
        logger.error("Policy file problem: %s", error)
        error_console.print(
            f"[red]Policy file problem:[/red] {escape(str(error))}", soft_wrap=True
        )
        raise typer.Exit(code=SCOPE_ERROR_EXIT_CODE)
    gate = check_lab_gate(policy, decision)
    if not gate.allowed:
        raise _refuse_validation(gate.reason)
    return decision.normalised


def _show_planned_check(
    settings: RpcSettings, finding: Finding, item: PlannedCheck
) -> None:
    """Show which module a check would use for one finding. Nothing is run."""
    _show()
    _show(f"Finding {item.finding_index + 1}: {_printable(finding.title)}")
    cve_ids = [_printable(cve_id) for cve_id in finding.cve_ids]
    _show("  CVE ids: " + ", ".join(cve_ids[:MAX_LISTED_CVES]))
    candidates = find_candidates(settings, item.queries)
    if not candidates:
        _show(f"  Nothing would run: {NO_CANDIDATE_NOTE}")
        return
    for candidate in candidates:
        name = _printable(candidate.fullname)
        if module_supports_check(settings, candidate.fullname):
            _show(f"  Would run: {name} (rank {_printable(candidate.rank)})")
            return
        _show(f"  {name} has no check.")
    _show(f"  Nothing would run: {NO_CHECK_NOTE}")


VALIDATE_CHECK_REASON = (
    "Check-only Metasploit modules, started after the scope and lab checks passed."
)


def _show_check_run(run: CheckRun) -> None:
    """Show each check result, then each finding that was skipped."""
    _show()
    for result in run.results:
        _show(
            f"Finding {result.finding_index + 1}: "
            f"{_printable(result.module)} result {result.outcome.value}"
        )
    for note in run.skipped:
        _show(f"Skipped: {_printable(note)}")


def _save_validation(
    scan_result: ScanResult, run: CheckRun, directory: Path
) -> None:
    """Put the results into the scan and rewrite its reports."""
    try:
        updated = apply_validation(scan_result, list(run.results))
    except SaveRefusedError as error:
        logger.error("Validation not saved: %s", error)
        error_console.print(
            f"[red]Not saved:[/red] {escape(str(error))}", soft_wrap=True
        )
        raise typer.Exit(code=SAVE_REFUSED_EXIT_CODE)
    try:
        generate_scan_reports(updated, directory=directory)
    except OSError as error:
        logger.error("Validation could not be written: %s", error)
        error_console.print(
            "[red]Cannot save:[/red] the scan folder could not be written.",
            soft_wrap=True,
        )
        raise typer.Exit(code=ANALYSE_FAILED_EXIT_CODE)
    _show(f"Saved: findings, notes and reports in {directory.name} were updated.")


def _run_confirmed_checks(
    scan_result: ScanResult,
    directory: Path,
    target: str,
    plan: tuple[PlannedCheck, ...],
) -> None:
    """Run the planned checks against the target, then save the results.

    The order is fixed: settings first (a missing password stops here),
    then the audit record (a failure stops here), and only then anything
    that touches the target.
    """
    settings = _load_msf_settings()
    _audit("validate-check", target, True, VALIDATE_CHECK_REASON)
    try:
        run = run_planned_checks(settings, target, plan)
    except RpcError as error:
        raise _msf_failure(error)
    _show_check_run(run)
    _show()
    if not run.results:
        _show("No check produced a result, so nothing was saved.")
        return
    _show("Checks were sent to the target. A result is only what the module reported.")
    if run.skipped:
        _show("Skipped findings are listed above only. They are not saved in the scan.")
    _save_validation(scan_result, run, directory)


@app.command()
def validate(
    scan_name: str | None = typer.Option(
        None,
        "--scan",
        help="Scan folder to validate, such as scan_001. Default: the newest.",
    ),
    confirm: bool = typer.Option(
        False,
        "--confirm",
        help="Run the checks against the target. Without it, this is a dry run.",
    ),
) -> None:
    """Validate findings in a controlled, authorised lab environment.

    Without --confirm this is a dry run. It shows which checks would run,
    using read-only questions to the local Metasploit server. Nothing is
    sent to the target and no file is changed.

    With --confirm, each planned check is run against the target, the
    results are saved into the scan, and its reports are rewritten. The
    target must be in both the scope file and the policy lab list.
    """
    scan_result, directory = _load_scan_for_validation(scan_name)
    _refuse_unsuitable_scan(scan_result)
    target = _require_lab_gate(scan_result.target)
    plan = plan_checks(scan_result.findings)
    _show()
    _show(f"Scan folder : {directory.name}")
    _show(f"Scan ID     : {_printable(scan_result.scan_id)}")
    _show(f"Target      : {_printable(scan_result.target)}")
    _show(f"Findings    : {len(plan)} of {len(scan_result.findings)} can be checked")
    if not plan:
        _show()
        _show(
            "No finding can be checked: each one is already decided "
            "or has no CVE id to look up."
        )
        return
    if confirm:
        _run_confirmed_checks(scan_result, directory, target, plan)
        return
    settings = _msf_start("module.search, module.info")
    try:
        for item in plan:
            finding = scan_result.findings[item.finding_index]
            _show_planned_check(settings, finding, item)
    except RpcError as error:
        raise _msf_failure(error)
    _show()
    _show("Dry run: nothing was sent to the target.")
    _show("Metasploit on this machine was asked read-only questions only.")
    _show("No scan file was changed.")


@app.command()
def report(
    target: str = typer.Option(
        "demo.local",
        "--target",
        "-t",
        help="Target the report describes.",
    ),
    output: str | None = typer.Option(
        None,
        "--output",
        "-o",
        help="Directory to write the report into. Defaults to a new numbered scan folder.",
    ),
) -> None:
    """Generate a human-readable TXT security report.

    This command generates a report from clearly labelled demonstration
    data and sends no network traffic. Real scans use the scan command.
    It creates the standard report folder structure and keeps a
    JSON copy of the structured data so reports can be regenerated.
    """
    scan_result = _build_demo_scan(target)
    directory = Path(output) if output else None
    paths = generate_scan_reports(scan_result, directory=directory)

    table = Table(title="GhostSight Report", show_header=False, box=None)
    table.add_row("Scan ID", paths.directory.name)
    table.add_row("Target", scan_result.target)
    table.add_row("Profile", scan_result.profile)
    table.add_row("Directory", str(paths.directory))
    table.add_row("Files", str(len(paths.all_files())))
    console.print(table)
    console.print(f"[green]Report written to:[/green] {paths.final_report}")
    logger.info("Report command completed for %s", scan_result.target)


def _build_demo_scan(target: str) -> ScanResult:
    """Return clearly labelled sample data used until the scanner exists.

    Demo data is never marked as authorised, because no scope check
    has been performed.
    """
    started = datetime.now(timezone.utc).isoformat()
    return ScanResult(
        target=target,
        scan_id="demo-001",
        profile="low-noise",
        started_at=started,
        finished_at=started,
        duration_seconds=0.0,
        scanner="none (demonstration data)",
        authorised=False,
        notes=[
            "DEMONSTRATION DATA: generated by the report command, not by a scan.",
            "No network traffic was produced and the target was not contacted.",
            "The finding below is an example, not a real vulnerability.",
        ],
        services=[
            Service(
                host=target,
                port=22,
                protocol="tcp",
                name="ssh",
                version="OpenSSH 8.9p1 Ubuntu 3ubuntu0.6",
                extra_info="",
            ),
            Service(
                host=target,
                port=80,
                protocol="tcp",
                name="http",
                version="Apache 2.4.58",
                extra_info="",
            ),
        ],
        findings=[
            Finding(
                title="Example finding: version information disclosure",
                description=(
                    "This entry demonstrates how a finding is rendered. "
                    "It is not a real vulnerability."
                ),
                severity="low",
                confidence=0.85,
                status=FindingStatus.POTENTIAL,
                cve_ids=["CVE-0000-0000"],
                cvss_score=3.7,
                evidence=[
                    "Service banner reported OpenSSH 8.9p1.",
                    "Banner matching alone does not confirm a vulnerability.",
                ],
                remediation=(
                    "Suppress version banners in SSH configuration where "
                    "practical, and keep the software patched."
                ),
                affected_service="ssh (OpenSSH 8.9p1)",
            )
        ],
        ai_analysis="",
        validation_notes=[],
    )


if __name__ == "__main__":
    app()
