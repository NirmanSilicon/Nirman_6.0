# GhostSight Project Status

## Current state

| Item | Value |
|---|---|
| Latest release | 0.8.0 (controlled lab validation; tag `v0.8.0`, pointing at commit 1e2ffbb; tag object 72d09647996f470be9749f97b646489137ce1c5f; pushed to GitHub). Earlier releases: 0.7.0 (Metasploit connection and read-only queries; tag `v0.7.0`, pointing at commit 8c1b0c8; tag object 16f2057b1fcf2203e02e0e929f80c78168cf0ba7), 0.6.0 (audit log and policy engine; tag `v0.6.0`, pointing at commit 00f9aaa; tag object 9bf76102070f52a7e753542ebb1d2f570f031a93), 0.5.0 (local AI; tag `v0.5.0`, pointing at commit 2645865; tag object d4d0423b1fe19da18545ccdd88b23e214e630f8b), 0.4.0 (vulnerability intelligence; tag `v0.4.0`, pointing at commit 33b329e; tag object 86791d98e1afeeb9c02062a0a8c52007151ff9d3), 0.3.0 (tag `v0.3.0`, pointing at commit 3a05073; tag object b579f4088c88b267c98bcd2d54a2899414ea9fc8), 0.2.0 (tag `v0.2.0`, pointing at commit c8c9510; tag object d5a695980c1684769598d99ef84c78fbe1d315b5) and 0.1.0 (tag `v0.1.0`, pointing at commit c0243e6; tag object 476c386). |
| In development | Nothing is in development at the moment. v0.8.0 (controlled lab validation) is built, tested, tagged and pushed, and v1.0.0 is next (planning has not started). Known limits of v0.8.0: against the real lab laptop `analyse` finds 0 findings (Windows reports no application versions), so no real `module.check` has run, and the `vulnerable` path is tested only against a fake server. See Known bugs and issues. 1548 tests pass in total. |
| Current stage | `ghostsight scan` runs a real Nmap scan of scope-approved targets and writes reports. `ghostsight nvd-fetch` stores NVD records for a product in the local cache, and `ghostsight analyse` checks a saved scan against that cache (`--save` stores the findings in the scan folder). Findings are version matches only: at most "potential", with platform and backport caveats. `ghostsight explain` asks a local AI model (`qwen3:4b` through Ollama on 127.0.0.1) to explain a saved scan in plain language, and `--save` stores the text in `ai_analysis.txt`. A block of facts counted by code is printed above the AI text. The AI cannot change a finding. Every scan decision is recorded in a tamper-evident audit log (`<home>/logs/audit.jsonl`, checked by `ghostsight audit verify`), and a policy file sets the largest range a scan may cover (default 1024 addresses). `ghostsight validate` plans Metasploit check-only modules for saved findings. Without `--confirm` it is a dry run that sends nothing to the target. With `--confirm` it runs the checks against one lab target that is in both the scope file and the policy `[lab]` list, then saves the result. `scan --skip-discovery` skips the host-up check (Nmap -Pn) for one address. Three read-only Metasploit commands (`ghostsight msf version`, `msf stats`, `msf search`) ask a local `msfrpcd` server questions, each recorded in the audit log before it is sent. Only `validate --confirm` starts a check, and only check-only auxiliary modules. GhostSight has no call that executes a module. Masscan 1.3.2 is installed on the development machine but GhostSight does not use it (deferred, decision 29). |
| Last commit before this update | 1e2ffbb Update the README and status for the v0.8.0 release |
| Remote | origin (GitHub, SSH). The commit that updates this file is not listed here because a file cannot contain the hash of its own commit. |
| Version number | 0.8.0, written only in `ghostsight/__init__.py`; `pyproject.toml` reads it dynamically. `pip install -e .` must be rerun after changing it. It changes only when a release is made. |
| License | MIT, `Copyright (c) 2026 ashmit-rath` |
| Tests | 1548 pytest tests passing |
| Next | Plan v1.0.0 (not started): SQLite storage, and AI-written suggested fixes as a candidate. |

## Documentation standards

- Internal documents (this file, the README, notes) hold technical information only: project status, completed modules, pending tasks, known bugs, tests, version numbers and Git commits.
- They carry no authorship fields and no AI-attribution sections, and they do not claim who wrote what. Nothing of that kind is added unless explicitly requested.
- Wording is plain and states only what was verified. Claims that were reasoned, or recalled from memory, are labelled as such.
- Left as they are on purpose: the MIT copyright line in `LICENSE` (a legal notice), Git commit metadata (recorded by Git), and the word "authorised" in scope, scan and report text (it describes a safety feature).
- Code follows the existing standards: type hints, small functions, readable names, and subprocess calls with list arguments and no shell.

## Completed modules

Released in v0.1.0:

- Environment verification (Ubuntu 24.04, Python 3.12.3, Git 2.43, RTX 5060, driver 595.84)
- Git repository, virtual environment, directory skeleton, `.gitignore`
- GitHub repository and SSH authentication
- `pyproject.toml` and the `ghostsight` command (Typer + Rich)
- File logging with `--verbose` (`ghostsight/logging_config.py`, `ghostsight/paths.py`)
- Reporting layer (`ghostsight/reporting/`): data model, text formatters, report generator
- Numbered scan directories (`scan_001`, `scan_002`) with seven files each
- Structured JSON output (`scan_data.json`) as the source of truth
- `report` command, generating clearly labelled demonstration data
- Real `status` command with system checks (`ghostsight/system_check.py`)
- MIT `LICENSE`, single-sourced version number, `README.md`

Released in v0.2.0 (scanning engine):

- Scope manager (`ghostsight/security/scope_manager.py`): deny-by-default allowlist in TOML, IP addresses and CIDR ranges only. `config/scope.example.toml` is committed; `config/*.local.toml` is git-ignored.
- `scope` command: checks a target against the allowlist, sends no network traffic
- Nmap command builder (`ghostsight/integrations/nmap_runner.py`): Low-Noise, Normal and Deep profiles. It runs nothing.
- Nmap XML parser (`ghostsight/integrations/nmap_parser.py`): treats Nmap output as untrusted data
- Nmap executor (`ghostsight/integrations/nmap_executor.py`): the only module that starts a process
- Scan workflow (`ghostsight/scanner.py`): no Typer dependency; `authorised` comes only from the scope decision
- Real `scan` command with `--profile low-noise|normal|deep`
- Reports that say when analysis was not run (`analysis_performed`) and what "authorised" means
- `status` labels Masscan as "Not used yet (optional)"
- `README.md` rewritten to match the real program, including `scope` and `scan`

Deferred from v0.2.0: Masscan discovery (decision 29).

Released in v0.3.0 (service intelligence):

- `Service.cpe`: CPE names that Nmap reports for a service, read by the parser, validated, and written to `scan_data.json`. GhostSight never builds a CPE itself (decisions 31, 32).
- CPE names are shown in `services.txt` only, one per line. The overview table and the final report do not show them, to stay short for non-experts.
- Report text neutralisation: every value that comes from a scanned host, or from the report header, is shown on exactly one line, so banner text cannot forge a line such as `Authorised  : Yes` (decision 33). This was found by a probe, fixed test-first (22 tests failed, then passed), and covers `services.txt`, the overview table and the final report.
- `Service.product` and `Service.product_version`: Nmap's `product` and `version` attributes, stored separately and exactly as received, and written to `scan_data.json`. `Service.version` is unchanged and stays the combined display text. Only the Nmap parser fills the two new fields, and no report shows them yet (decision 34). This was done test-first (8 of 9 new tests failed, then passed).
- `README.md` describes v0.3.0, and `__version__` is 0.3.0.

Deferred from v0.3.0: the audit log and the policy engine (decision 35).

Released in v0.4.0 (vulnerability intelligence):

- NVD CVE reader (`ghostsight/intelligence/nvd_reader.py`): a pure function, `read_cve(raw)`, that turns the inner `cve` object of one NVD API 2.0 entry into frozen dataclasses (`CveRecord`, `CvssScore`, `Configuration`, `MatchNode`, `MatchRule`). It uses no network, writes no files and does not import Typer. `analysis.py` calls it (see the later items).
- Only a missing or malformed CVE ID stops the read (`NvdFormatError`). The ID must fully match `CVE-`, four ASCII digits, `-`, and four or more ASCII digits. The error message does not repeat the bad text. Everything else is read defensively: a text field of the wrong type becomes an empty string, and a malformed score, or a rule whose `criteria` is not text, is dropped.
- Every CVSS entry is kept with its source, type, version, severity and vector, newest family first (V3.1, then V2). Other families (`ssvcV203`, V3.0, V4.0) are ignored for now. Nothing picks between scorers (decision 36 b).
- Match rules keep their four version bounds and the `vulnerable` flag, grouped by node and configuration, so `AND` platform conditions stay visible. `vulnerable` and `negate` are True only when the source value is exactly JSON `true`.
- A base score must be a real number from 0 to 10 and not a bool. Anything else is dropped, and the check runs before any `float()` conversion (decision 36 g).
- Text is kept exactly as received. Neutralising it is the job of whatever writes it out (decisions 24 and 33).
- Run once over the real 32-record NVD response for 9.6p1: every record read and nothing was dropped (see the research section).
- CPE version reader (`ghostsight/intelligence/cpe_version.py`): `read_cpe_version(cpe)` reads the version from an Nmap CPE name such as `cpe:/a:openbsd:openssh:9.6p1` into a frozen `ServiceVersion` (part, vendor, product, number, update). `9.6p1` becomes number `9.6` and update `p1`. A CPE with no version, a `*` or `-`, or a shape it does not know (`1.0.2k`, `9.6p`, `9.6p1p2`, non-ASCII digits, a trailing newline) gives `None`. 27 tests.
- NVD criteria reader (`cpe_criteria.py`): `read_criteria(text)` reads an NVD `cpe:2.3:` criteria string (11 fields) into a frozen `Criteria`. Fields are kept as received (`*`, `-` and glued versions such as `4.3p2` pass through). A name containing a backslash is refused (`None`). 23 tests.
- Dotted number comparison (`version_compare.py`): `parse_number` accepts digits and dots only, with no leading zeros and at most 40 characters. `compare_numbers` pads with zeros, so `9.6` equals `9.6.0`, and gives `None` for unreadable input. 36 tests.
- Single-rule matcher (`rule_match.py`): `apply_rule(rule, target)` returns one of five results: `MATCH`, `NO_MATCH`, `NOT_APPLICABLE`, `VERSION_UNREADABLE`, `NAME_UNREADABLE`. (Changed by decisions 43 and 44: a bare wildcard is a match, and a range rule that names a different update is cannot tell.) An exact version with update `-` matches only a target with no update, and `*` matches any update. Tests are in `test_rule_match.py`, `test_any_version.py` and `test_range_update.py`.
- Per-CVE matcher (`cve_match.py`): `match_cve(record, target)` returns `MATCH`, `CANNOT_TELL` or `NO_MATCH`. A matching rule in an ordinary node gives `MATCH`. An unreadable rule gives `CANNOT_TELL`. Rules in a negated node, or a node whose operator is not OR, never count as a match, and if one is not simply "not applicable" the answer is `CANNOT_TELL`. Such nodes were never seen in real data. 15 tests.
- Regression tests (`tests/test_probe_cases.py`): 8 tests that rebuild CVE-2024-6387 and CVE-2025-26466 by hand from the probe notes and check them against 4.4p1, 7.4p1, 9.6p1 and 9.8p1 (no match, no match, match, match). They are in-sample and are characterisation tests: they passed on the first run.
- Unreadable data never becomes "no match"; it becomes "cannot tell" (decision 38). `analysis.py` now calls these modules (see the later items).
- The first five matcher test files were run before their modules existed and each stopped at collection with `ModuleNotFoundError`. That shows only that they were written first, not that they test behaviour.
- Score choice (`score_choice.py`): `choose_scores(scores)` returns a frozen `ScoreChoice` (the scores to show, and a note). The NVD Primary scores of the newest CVSS version win (V3.1 over V2), and a Primary V2 score beats a Secondary V3.1 score. With no Primary score, every score is shown with its source. Disagreement is compared within one CVSS version only, and the note names each source and score. Scores are never averaged, maximised or minimised. A CVE with no score gets a note saying that does not mean it is harmless. 17 tests.
- Evidence (`evidence.py`): `build_evidence(record, target)` returns a frozen `Evidence`: the CVE ID, the answer (match, cannot tell or no match), the matched rules, caveats and the chosen scores. Matched rules are listed only when the answer is match, in rule order and never from negated or non-OR nodes, each with its basis (exact version, bounded range or open-ended range). A match carries two caveats: the platform conditions were not checked, and a distributor may have backported a fix. Cannot tell carries the same two plus a statement that part of the CVE data could not be read or compared and that this is not a clean result. No match carries no caveats (pinned by a test). A target of `None` (no version) gives cannot tell, no matches and a no-version caveat. It imports the underscore name `_is_odd` from `cve_match.py`. 20 tests.
- On-disk NVD cache (`nvd_cache.py`): `write_cache(vendor, product, cves, fetched_at)` and `read_cache(vendor, product)`. One JSON file per vendor and product at `<home>/cache/nvd/<vendor>/<product>.json`, holding `fetched_at` and the raw NVD `cve` objects. A name is accepted only if it fully matches `[A-Za-z0-9][A-Za-z0-9._-]{0,63}` (checked on the original text, then lowercased). Anything else raises `UnsafeNameError` on write, creates nothing on disk, and reads as `None`. A write goes to a temporary file in the same folder and is swapped in with `os.replace`, so a failed write leaves the old file readable and no temporary file behind. A read gives `None` for a missing, oversize (`MAX_CACHE_BYTES`) or damaged file, and the caller must treat `None` as cannot tell, never as no CVEs. The cache never reads the clock and never uses the network. `/cache/` is git-ignored. 29 tests.
- Service versions (`service_target.py`): `service_versions(service)` reads every CPE on a `Service` with `read_cpe_version` and returns the readable versions as a tuple, without duplicates and in order. `product_version` and the display text are never parsed (decision 38 a). An empty tuple means cannot tell. 8 tests.
- NVD downloader (`nvd_download.py`): `download_cves(vendor, product, fetch, sleep, max_pages)` pages through NVD results by `startIndex` and returns the raw `cve` objects only when the number of distinct CVE IDs equals `totalResults` exactly. It starts no network, reads no clock and writes no files, because `fetch` and `sleep` are passed in. It raises `DownloadError` for a bad or changing total, an empty page before the total is reached, a duplicate ID, extra records, bad JSON or shape, the page cap (50, a guess) or a fetch error. 33 tests.
- NVD fetcher (`nvd_http.py`): the only module that talks to NVD. `fetch_nvd(url)` allows https and the host `services.nvd.nist.gov` only, follows no redirects, uses a 30-second timeout, accepts only status 200 and refuses a reply over a size limit (64 MiB, a guess). Network, HTTP and value errors become `FetchError`. 26 tests, all with a fake opener. It has never run against the real server.
- Cache update (`nvd_update.py`): `update_cache(vendor, product, fetch, sleep, now)` downloads, writes the cache only after a complete download, and returns the record count. 14 tests.
- `nvd-fetch` command: `ghostsight nvd-fetch --vendor V --product P` checks the names, prints a warning that NVD will see the product name and the user's IP address, and asks for confirmation unless `--yes` is given. Declining sends nothing (exit 1). An unsafe name exits 2. A failed download or cache write prints "Cache not updated" and exits 4. 13 tests (suite growth 609 to 622), all with fakes. The cache name check was made public as `safe_name` so the command and downloader reuse it (`e694305`).
- Matcher changes found by real data (decisions 43 and 44): a bare wildcard rule on the right product is a match with the basis "any version (no version limit)", and a range rule that names a different update is cannot tell. Commits `df925c3` and `984091b`, with `tests/test_any_version.py` and `tests/test_range_update.py`.
- Scan reader (`ghostsight/reporting/scan_reader.py`): `read_scan_file(path)` reads `scan_data.json` back into a `ScanResult`. It refuses files over 16 MiB, bad JSON, wrong types, bools used as numbers, NaN and infinity, and missing required fields (`target`, `scan_id`, `services`; `host`, `port`, `protocol` for a service; `title` for a finding). Optional fields get fixed defaults. A failure raises `ScanDataError` and its message never repeats the bad value. 70 tests.
- Confidence display (`formatters.py`): a confidence of exactly 0.0 is shown as "not rated" and not "0%", because 0.0 means no basis for a number. 10 tests (suite growth 692 to 702).
- Analysis (`analysis.py`): `analyse_services(services, load_cache)` turns a list of services and the cache into an `Analysis` (findings, notes, `services_checked`). One POTENTIAL finding per matching CVE, with evidence lines, and one UNKNOWN finding per service that lists every cannot-tell CVE. Only application CPEs are matched. Text it builds is printable ASCII, cut to 200 characters (decision 45). It never contacts NVD. 28 tests, plus 8 for `services_checked`.
- Scan finder (`scan_finder.py`): `find_scan_dir(name)` returns the newest scan folder that holds `scan_data.json`, or the folder for a name that fully matches `scan_` plus 1 to 9 digits. Messages are fixed and never repeat the name. 22 tests.
- `analyse` command: reads a saved scan, checks it against the cache and prints the findings. A preview: no file changes and nothing is sent to NVD. Exit 2 for no scan or a bad name, 4 for an unreadable or damaged scan file. 14 tests (suite growth 752 to 766).
- Analysis apply (`analysis_apply.py`): `apply_analysis(scan, analysis)` returns a copy of the scan with the findings, the analysis notes (prefix `Vulnerability analysis: `) and `analysis_performed` set. It raises `SaveRefusedError` for a demonstration scan or an analysis that checked no service. 16 tests.
- Atomic `write_scan_data` (`generator.py`): temporary file in the same folder, then `os.replace`, so an interrupted save cannot leave a half-written `scan_data.json`. Mode 0600 (measured). 8 tests.
- `analyse --save`: stores the findings in the scan folder and rebuilds all seven files. Refused (exit 2) for a demonstration scan or an unchecked analysis. A write failure prints a fixed message and exits 4. 12 tests. Checked on real data for 9.6p1 (see the research section "real-data results").

Built in v0.5.0 (local AI). The version was bumped to 0.5.0 (`7079a81`) and the tag `v0.5.0` points at `2645865`:

- `pydantic>=2.0.0` is declared in `pyproject.toml` (`717bebd`). It already arrived through Typer, but the code now imports it directly. The 2.0.0 lower bound is from memory. Tests ran on 2.14.3.
- Reply schema and validator (`ghostsight/intelligence/ai_explanation.py`): `AiExplanation` is a frozen, strict pydantic model with `summary` and `next_steps`, and extra fields are refused. It refuses blank text, `<think` or `</think`, and control or format characters (a newline is allowed in the summary only). `parse_explanation` raises `AiOutputError` with a fixed message and never repeats the model's text. `explanation_json_schema()` gives the schema that is sent to Ollama. The limits (summary 1000 characters, 8 steps of 300 characters, reply 20,000 characters) are guesses. 70 tests.
- Ollama client (`ollama_client.py`): `generate_explanation(prompt, model)` posts to `http://127.0.0.1:11434/api/generate` only (scheme, host and path are checked), ignores proxy variables and refuses redirects. The request sets `stream` false, `think` false, `format` to the schema, `num_ctx` 8192 and `num_predict` 1500. It requires status 200, a bounded body, `done_reason` `stop` and a non-empty `response`, and it never reads `thinking`. Failures become fixed messages. 52 tests plus 3 for the proxy handling. The timeout (300 s), the reply limit (1 MiB) and `num_predict` are guesses.
- Prompt builder (`ai_prompt.py`): `build_prompt(scan)` writes instructions, then the scan data between `BEGIN SCAN DATA` and `END SCAN DATA`, then a reminder. Every scan-derived value is cleaned and cut. The model sees at most 12 services, 8 findings (unknown first, then by highest score), 3 CVE IDs per finding and 4 notes (analysis notes first). Lines say how many were shown out of how many, and the totals by status are given in full. The prompt is capped at 7700 characters. 21 tests, plus 9 for the totals-and-notes change (suite growth 1007 to 1016) and 1 for the context budget.
- AI text (`ai_text.py`): `format_explanation` writes the section labelled `AI-GENERATED TEXT - NOT PROOF`. 12 tests. `ai_apply.py`: `apply_ai_text(scan, text)` returns a copy of the scan with `ai_analysis` set, and refuses a demonstration scan or empty text. 12 tests. The empty `ai_analysis.txt` section now says to run `explain` with `--save`. 3 tests.
- `explain` command: `ghostsight explain --scan scan_NNN [--save]` builds the prompt, calls the local model and prints the labelled text. It is a preview unless `--save` is given. A demonstration scan is refused before the AI is called. Exit 2 for no scan, a bad name, a demonstration scan or a refused save, and exit 4 for an unreadable scan file, an AI failure or a write failure. 17 tests with a fake AI.
- `analyse --save` clears any saved AI text (`analysis_apply.py`), because the text described the old findings. 3 tests.
- `status` reports the Ollama server as WARN when it runs with no model installed (`7b0c0c0`). It checks only that some model exists, not that it is `qwen3:4b`. 4 tests.
- Fixes found by running `explain` on a real scan (details in the v0.5.0 research section): the prompt carries the totals, the highest scores and the notes (`0bec10b`). The stale "No vulnerability analysis has been done yet" note is dropped when analysis is saved, through the shared constant in `ghostsight/reporting/notes.py` (`bd8fd06`). `num_ctx` was raised from 4096 to 8192 so that a worst-case prompt and reply fit (`f65f4c1`). `ghostsight/intelligence/scan_facts.py` builds a block of facts counted by code, printed above the AI text in the preview only and never saved (`980fc65`). 9 tests for the facts, 2 for the command, 5 for the note cleanup, 1 for the context budget.
- `README.md` describes `explain`, the Ollama setup and the AI limitations (`a39dfda`).

Built in v0.6.0 (audit log and policy engine). The version was bumped to 0.6.0 (`d6c6cf8`) and the tag `v0.6.0` points at `00f9aaa`:

- Audit log (`ghostsight/security/audit_log.py`, `773bfae`): JSON Lines at `<home>/logs/audit.jsonl`. Each record holds the time (UTC), event, target, allowed, reason, the previous record's hash and its own hash, so changing a record breaks every later link. Four events are accepted (`scan`, `nvd-fetch`, `analyse-save`, `explain-save`). Target text is cut to 200 characters and reason text to 500. It never stores scan results, banners or AI text. The file is created with mode 0600 (measured). It fails closed: if the chain is damaged or the write fails, `AuditError` is raised and the action is refused. 18 tests.
- `ghostsight audit verify` (`3aa5155`): re-reads the log and prints `Records checked: N` (exit 0). No log prints `No audit records yet.` (exit 0). A broken chain prints a fixed problem text and exits 1. It never prints record contents and never creates the file. 12 tests.
- Audit hooks in `main.py` (`9ae5c91`): `scan` (allowed and refused scans), `nvd-fetch` (after the confirmation), `analyse --save` and `explain --save` (after the save is accepted). If the log cannot be written the command prints `Refused:` and exits 5 without carrying out the action. 15 tests with stubs. A real loopback run covered the scan hook only (see the v0.6.0 section on what was run).
- Policy loader (`ghostsight/security/policy.py`, `c76e45b`): `Policy(max_target_addresses=1024, lab_allowed=())` and `load_policy`. A missing file gives the defaults. The limit must be a whole number from 1 to 65536 (booleans, decimals and text are refused). Unknown sections and keys are refused. `[lab] allowed` is parsed into networks and is unused until v0.7.0. `config/policy.example.toml` is committed. 18 test functions, 23 cases.
- Policy evaluation (`b1389d7`): `PolicyDecision` and `evaluate_scan(policy, network)`. A range larger than the limit is refused with the reason `Refused by policy: the range covers N addresses and the limit is L.` `scan` now runs scope, then policy, then the audit record, then the scan. A broken policy file exits 3 and records nothing. The old 1024 limit in `nmap_runner.py` became a backstop equal to the largest allowed limit (65536), and `test_range_over_the_size_limit_is_rejected` now uses `10.0.0.0/8`. 6 tests for evaluation, 7 for the wiring, 1 for the refusal wording (the message had repeated the phrase `Refused by policy`).
- Scope loader fix (`dcda852`): a scope file that is not UTF-8 text raised `UnicodeDecodeError` and crashed the command (seen in a probe). It is now a `ScopeError`, so `scan` exits 3. 3 tests.
- `scan --help` now mentions the policy file, the audit log and exit code 5 (`1e09743`). 1 test.
- `README.md` documents the policy file, the audit log, `audit verify`, exit code 5 for `scan`, `nvd-fetch`, `analyse` and `explain`, corrected live-NVD statements and the renumbered roadmap (`8da8ff6`).

Built in v0.7.0 (Metasploit connection and read-only queries, lab only). The version was bumped to 0.7.0 (`b4b2569`). The tag `v0.7.0` points at `8c1b0c8`:

- `status` row (`ghostsight/system_check.py`, `72d324e`): `check_metasploit()` looks for `msfconsole` and `msfrpcd` with `shutil.which` and never starts either, because `msfrpcd -h` was seen starting the snap's database. The real row reads `metasploit | OK | msfconsole and msfrpcd found (not started) | Lab checks (not used yet)`. 5 tests.
- Metasploit RPC client (`ghostsight/integrations/metasploit_rpc.py`, `e67d92e`): JSON-RPC over plain HTTP with Python's standard library. The scheme, host (`127.0.0.1`) and path are checked, but not the port (the `msf` commands always use 55553, and the real HTTP test uses another port), proxy settings are ignored and redirects are refused. Only `core.version`, `core.module_stats` and `module.search` are allowed, and there is no generic call function. The user comes from `GHOSTSIGHT_MSF_USER` (default `msf`) and the password from `GHOSTSIGHT_MSF_PASSWORD`. The timeout is 30 s and replies over 1 MiB are refused. Every failure is an `RpcError` with a fixed message. 40 cases.
- Three read-only queries (`ghostsight/integrations/metasploit_queries.py`, `ecd7637`): `get_version`, `get_module_stats` and `search_modules`. A search keeps the first 100 matches and the true total, and text fields are cut to 200 characters. 34 cases. A real run showed that `module.search` gives an empty `disclosuredate` for many modules and the code refused those replies. An empty date is now no date (`6a0ffae`, fixed test-first, 7 cases in `test_msf_real_shapes.py`).
- Lab-target rule (`ghostsight/security/policy.py`, `2f0b470`): `evaluate_lab_target(policy, network)` allows one private address inside a range listed under `[lab] allowed`. It refuses an empty list, a range of more than one address, a non-private address, an address outside every listed range, and mixed IPv4 and IPv6. 10 cases. No command calls it yet (first use in v0.8.0).
- Audit event `msf-query` (`302ff29`): `EVENTS` now has five names, and an unknown name is still refused. 2 tests.
- `ghostsight msf version`, `msf stats`, `msf search QUERY` (`c52ed3c`): the order is settings, audit record, query. The record holds the server address and the method name, never the search text. Exit 2 for missing or unusable settings (nothing recorded), 4 for an unreachable server or unusable reply, 5 when the log cannot be written (nothing is sent). 11 cases, all with fakes.
- Test against a real local HTTP server (`c76cbbc`, `tests/test_msf_rpc_http.py`): a normal reply works, a `303` redirect is refused after one request, and a control shows that a plain opener follows the same redirect. 3 tests.
- `README.md` describes the `msf` commands, the `status` row, the lab-target rule and the limits (`1cca1a6`).

Built in v0.8.0 (controlled lab validation, lab targets only):

- Status rules (`ghostsight/validation/status_rules.py`, `b3455b2`): `decide_status` turns a check outcome (`vulnerable`, `appears_vulnerable`, `detected`, `cannot_tell`, `not_vulnerable`) into a finding status. `vulnerable` gives validated. `appears_vulnerable` gives likely, and only from potential or unknown. `not_vulnerable` gives false positive, except that a validated finding stays validated and is flagged as a conflict. `detected` and `cannot_tell` change nothing. A status is never lowered silently. Suite growth 1231 to 1259.
- Re-analyse guard (`ghostsight/intelligence/analysis_apply.py`, `9b17671`): `apply_analysis` refuses a scan that has `validation_notes`, so new findings cannot replace validated ones. `validation_notes` is the marker that a scan was validated. Suite growth 1259 to 1262.
- Lab gate (`ghostsight/validation/lab_gate.py`, `49d3adc`): `check_lab_gate` allows a target only when the scope file allows it and `evaluate_lab_target` allows it (policy `[lab] allowed`). Both must say yes. This is the first use of `evaluate_lab_target` by a command (decision 64). Suite growth 1262 to 1272.
- Module choice (`ghostsight/validation/module_choice.py`, `b7b5802`): picks candidate Metasploit modules from a finding's CVE ids. Only `auxiliary` modules are candidates, never exploits. At most 5 CVE queries and 3 candidates per finding, in rank order, without duplicates. Suite growth 1272 to 1295.
- Check client (`ghostsight/integrations/metasploit_check.py`, `ec50ecf`): separate from the read-only client, with its own method list (`module.info`, `module.check`, `module.running_stats`, `module.results`). `module.execute` is in no list. `module.check` is asynchronous, so the client polls `module.running_stats` (5 polls, 2 s apart; both are guesses) and then reads `module.results`. It sets only `RHOSTS`, and the target must be one canonical IP address. The result code is mapped fail-safe: an unknown code means cannot tell. Suite growth 1295 to 1409.
- Check plan (`ghostsight/validation/check_plan.py`, `ac6539d`): only findings with status potential, likely or unknown are planned. Decided findings are skipped. Suite growth 1409 to 1423.
- Validation apply (`ghostsight/validation/validation_apply.py`, `0b0efa8`): `apply_validation` returns a copy of the scan with the new statuses, one evidence line per checked finding and a note per check. It refuses a demonstration scan, a scan that was already validated, an empty result list and a bad finding index. Suite growth 1423 to 1449.
- Check run (`ghostsight/validation/check_run.py`, `27b01ab`): `run_planned_checks` walks the plan and runs the first supported module of each finding. A finding with no candidate module, or with no candidate that has a check, is skipped with a note. Suite growth 1449 to 1463.
- Audit event `validate-check` (`9bce89b`): `EVENTS` now has six names, and an unknown name is still refused. Suite growth 1463 to 1465.
- `ghostsight validate`, dry run (`e9c434d`): replaces the stub. It refuses a demonstration scan and an already validated scan, applies the lab gate, plans the checks, asks the local Metasploit server read-only questions (`module.search`, `module.info`) under one `msf-query` audit record, and prints the plan. It sends nothing to the target and changes no file. A plan with no checkable finding ends the command before Metasploit is contacted. Suite growth 1465 to 1482.
- `ghostsight validate --confirm` (`f06a126`): the order is settings, one `validate-check` audit record (it also covers the lookups), the checks, the result on screen, then the save. If no check produced a result, nothing is saved. A saved validation rewrites the report files. Suite growth 1482 to 1500.
- `validation.txt` (`ghostsight/reporting/formatters.py`, `bed2258`): the report file now explains each result in plain words, says that validation is for lab targets only, and strips control characters from the validation notes. The final report is unchanged. 11 tests (suite growth 1500 to 1511).
- End-to-end tests (`446e8dd`): 7 tests run the real `validate` command against a fake Metasploit server on a local HTTP port. They replace `load_settings` inside `ghostsight.main`. Suite growth 1511 to 1518.
- `scan --skip-discovery` (`7b2c883`, `05a10ab`, `0bfa857`, `90edda3`): an opt-in flag that adds Nmap `-Pn` for one address, so the ports are tried without a host-up check. It exists because the default profiles reported no host up on a firewalled Windows laptop. The command builder refuses a range, a range is refused in `scan` before the policy check and the audit record (exit 1), and the report notes say discovery was skipped and that this does not hide the scan. It is not the default for any profile and it is not an evasion option. Suite growth 1518 to 1545.
- `status` purpose text (`2c51ca7`): the Metasploit row now reads `Controlled lab validation` instead of `Lab checks (not used yet)`. It replaces the v0.7.0 text above. 3 cases (suite growth 1545 to 1548). Documentation: `README.md` (`9ee3855`) and the lab comment in `config/policy.example.toml` (`89fc4c2`).

## Commits since v0.1.0

| Commit | Change |
|---|---|
| c92acc8 | Add scope manager with deny-by-default target allowlist |
| ac032b9 | Return normalised target from scope decisions |
| 2eff4cf | Add scope command to check targets against the allowlist |
| 6a9872b | Make scan command refuse targets outside the allowed scope |
| 7bbbb59 | Add Nmap command builder with scan profiles |
| dd7ab91 | Add Nmap XML parser with untrusted-input safeguards |
| 3dc6596 | Add Nmap executor with timeouts and fail-closed errors |
| ec6f162 | Wire Nmap scanning into the scan command with scope-derived authorisation |
| c68cba6 | Make reports state when analysis was not run and what authorised means |
| ce35957 | Add --profile option to the scan command |
| 4bed9e4 | Update PROJECT_STATUS.md for v0.2.0 progress |
| ac25452 | Record Masscan decision and correct its install status |
| 19c166c | Stop labelling Masscan as needed for v0.2.0 in status |
| a1c40b0 | Rewrite README for v0.2.0: scope and scan commands, honest limitations |
| a7974fa | Bump version to 0.2.0 |
| a188083 | README: mark v0.2.0 as released |
| c8c9510 | Update PROJECT_STATUS.md for the v0.2.0 release (tagged `v0.2.0`) |

## Commits since v0.2.0

| Commit | Change |
|---|---|
| f773040 | Read validated CPE names from Nmap service data |
| 2580d17 | Show CPE names in the detailed services report |
| 1ba45e3 | Stop banner text from forging lines in text reports |
| 7e7bb5b | Update PROJECT_STATUS.md for the first v0.3.0 milestone |
| 51357d9 | Store Nmap product and version as separate Service fields |
| ed490e0 | Update PROJECT_STATUS.md for the product/version split |
| f4579cc | README: describe v0.3.0 service intelligence and mark it as released |
| 2bc6530 | Bump version to 0.3.0 |
| 3a05073 | Update PROJECT_STATUS.md for the v0.3.0 release (tagged `v0.3.0`) |

## Commits since v0.3.0

| Commit | Change |
|---|---|
| 3417f1e | Record v0.4.0 NVD probe findings and the Windows lab laptop |
| 9c68b47 | Add NVD CVE reader with scores kept per source and AND rules kept |
| e4f27ef | Reject impossible CVSS base scores in the NVD reader |
| 94e5526 | Update PROJECT_STATUS.md for the NVD reader and score-range rule |
| c381f7a | Record second round of NVD version-matching probes and matcher policy |
| 61087f4 | Add CPE version reader for Nmap CPE names |
| 15aaddb | Add reader for NVD cpe:2.3 criteria strings |
| a01b88f | Add dotted version number parser and comparison |
| bccd8af | Add single-rule matcher with five distinct results |
| c3f2304 | Add per-CVE matcher that never turns unreadable data into no match |
| d6c2d0b | Add probe-derived regression tests for CVE-2024-6387 and CVE-2025-26466 |
| 191caec | Replace vague 'author' wording with neutral technical terms |
| b1e4380 | Record the version matcher modules, the lost probe data and matcher policy |
| 49daa5d | Add score choice: Primary first, labelled fallback, disagreement noted |
| 4ca0b34 | Add evidence: matched rules, basis, caveats and chosen score |
| 52dc70f | Ignore the local NVD cache folder |
| a0d2188 | Add on-disk NVD cache keyed by vendor and product |
| cae1a8f | Add reader that picks versions from a service's CPE names |
| f3d96d8 | Update PROJECT_STATUS.md for score choice, evidence, cache and service versions |
| df925c3 | Treat a bare wildcard rule on the right product as a match for every version |
| 984091b | Treat a range rule naming a different update as cannot tell, not a match |
| e694305 | Make the cache name check public so the downloader can reuse it |
| e50cad6 | Add NVD downloader that returns a complete set or fails |
| f7877fc | Add NVD fetcher: one host, HTTPS only, no redirects, size limit |
| c28de5c | Add cache update step that writes only after a complete download |
| 0e6aebe | Add nvd-fetch command: explicit, warns first, stores only a complete download |
| 9c9aa58 | Add strict reader for scan_data.json that refuses damaged files |
| e5e82c9 | Show an unrated finding as 'not rated' instead of 0% confidence |
| 668e2d1 | Add analysis: a potential finding per matching CVE, one unknown finding per service |
| d3c789d | Add scan finder: newest scan or a strictly checked scan name |
| 4fb1bb9 | Make analyse real: read a saved scan, check it against the NVD cache, print findings |
| e16cb0d | Count the services that were really checked against stored CVE data |
| aa813d7 | Add analysis_apply: put findings into a copy of a scan, refusing demo scans and unchecked analyses |
| 31e0f35 | Write scan_data.json atomically so an interrupted save cannot leave a half-written file |
| 8089ecc | Add analyse --save: store findings in the scan folder and rebuild its reports |
| 256fbd0 | Update PROJECT_STATUS.md: real-data results, corrections and decisions 42 to 46 |
| d7a02d6 | Update PROJECT_STATUS.md for v0.4.0: nvd-fetch, analyse, analyse --save, 810 tests |
| a777c74 | Update README for v0.4.0: nvd-fetch, analyse, limitations and roadmap |
| 5f2579c | Bump version to 0.4.0 |
| 33b329e | Update PROJECT_STATUS.md for the v0.4.0 release (tagged v0.4.0) |

The commit that updates this file is not listed, because a file cannot contain its own hash.

## Commits since v0.4.0

| Commit | Change |
|---|---|
| fb3b4d7 | Record v0.4.0 tag hashes in PROJECT_STATUS.md |
| 8fea99e | Record v0.5.0 probe results, GPU diagnosis and decisions 47 to 50 |
| 717bebd | Declare pydantic as a dependency |
| 535cebf | Add the AI reply schema and validator |
| bebc8d8 | Add the local Ollama client |
| d9706b1 | Add the AI prompt builder |
| 5c5fd3a | Add the AI analysis report text |
| 0aa62d2 | Add the AI text saving step |
| e1a48de | Point the empty AI section at the explain command |
| fb7c0e0 | Add the explain command |
| 1ab3999 | Clear stale AI text when a new analysis is saved |
| 7b0c0c0 | Report Ollama as not ready when no model is installed |
| 0bec10b | Give the AI prompt the totals, the highest scores and the notes |
| bd8fd06 | Drop the stale not-analysed note on save and list analysis notes first |
| f65f4c1 | Raise the model context to 8192 so a worst-case prompt and reply fit |
| 980fc65 | Show code-counted facts above the AI text in explain |
| a39dfda | Update README for v0.5.0: explain command, Ollama setup and AI limitations |
| 79983d6 | Update PROJECT_STATUS.md for v0.5.0: modules, commits and current state |
| 06bc3a3 | Update PROJECT_STATUS.md for v0.5.0: research results, decisions 51 to 55 and known issues |
| 7079a81 | Bump version to 0.5.0 |
| 2645865 | Update PROJECT_STATUS.md for the v0.5.0 release (tagged v0.5.0) |

The commit that updates this file is not listed, because a file cannot contain its own hash.

## Commits for v0.6.0

| Commit | Change |
|---|---|
| 773bfae | Add the audit log with a hash chain and fail-closed writing |
| 3aa5155 | Add the audit verify command |
| 9ae5c91 | Record scans, NVD fetches and saves in the audit log |
| c76e45b | Add the policy file loader |
| b1389d7 | Apply the policy size limit to scans |
| dcda852 | Handle a scope file that is not text |
| 1e09743 | Document the policy file and audit log in scan help |
| 8da8ff6 | Document the policy file, audit log and exit code 5 |
| 377bbef | Record v0.6.0 progress in PROJECT_STATUS.md |
| fd644bc | Record v0.6.0 limits and decisions in status |
| e4c1d28 | Record the real allowed scan in status |
| d6c6cf8 | Bump version to 0.6.0 |
| 00f9aaa | Update README and status for v0.6.0 (tagged v0.6.0) |

`c76e45b` and `b1389d7` were amended before they were pushed, so earlier hashes for them no longer exist. The tag `v0.6.0` points at `00f9aaa`. The commit that records the tag hashes is not listed, because a file cannot contain its own hash.

## Commits for v0.7.0

| Commit | Change |
|---|---|
| 72d324e | Add a Metasploit row to the status command |
| e67d92e | Add a local-only Metasploit RPC client |
| ecd7637 | Add three read-only Metasploit queries |
| 6a0ffae | Treat an empty Metasploit date as no date |
| 2f0b470 | Add a lab target rule to the policy engine |
| 302ff29 | Add the msf-query audit event name |
| c52ed3c | Add read-only msf commands with an audit gate |
| c76cbbc | Test the Metasploit client against a real local server |
| 1cca1a6 | Update README for v0.7.0 |
| b4b2569 | Bump version to 0.7.0 |
| 8c1b0c8 | Update README and status for v0.7.0 (tagged v0.7.0) |

The change text is the commit message as shown by `git log --oneline`. The tag `v0.7.0` points at `8c1b0c8` (tag object `16f2057b1fcf2203e02e0e929f80c78168cf0ba7`, annotated). Pushed to GitHub together with `main` (`377d760..8c1b0c8`) on the third attempt: the first two failed at SSH login with `Received disconnect ... Bye Bye` before any data was sent, and `ssh -T git@github.com` then succeeded (cause unproven; a slow passphrase was a guess). The commit that records these hashes is not listed, because a file cannot contain its own hash.

## Commits for v0.8.0

| Commit | Change |
|---|---|
| b3455b2 | Add rules that turn a check outcome into a status |
| 9b17671 | Refuse to re-analyse a scan with validation results |
| 49d3adc | Add the lab gate: scope and lab rule must both pass |
| b7b5802 | Add the choice of candidate Metasploit modules |
| ec50ecf | Add the check-only Metasploit call over RPC |
| ac6539d | Add the plan of which findings a check would cover |
| 0b0efa8 | Add recording of check results in a scan |
| 27b01ab | Add the runner for the planned Metasploit checks |
| 9bce89b | Add the validate-check audit event |
| e9c434d | Add the dry run of the validate command |
| f06a126 | Add validate --confirm to run the planned checks |
| bed2258 | Explain validation results in validation.txt |
| 446e8dd | Add end-to-end validate tests with a fake RPC server |
| 7b2c883 | Add skip_discovery option to the nmap command builder |
| 05a10ab | Pass skip_discovery through the Nmap executor |
| 0bfa857 | Add skip_discovery to the scan workflow and notes |
| 90edda3 | Add --skip-discovery to the scan command |
| 2c51ca7 | Fix the status purpose text for Metasploit |
| 9ee3855 | Update the README for v0.8.0 |
| 89fc4c2 | Fix the lab comment in the example policy |
| df1b6e7 | Update the status file for v0.8.0 |
| c027034 | Add a demo script |
| b865b1d | Record the demo rehearsal in the status file |
| be489d2 | Bump the version to 0.8.0 |
| 1e2ffbb | Update the README and status for the v0.8.0 release |

The change text is the commit message as shown by `git log --oneline`. These commits are included in the release tagged `v0.8.0`, which points at the last row (1e2ffbb). All of them are pushed to GitHub. The commit that records the tag and push is not listed, because a file cannot contain its own hash.

## Pending modules

- v0.3.0: Service intelligence (released)
- v0.4.0: Vulnerability intelligence (released)
- v0.5.0: Local AI (released)
- v0.6.0: Audit log and policy engine (released)
- v0.7.0: Metasploit RPC connection and check-only calls (lab only) (released)
- v0.8.0: Controlled lab validation (`validate` stops being a stub; released)
- v1.0.0: Stable release
- Audit log and policy engine: now v0.6.0 (decision 56). Decision 35 requires it before any Metasploit work
- Masscan discovery: deferred, no version assigned (see pending decisions)

## v0.4.0 research: NVD data

Probed read-only with `curl` and `python3` one-liners. NVD's own response timestamp is 2026-11-21. The responses were saved under `/tmp` and nothing from them is committed. The request asked about generic OpenSSH 9.6p1 and sent nothing about any scan or target.

Probed (seen in real output):

- Endpoint `https://services.nvd.nist.gov/rest/json/cves/2.0` with `cpeName=cpe:2.3:a:openbsd:openssh:9.6:p1:*:*:*:*:*:*` returned HTTP 200. NVD accepts the split form (`9.6` plus `p1`), while Nmap gives `cpe:/a:openbsd:openssh:9.6p1`.
- Response fields: `resultsPerPage`, `startIndex`, `totalResults`, `format`, `version`, `timestamp`, `vulnerabilities`. With `resultsPerPage=40` all 32 results came back in one page (172,585 bytes). The whole database reported `totalResults` 430350.
- Fields inside one CVE: `id`, `sourceIdentifier`, `published`, `lastModified`, `vulnStatus`, `cveTags`, `descriptions`, `affected`, `metrics`, `weaknesses`, `configurations`, `references`, `vendorComment` (the last name wrapped in the terminal; written here as seen, not confirmed).
- `descriptions` is a list of `{lang, value}` entries (`en` and `es` seen). `affected` held only `n/a` values in the entry that was printed.
- Scores: the two 2007/2008 CVEs have `cvssMetricV2` only. The other 30 have `cvssMetricV31` and `ssvcV203` (a CISA assessment). In V2, `baseSeverity` sits outside `cvssData`; in V3.1 it sits inside.
- Score sources: `Primary` is always `nvd@nist.gov` (23 entries). `Secondary` has 31 entries: `cve@mitre.org` 26, `secalert@redhat.com` 3, and two sources shown only as UUIDs. Entry combinations per CVE: Primary+Secondary 22, Secondary only 7, none 2, Primary+Secondary+Secondary 1.
- 18 of the 32 CVEs have V3.1 scores that disagree between sources, by up to about 5 points (for example 2.2 against 7.5). Neither source is consistently higher.
- Match rules: 79 configurations. 49 have one node and no `operator`. 30 have `operator: AND` with two nodes. Every node is `OR` and none is negated. 155 match entries are `vulnerable: true` and 37 are `false`. The 37 are all platforms (Alpine, Red Hat, SonicWall and NetApp hardware).
- The 30 `AND` configurations: 28 are a vulnerable operating system plus a non-vulnerable hardware node (not OpenSSH), and 2 pair vulnerable OpenSSH with a non-vulnerable operating system. Which operating systems the 2 name was not printed.
- Match entry fields seen: `vulnerable`, `criteria`, `matchCriteriaId`, `versionStartIncluding`, `versionEndIncluding`, `versionEndExcluding`. `versionStartExcluding` was not seen. By reading the printed lines: 3 CVEs (CVE-2007-2768, CVE-2008-3844, CVE-2023-51767) use the bare wildcard `openssh:*` with no range, most of the others use an open-ended `versionEndExcluding`, and CVE-2025-26466 lists exact versions only. A wildcard says "any version", so it does not distinguish 9.6p1 from any other.
- Backports on this machine: `dpkg -s` shows `1:9.6p1-3ubuntu13.18`. NVD's range for CVE-2024-6387 covers 8.6 to 9.8, which includes 9.6p1. Ubuntu's own changelog names `debian/patches/CVE-2024-6387.patch` in the entry `1:9.6p1-3ubuntu13.3`, which is older than the installed build. So a version-only match would flag a bug the distributor documents as patched.
- 16 of the 32 NVD IDs appear in Ubuntu's changelog. The newest changelog entry is dated 9 Jul 2026. The 13 unmentioned 2026 CVEs were published after that date, so the changelog cannot mention them (a timing fact, not a statement about whether they apply). Three older unmentioned CVEs (2007, 2008, 2023) have no timing explanation, and the reason is unknown.
- Changelog wording seen: lines such as `debian/patches/CVE-2025-32728.patch: fix logic error in session.c`. This is the distributor stating that it added a patch. It is not proof that the patch is complete.
- `apt-cache policy openssh-server` shows Candidate `1:9.6p1-3ubuntu13.20` against Installed `13.18`. That reflects the last `apt update` on this machine, whose date is unknown. The 13.20 changelog was not read.

Second round of probes: three more generic NVD queries and four read-only scripts. Each query sent only an OpenSSH CPE string, nothing about any scan or host. The responses and scripts were in `/tmp` and are now gone (see "Evidence lost" below). The results are recorded here as they were seen in real output and can no longer be checked.

Probed in the second round (seen in real output):

- Queries: `cpeName=cpe:2.3:a:openbsd:openssh:V:p1:*:*:*:*:*:*&resultsPerPage=100` for V = 7.4, 9.8 and 4.4 (the 9.6 answer is the first round's). `totalResults` equalled the number of records returned every time (45, 32 and 67; 32 for 9.6), so nothing was lost to paging. The timestamps printed for three of them are all 2026-11-21 (9.6 at 17:20, 9.8 at 19:15, 7.4 at 19:19); the 4.4 timestamp was not printed.
- Pool: 74 distinct CVEs across the four answers (47 from the 7.4 and 9.6 answers together, which the 4.4 answer grew by 27). No CVE ID has different content in different files.
- The 9.6p1 and 9.8p1 answers hold the same 32 CVEs in the same order, and only the top-level `timestamp` differs (0 of 32 records differ, which is why the file hashes differ). NVD's answer for 9.8p1 therefore cannot separate the two versions.
- 7.4p1 against 9.6p1: 30 CVEs in both, 2 only in the 9.6p1 answer (CVE-2024-6387, CVE-2025-26466), 15 only in the 7.4p1 answer. CVE-2025-26466 lists nine exact OpenSSH entries (9.5:p1, then each of 9.6 to 9.9 as `-` and as `p1`) and no range. CVE-2024-6387 lists `<4.4`, `8.6` to `9.8` inclusive, and exact `4.4:-`, `8.5:p1` and `8.6:-`.
- Reader on real data (the 32 records of the 9.6p1 answer only): 32 read, 0 failed. Raw against kept: scores 56 and 56, configurations 79 and 79, nodes 109 and 109, match rules 192 and 192. `vulnerable: true` 155, `AND` configurations 30, score versions 3.1 54 and 2.0 2, types Primary 25 and Secondary 31, base scores from 2.2 to 9.4, and no empty source, severity, vector, description, date or status. The reader has not been run on the other three answers.
- Correction: the first round's "Primary 23 entries" probably counted V3.1 only. The reader run counts 25 Primary entries over V3.1 and V2, and the 2 V2-only CVEs fit the earlier "none 2" (inferred; the reader run did not print sources).
- Rule shapes among the 846 OpenSSH rules in the 74 records: 72 ranges (a `*` version, with or without bounds), 528 exact versions, 245 glued versions (a version such as `4.3p2` in the version field, update `*`) and 1 range whose bound has letters. No other shape. In the 47-record pool the update field held `*`, `-` and `p1`, and no exact version or bound had letters.
- Exact rules in newer CVEs write `9.6p1` as version `9.6` plus update `p1`, and plain `9.6` as `9.6` plus `-`. The 245 glued rules are all `vulnerable: true` with update `*` and sit in 11 CVEs, and every glued version in the printed list is 5.8p2 or older. Ignoring them, or reading them as a number plus `p1`, gave the same result on all four targets (they matched only for 4.4p1, in 11 CVEs already matched by other rules), so no CVE in this data depends on them. Whether NVD treats `4.4p1:*` as the same as `4.4:p1` is therefore not settled.
- The one bound with letters is `versionEndIncluding: 4.3p2` in CVE-2008-4109, which appears only in the 4.4p1 answer. 4.4 is numerically above 4.3, so that rule cannot be what matched 4.4p1; another rule of that CVE did (not printed).
- (Withdrawn: the committed matcher does not ignore the update on range rules. See the real-data results section.) Ranges ignore the update field: CVE-2024-6387 is in NVD's answer for 9.8p1, and the only one of its OpenSSH rules that can cover 9.8p1 is the range ending at `versionEndIncluding: 9.8`. One CVE, so a strong hint and not a general proof.
- An exact `X:-` rule does not match a target `Xp1`: CVE-2024-6387 is not in NVD's answer for 4.4p1 (67 of 67 records returned), and its only rule that could match is the exact `4.4:-`. One CVE, and it assumes the printed rule list was complete.
- (Corrected: the "0 missing" result below does not hold for the committed matcher. See the real-data results section.) A throwaway prototype in `/tmp` applied these rules to the 74 records. Strict policy (an exact `-` matches only a target without an update): it reproduced NVD's four answers exactly (67, 45, 32 and 32 CVEs; 0 missing, 0 extra). Lenient policy (`-` also matches `p1`): the same except 1 extra, CVE-2024-6387 for 4.4p1. The prototype was written after the data was seen, so this is in-sample.
- The prototype ignored `AND` platform conditions and still matched NVD's answers, so for these queries NVD's `cpeName` search did not depend on them. That says nothing about whether a real host runs the named platform.
- Limits: the pool holds only CVEs that NVD returned for these four queries, so false positives are tested only against those 74. Everything is OpenSSH and all four targets are `p1` releases. Other products may write versions differently.

Evidence lost:

- The machine rebooted at 2026-11-23 01:08:08 (`uptime -s`) and `/tmp` was cleared (from memory, Ubuntu clears it at boot; the files were found missing here). Gone: the four saved NVD responses (`nvd_all.json`, `nvd_98.json`, `nvd_74.json`, `nvd_44.json`), `nvd_count.json`, `nvd_sample.json`, the four probe scripts (`probe_rules.py`, `probe_dash.py`, `probe_matcher.py`, `probe_glued.py`) and the old status backup. The repository was not affected. The risk was written down earlier, but the data was not moved in time.
- The 5 criteria strings with a backslash in the 4.4p1 response were counted but never printed, so which products they name is unknown. The other three responses were never checked for them.
- Consequence: the planned ground-truth test (the matcher against NVD's four answers, 74 records) cannot be written from stored data. `tests/test_probe_cases.py` covers two CVEs rebuilt by hand and stands in for it.
- Fetching the 4.4p1 answer again is possible (one generic query, saved outside `/tmp`, for example in `~/ghostsight-probe/`) but has not been done. Superseded: the data was fetched again in the third round (see the real-data results section). Earlier working assumption: no re-fetch. It is easy to reverse (see pending decisions).

Not probed (from memory, do not rely on any of it):

- NVD's maximum page size and rate limit (about 5 requests per 30 seconds without an API key, from memory), and whether an API key changes this.
- Bulk download options, the CVE List V5 repository, and Ubuntu's security tracker as a data source.
- How NVD orders `p2` against `p1` or a plain version inside a range bound (one bound with letters was seen), and whether a glued exact version equals the split form.
- Whether NVD matches an exact `X:-` rule against a target that has no update at all. Only the `p1` target case was observed.
- The shape of data for other products and vendors, including Windows software.
- The real size of a trimmed local cache. The figure of about 2.3 GB for the full raw database is a rough guess from 32 CVEs at about 5.4 KB each.
- Whether the 2 OpenSSH `AND` rules name a platform that GhostSight could ever confirm.
- NVD's terms of use for committing a trimmed copy of its data as a test fixture (not read).
- What the 5 backslash-escaped criteria names in the 4.4p1 response are (counted, never printed, data lost).
- CPE 2.3 backslash escaping (from memory: a backslash goes before special characters, including a colon) and whether CPE names are case-insensitive. The matcher compares part, vendor and product ignoring case, and refuses any name that contains a backslash.
- Python's limit on converting very long digit strings to integers (about 4300 digits by default, from memory). The matcher caps numbers at 40 characters before converting, so it should never reach it.

## v0.4.0 research: real-data results

Third round of probes, on the full OpenSSH record set. One generic NVD query sent only the CPE prefix `cpe:2.3:a:openbsd:openssh` (NVD sees the IP address and nothing about any scan or target). It returned all 147 records in one page: `totalResults` 147, 1,246,864 bytes, NVD timestamp 2026-11-25. NVD's own per-version answers were fetched for comparison: 9.6p1 (32 CVE IDs), 4.4p1 (67) and 7.2p2 (53). All files are in `~/ghostsight-probe/`, outside the repository, and must never be committed. The probe scripts there are read-only and make no network calls.

Matcher results with the committed matcher (`984091b`) over the 147 records (seen in real output):

| Target | No match | Cannot tell | Match |
|---|---|---|---|
| 4.4p1 | 52 | 28 | 67 |
| 7.4p1 | 66 | 36 | 45 |
| 9.6p1 | 78 | 37 | 32 |
| 9.8p1 | 78 | 37 | 32 |
| no version | 0 | 147 | 0 |

- Compared by CVE ID with NVD's own answers: 9.6p1, NVD 32, all 32 matched, no extras. 4.4p1, NVD 67, all matched, no extras. 7.2p2, NVD 53, all matched, no extras; this was an out-of-sample check, with the expectation written down before it ran. The cannot-tell CVEs (37 for 9.6p1) are not listed by NVD for that version, so for 9.6p1 cannot tell did not hide anything NVD reports. This was checked for 9.6p1 only.
- Reader on the 147 records: 147 read, 0 failed. Scores 232, configurations 401, nodes 509, rules 2330. 108 of 401 configurations are `AND`. 0 odd nodes (negated, or an operator other than OR). 1 rule name could not be read (CVE-2023-48795).
- Causes of cannot tell: glued versions such as `3.0p1`, a bound with letters such as `endIncl=2.9.9p2`, five `openssh:-` rules (CVE-2014-9278, CVE-2026-3497, CVE-2026-55653, CVE-2026-55654, CVE-2026-55655), and the one unreadable name.

Corrections found by this data:

- The earlier policy "a bare wildcard rule is not applicable" was wrong. It hid CVE-2007-2768, CVE-2008-3844 and CVE-2023-51767, which NVD lists for 9.6p1. Fixed in `df925c3` (decision 43).
- The earlier "ranges ignore the update field" was over-generalised from one CVE whose update is `*`. After the wildcard fix, 4.4p1 gave all 67 of NVD's CVEs plus 3 extras: CVE-2015-8325, CVE-2016-6210 and CVE-2016-6515. Each has the rule `cpe:2.3:a:openbsd:openssh:*:p2:*:*:*:*:*:*` with `versionEndIncluding` 7.2. Fixed in `984091b` (decision 44). Four rules in the sample name a specific update (`p2` in the three CVEs above, `p1` in CVE-2016-3115), so the policy rests on four rules in one product.
- The earlier note that the lost prototype reproduced NVD's answers "with 0 missing" does not hold for the committed code. Before the two fixes, the committed matcher missed 3 of NVD's CVEs for 9.6p1.
- An earlier reading, that 67 for 4.4p1 equalled NVD's 67, was a coincidence of offsetting differences (3 missing, 3 extra). It is not evidence.

Command checks on real data (throwaway home, offline, 9.6p1 only):

- `ghostsight analyse` printed 33 findings: 32 potential, matching NVD's 32 IDs, and 1 unknown that lists the 37 cannot-tell CVEs.
- A plain `analyse` left the `scan_data.json` hash unchanged.
- `analyse --save` exited 0. A second `--save` left all 7 files byte-identical, so no timestamp leaks into the reports.
- The saved JSON has `analysis_performed` true, 33 findings, and 1 note with the analysis prefix. The folder holds 7 files and no `.tmp-` leftovers.
- `vulnerabilities.txt` has 32 "Matched rule:" lines and 32 backport caveat lines, and `final_report.txt` says `Findings recorded : 33`.
- CVE-2024-6387 appears as an 8.1 (high) potential finding with the backport caveat. This confirms in a real saved report the caveat that the Ubuntu changelog probe (above) motivated.
- File modes (measured): `scan_data.json` is 0600, the other six files are 0664 under the user's umask 002.

Limits of this data: OpenSSH only, `p1` and `p2` targets only, and the record pool and NVD's answers come from the same endpoint. The `--save` check covered 9.6p1 only.

Still from memory or never run against the real server:

- The 147-record file came from `curl`. The `nvd-fetch` command and its real `urllib` opener have only run against fakes, never against NVD. (Updated: one live run was made after the v0.5.0 tag, see the section v0.5.0 research: real-data results.)
- NVD's maximum page size, how a result larger than one page is paged in practice, and the rate limit behind `PAUSE_SECONDS = 6.0` (about 5 requests per 30 seconds without a key, remembered, not read).
- NVD's terms of use for committing a trimmed copy of its data.

## v0.5.0 research: local AI probes

Probes were sent to the local Ollama server (`http://127.0.0.1:11434`, version 0.40.0) with model `qwen3:4b`. Prompts were generic and held no scan data. Probes 1 to 4 ran on the CPU (see the GPU timeline below).

| Probe | Request | Result |
|---|---|---|
| 1 | `think:false`, no schema | HTTP 200 in 8.98 s. `response` held about 150 tokens of reasoning, a literal `</think>`, then `ready`. No `thinking` field. The prediction (no reasoning text) was wrong. |
| 2 | `think` omitted, `num_predict` 400 | HTTP 200 in 8.52 s. `thinking` is a separate field and `response` is exactly `ready`. The prediction held. |
| 3 | `think:false` plus `format` schema | HTTP 200 in 3.17 s, 62 tokens. `response` is clean JSON with `summary`. No `thinking` field. |
| 3b | `think` omitted plus `format` schema, `num_predict` 800 | HTTP 200 in 21.9 s, 459 tokens. `thinking` is a separate field. `response` is valid JSON with `summary`, with odd whitespace, so only a JSON parser can judge it. The prediction held. |
| 4 | `ollama ps` | `100% CPU`, context 4096, size 3.2 GB, model unloads after idle (`OLLAMA_KEEP_ALIVE` 5m0s in the server log). The prediction (GPU) was wrong. |

Speed. On the CPU: about 21 to 22 tokens/s (62 tokens in 2.98 s, 147 in 6.70 s, 182 in 8.43 s, 459 in 21.9 s). On the GPU, warm, same one-word prompt: 144 tokens in 4.08 s and 186 tokens in 5.36 s, about 35 tokens/s, about 1.6 times the CPU. The prediction of 60 to 150 tokens/s was wrong. One sample taken during a single request: state P4, SM clock 690 to 1005 MHz against a 3090 MHz maximum, power 38.9 to 48.8 W, GPU utilisation 98 to 99 %; idle was P8, 180 MHz, 17.2 W. An earlier `nvidia-smi` table showed a 45 W power cap. This is consistent with a power-limited GPU but does not prove it, because temperature was not sampled and thermal limiting was not ruled out. Two timing runs and one clock sample, all with one trivial prompt.

GPU timeline (from `dpkg.log`, `journalctl -u ollama` and the commands run on 26 Nov):
- 24 Jul: libraries and the module for the `6.17.0-1030-oem` kernel were both 595.84.
- 7 Oct to 21 Nov 22:38: six Ollama starts logged `library=CUDA`.
- 22 Nov 00:13: libraries upgraded to 595.99.02. The module package for the oem kernel stayed at 595.84.
- 23 Nov 00:12 to 26 Nov 18:57: ten starts logged `library=cpu`. On the oem kernel `nvidia-smi` printed "Failed to initialize NVML: Driver/library version mismatch".
- 26 Nov, about 19:45: booted `7.0.0-43-generic` from the GRUB menu (its module is 595.99.02; Secure Boot is disabled). `nvidia-smi` worked (driver 595.99.02, RTX 5060, 8151 MiB) and `ollama ps` showed `100% GPU`. No package was installed or removed.
- The ordering is a correlation that fits the error message. The fix (booting the kernel with the matching module) is what showed the cause.

Not covered by the probes: `think:false` with a schema on a GPU run or on a real scan prompt; whether `num_predict` counts thinking tokens (459 is below 800); what Ollama does with a prompt longer than the 4096-token context; any prompt containing scan data; timeouts for long outputs. Ollama's default context of 4096 was measured by `ollama ps`, not read from documentation. (Updated: the schema probe, `think:false` with a schema, and prompts built from a real scan have since run. Timeouts for long outputs and prompt overflow have not. See the section "v0.5.0 research: real-data results".)

## v0.5.0 research: real-data results

Schema probe (generic prompt, no scan data, `num_ctx` 4096, the pydantic schema as `format`):

- Run 1, `think` omitted, `num_predict` 1500: 52.7 s, `done_reason` `length`, 1500 tokens, 6,893 characters in `thinking`, and an empty `response`. All the tokens went to thinking.
- Run 2, the same plus `think` false: 2.8 s, `done_reason` `stop`, 94 tokens, 393 characters in `response`, and it parsed. Decision 48 was wrong in practice and is marked as corrected below.
- Ollama accepted the schema keywords. Whether it enforces `maxLength` or `maxItems` is unknown. The validator enforces them either way.

Real run (a throwaway home, `/tmp/ghostsight-piece9`, scope allowing only 127.0.0.1, the NVD cache filled from the saved 147-record OpenSSH file, GPU on kernel 7.0.0-43-generic):

- Scan: 2 services. Port 22 ssh, OpenSSH 9.6p1 with the CPE `cpe:/a:openbsd:openssh:9.6p1`, and port 631 ipp, CUPS 2.4 (CPE `cpe:/a:apple:cups:2.4`).
- `analyse --save`: 33 findings, 32 potential and 1 unknown ("37 CVE records could not be checked", whose `cve_ids` list holds all 37). One note says 147 records were checked for openbsd:openssh. Another says CUPS had no cache and that this is not a clean result.
- First prompt: 2,501 characters, 838 tokens (the guess of 900 to 1,800 was wrong). After the first fix: 3,164 characters, 1,044 tokens, 159 reply tokens, about 32 to 34 tokens/s.

Defects that only real data showed, each fixed:

- The prompt showed the first 8 findings in list order, which hid the highest-scored finding (CVE-2026-60002, 9.4). Findings are now shown by importance, and the totals are given in full (`0bec10b`).
- The notes and the unknown finding never reached the model, and the CUPS note was cut by the limit of 4 notes. Analysis notes now come first (`0bec10b`, `bd8fd06`).
- The scanner's note "No vulnerability analysis has been done yet" stayed in a saved scan after analysis was saved, and the model repeated it. My first guess at the cause (the `Vulnerability analysis: ` prefix) was wrong. The cause was the note written in `scanner.py`. `apply_analysis` now drops it (`bd8fd06`).
- A worst-case prompt could exceed the 4096-token context (see the measurement below), so `num_ctx` is now 8192 (`f65f4c1`).

What the model wrote (five runs per set, one scan, and the prompt changed between the sets, so these are observations and not rates):

- Before the stale-note fix: 4 of 5 summaries said "8 potential vulnerabilities". One said no analysis had been done. Two said CUPS has no vulnerabilities.
- After the fixes: all five gave the correct total of 32, but 4 of 5 still said "8 potential vulnerabilities" (the fifth added "only 8 are shown here"). None said "no analysis". None mentioned the 37 unchecked records. Run 2 said CUPS "has no known vulnerabilities but was not checked", which the data does not support.
- Later single runs still open with "8" or "only 8 were shown". Wording changes did not fix the counting. No phrase deny-list was added, because it would be fitted to these samples. The facts block (`980fc65`) puts the counts from code above the text instead.

Worst-case prompt size (`num_predict` 16, `num_ctx` 4096, a synthetic hostile scan through `build_prompt`; the field limits held both prompts to 6,018 characters):

- Ordinary words: 1,259 tokens (4.78 characters per token).
- Random printable ASCII: 3,178 tokens (1.89 characters per token). With a 1500-token reply that is 4,678, over 4096. Ollama did not cut this prompt. What it does when prompt and reply exceed the context was not probed.
- 1.89 is one random sample and not a proven floor.
- At `num_ctx` 8192, `ollama ps` shows 3.9 GB and 100% GPU (3.2 GB at 4096).

Other checks: `explain --save` on the throwaway home printed the saved message, and the saved `ai_analysis.txt` held no facts block. The real `ghostsight status` printed "running, 1 model(s): qwen3:4b" and the GPU line with 595.99.02.

Live `nvd-fetch` check (run after the v0.5.0 tag, in a throwaway home, `/tmp/ghostsight-nvdlive`, vendor `openbsd`, product `openssh`): exit 0, `Stored 147 CVE records`, and a cache file of 1,309,560 bytes with mode 0600. The log shows the command started at 00:26:33 and stored at 00:26:41 local time, so it took under 9 seconds including the typing. The number of requests was not counted. `analyse` on the piece 9 scan against this live cache gave 33 findings (32 potential, 1 unknown listing 37 CVEs). Its output differed from the output with the saved-copy cache in one line only, the fetch-time text, because the piece 9 setup script and the downloader write different timestamp formats. Not covered: other products, products with many pages of results, the error paths against the real server, an API key and NVD's rate limit. One product with 147 records is a small sample.

Still only reasoned or unprobed: whether `num_predict` counts thinking tokens, prompt overflow, `/api/chat` instead of `/api/generate`, timeouts for long outputs, cold model load time (`explain` prints no timing), pydantic 2.0.0 support (tested on 2.14.3 only), and whether a normal boot picks kernel 7.0.0-43-generic.

## v0.6.0: what was run and what was only reasoned

Seen in terminal output:

- A real loopback scan with the audit hook (before the policy work): an allowed scan exited 0, a denied scan exited 1, `audit verify` printed `Records checked: 2`, the log mode was `-rw-------`, and a tampered log gave `Refused:` with exit 5 and no second scan folder.
- A real `ghostsight scan --target 127.0.0.0/21` in a throwaway home with a `127.0.0.0/16` scope: refused by policy (2048 addresses, limit 1024), exit 1, one audit record with `allowed` false and that reason, `audit verify` gave `Records checked: 1`. Nmap was not started.
- A broken policy file (`[policy` on one line) in the same home: `Policy file problem:` with the parser's message, exit 3, and `audit verify` still gave `Records checked: 1`, so nothing was recorded.
- A scope file holding the bytes `ff fe` crashed `scan` with `UnicodeDecodeError` before the fix. The probe covered that one kind of bad file.
- `grep` showed that `perform_scan` is called only from `_start_scan` in `main.py`, `_start_scan` is called once (inside `scan`, after the scope and policy checks), and `run_nmap` is called only from `perform_scan`.
- A real allowed scan after the policy wiring (throwaway home, scope `127.0.0.1`, Low-Noise): the scope check said ALLOWED, and the scan completed with 2 open services and wrote `scan_001`. The audit log held one record (`allowed` true, target `127.0.0.1`, reason `Inside allowed range 127.0.0.1/32. Within the policy limit of 1024 addresses.`, previous hash all zeros) with mode `-rw-------`, and `audit verify` gave `Records checked: 1` with exit 0. A second scan in the same home exited 0 and `audit verify` then gave `Records checked: 2` with exit 0. Not seen: the exit code of the first scan (the later output of the script did not reach the screen), and the second scan's output, which was discarded, so its `scan_002` folder and its record were not looked at.

Only reasoned, not run:

- (Run afterwards, see the last item under Seen in terminal output.) An allowed scan through the real Nmap path after the policy wiring. The wiring tests stub `_start_scan`, and the real runs above were refusals.
- The `nvd-fetch`, `analyse --save` and `explain --save` audit hooks, which are tested with stubs only.
- That someone who can rewrite the whole audit file could recompute the hashes and pass `audit verify` (the chain has no secret). Not tested.
- That the two `subprocess.run` calls in `system_check.py` use fixed arguments (the code was read, but not the callers that supply `version_args`).
- A policy path that is a folder is caught as `OSError` (not tested).

## v0.7.0: what was run and what was only reasoned

Seen in terminal output:

- A throwaway `msfrpcd` started with `-f -j -n -S -a 127.0.0.1 -p 55553 -U msf -P probe-pass-123` printed `JSON-RPC starting on 127.0.0.1:55553 (NO SSL)` and the URI `/api/v1/json-rpc`. Without `-n` it printed the same lines, then exited with code 0 and nothing was listening (cause unknown, not pursued). The throwaway password was acceptable only because the server was loopback-only on a single-user laptop.
- Read calls (`core.version`, `core.module_stats`, `module.search`, `job.list`, `session.list`) returned status 200 with no credentials or a wrong password. A `-n` server is therefore open to every local program (seen for those methods only; module-running calls were not tried on purpose). `POST /api/v1/auth/login` gave `303` and `POST /api/v1/auth/generate-token` gave `401` (cause unknown).
- The three queries ran through GhostSight's client against that server. Real searches: `smb` gave 241 matches (43,143 bytes) and `windows` gave 3259 matches (597,855 bytes, 57% of the 1 MiB cap).
- `msfrpcd -h` started the snap's database. It is still running (`postgres`, `127.0.0.1:5433`) and was left on purpose.
- Stopping the server: `kill` on the wrapper PID left an orphaned `ruby` child holding the port. `ss -ltnp` named the real owner, and `kill` on that PID freed it.
- Break controls, each followed by a restore from git after the work was committed: a public address listed in `[lab] allowed` was refused only because of the private-address rule (the control failed when that rule was removed). With the audit call in `_msf_start` commented out, 9 tests failed and 2 passed. With `NoRedirect` removed from the opener, 1 test failed (`DID NOT RAISE RpcError`) and 2 passed.
- A real `303` from a local HTTP server was refused by the client after one request.
- Python `ipaddress`: `127.0.0.1` in `127.0.0.0/8` is private, `8.8.8.8` is not, and `fd00::5` against an IPv4 range is refused as mixed versions. Other ranges such as `100.64.0.0/10` were not tested.
- `ghostsight msf --help` lists `version`, `stats` and `search`.

Not covered (reasoned, or never run):

- A real login. The probed server ignored credentials, so the password path has never been checked against a server that enforces it. A database-backed server, `module.info` and any module-running call were not tried.
- The `msf` commands against a real server. After they were written they ran with fakes only.
- That the proxy test fails against a client that uses proxies (not shown by a break).
- Results beyond the first 100, and replies near the 1 MiB cap.
- The audit-before-query order seen failing when swapped. The failing-log cases and the fakes that read the log at call time protect it (reasoned).
- The other lab-rule refusals (empty list, more than one address, outside the range, mixed versions) were not each proven by a break.
- The 1.6 s runtime of `tests/test_msf_rpc_http.py` (other files take hundredths). Guess: server start and stop. Not measured.

## v0.8.0: what was run and what was only reasoned

Seen in terminal output:

- Real scans of the lab laptop, the one machine in the scope file and the policy `[lab]` list (its address is kept out of this file). The first `scan` with the default low-noise profile reported no host up and 0 services (`scan_002`). The cause was not proven. The theory, not tested, is that the Windows firewall drops the host-discovery probes.
- One manual `nmap -sT -Pn -n -p 445 --reason` against the laptop showed port 445 open. It was typed by hand, so it bypassed the scope check and the audit log. It is recorded here as a probe.
- `scan --skip-discovery` against the laptop: the scope check allowed it, it took 112.91 s and found 3 open services (135 `msrpc`, 139 `netbios-ssn`, 445 `microsoft-ds`), saved as `scan_003`. The audit log then held 2 records and `audit verify` printed `Records checked: 2`.
- `analyse --scan scan_003` (preview) gave 0 findings. Ports 135 and 139 carry only the generic `cpe:/o:microsoft:windows` and port 445 has no version and no CPE, so each service printed that no application version was found, that no CVE lookup was done, and that this is not a clean result. Nothing was sent to NVD and no file changed.
- `validate --scan scan_003`, run twice: the scope check allowed it, `Findings : 0 of 0 can be checked`, exit 0, `git status` empty, and `audit verify` still printed `Records checked: 2`. An empty plan ends the command before Metasploit is contacted.
- Three throwaway probe scripts against a loopback `msfrpcd` (they bypassed the audit log). `module.search` for `cve:2017-0144` gave 3 matches. `module.info` for `auxiliary/scanner/smb/smb_ms17_010` showed `check: true`. One `module.check` of that module against `127.0.0.1` port 445 (nothing listening) returned a job id, so `module.check` is asynchronous, and `module.results` then gave code `unknown` with a message that exploitability cannot be reliably checked. A nonexistent module gave HTTP 200 with a JSON error (`-32000`, invalid module), and an unknown result id gave a JSON error with data code 404.
- Stopping the throwaway server: Ctrl+C on the wrapper left the `ruby` child listening (seen twice). `ss -ltnp` named the real owner and `kill` on that PID freed the port.
- Break controls, each followed by a restore from git after the work was committed (counts are failed and passed): the runner's rank-order and first-supported rule (2 and 12), the `validate-check` event name (1 and 1), the CLI lab gate (2 and 15), the audit record line in `_run_confirmed_checks` (3 and 15), the `if confirm:` gate (11 and 7), the control-character cleaning of validation notes (1 and 10), the RHOSTS-only check parameters (1 and 6 end to end, 1 and 113 in `test_msf_check.py`), the builder's range refusal for `skip_discovery` (1 and 8), the CLI's range refusal (1 and 5), the CLI dropping the flag before `_start_scan` (2 and 4), and the `-Pn` append in `nmap_runner.py` (4 and 8). The auxiliary-only filter, the method guard, the status filter, evidence appending, the status-rules guard, the re-analyse refusal and the lab gate were also broken on purpose, and their counts were not kept in this file. The `-Pn` break was run after the edit had already been applied by mistake (the `grep` pre-check printed 0 after the `sed` had run). It still served as a valid control.
- Demo rehearsal (`scripts/demo.sh`, committed as `c027034`), run once in a throwaway home with only 127.0.0.1 in scope. The folder held `scan_001`, a live NVD download (`cache/nvd/openbsd/openssh.json`) and an audit log, and `audit verify` there printed `Records checked: 4`, so the scan, the NVD download, the analysis save and the explain save all ran. The real home's log still held 2 records afterwards. The final report showed a 46.58 s scan, 2 services (OpenSSH 9.6p1 on port 22, CUPS 2.4 on port 631), 33 findings (32 potential, plus one row for 37 OpenSSH CVE records that could not be checked) and a note that CUPS was not checked because no CVE data was stored for it ("This is not a clean result"). The terminal output of the individual steps and the text of `ai_analysis.txt` were not read, so how the AI explanation looked is not recorded. The `validate` command is not part of the demo script.
- Predictions that were wrong in this version: the number of tests in `tests/test_status_metasploit.py` (4 predicted, 5 real), the line counts of the `scanner.py` and `main.py` edits, that the phone's address was the laptop, that Windows 11 would block port 445 (it was open), and the size of piece 8. The status-file edit above came out at 24 insertions where 25 was predicted.

Not covered (reasoned, or never run):

- No real `module.check` against the laptop or any vulnerable machine. Only the code `unknown` was seen for real. The codes `vulnerable`, `appears`, `detected`, `safe` and `unsupported` are from memory, and the whole path from `vulnerable` to a validated finding is tested only against a fake server (`tests/test_validate_end_to_end.py`, with reply shapes taken from the probes).
- `validate --confirm` has never run against a real Metasploit server through GhostSight, and the dry run's lookups have not run for real either, because the only real `validate` runs had an empty plan.
- `module.results` while a job is still running, and `module.running_stats` with a running job (its shape is from memory), were not seen. The polling numbers (5 polls, 2 s apart) are guesses, and the end-to-end tests do not cover polling.
- A real login, database mode, targets other than loopback in a probe, and modules other than `smb_ms17_010`.
- Unexplained: the laptop answered `ping` with ttl=64 (Windows normally uses 128, from memory); the laptop briefly showed a different address, and the scope and policy files were not edited, and scanning waited until the subnet and MAC were checked again; the effect of `-Pn` on `hosts_up` in the parser was never seen.
- Not yet shown by a break: the executor and scanner pass-through of `skip_discovery` (red runs seen, no break run); the target rule, module-name rule, polling and timeout, and code mapping in `metasploit_check`; the query rules, caps and rank order in `module_choice`; the refusals in `validation_apply` other than evidence; the skip notes, the per-finding `RpcError` and the single-address pre-check in `check_run`; in the dry run, the demonstration-scan refusal, the already-validated refusal, the early return and the audit-before-lookup order; the settings-before-audit order in `--confirm`; the nothing-saved branch; the new `validation.txt` explanation sentences; six of the seven end-to-end tests; the wording tests for the skipped-discovery note; the `status` purpose test (red run seen, no break run); and the guard test `test_a_similar_validation_event_is_still_refused`.

## Known bugs and issues

- (Fixed in v0.5.0, commit `7b0c0c0`: `status` now warns when no model is installed, and still checks only that some model exists. The text below is the earlier state.) `status` shows the Ollama server as OK when it runs but has no models installed. To be tightened in v0.5.0. The model `qwen3:4b` has since been pulled, so the gap is no longer visible on this machine, but the check is still only a text match.
- The `status` label for nmap still reads "Scanning (v0.2.0)" (`ghostsight/system_check.py` line 159, and the sample output in the README). It was left on purpose: it reads as "scanning arrived in v0.2.0", which is still true. It can be changed to plain "Scanning" if it confuses anyone.
- The Low-Noise profile checks only the 100 most common TCP ports, so it misses services elsewhere. On loopback it found 2 services; Deep found 5 (adds 1716, 9050, 11434). The report notes state the port coverage.
- Nmap reports port 11434 (Ollama) as `unknown`. GhostSight does not guess from banner text, so it stays `unknown`.
- Measured on loopback: Low-Noise took about 47 seconds, Deep took 4 minutes 20 seconds. Times on real networks will differ and have not been measured. The Normal profile has not been timed.
- The `report` command table still labels the folder name as `Scan ID`, while report files call the timestamp ID `Reference`. The `scan` command uses `Report folder`.
- The docstring of `_build_demo_scan` in `main.py` still says "until the scanner exists". It is out of date but harmless.
- (Fixed in v0.4.0: `analyse --save` stores findings and sets `analysis_performed`. A scan that was never saved with analysis still reads "Not analysed yet". The text below is the state before that.) Scan results have no vulnerability analysis yet, so `findings` is always empty for real scans and reports say "Not analysed yet".
- `Service.version` (the combined display text), `product` and `product_version` are three fields that can disagree if a `Service` is built by hand. Only the Nmap parser fills the two new ones, and the `Service` docstring says so. A derived property is a candidate for the v1.0.0 schema change. No report displays `product` or `product_version` yet.
- `product_version` keeps the Ubuntu suffix as received (for example `9.6p1 Ubuntu 3ubuntu13.18`). Probed on one package on this machine: Ubuntu patched CVE-2024-6387 without changing `9.6p1` (see the research section). For a remote target GhostSight sees only the banner, not the changelog, so judging backports there needs distributor fix data, which has not been probed. Until then, version-based findings can be at most "potential" and the report must say why.
- A CPE with no version, such as `cpe:/o:linux:linux_kernel` (Nmap attaches it to the SSH service because it inferred the operating system), is a name and not evidence. v0.4.0 must not treat it as a version match. Similarly (superseded by decision 43), an NVD rule with a bare `*` version matches every version and is not evidence about one.
- Text cleaning covers service fields, the report header and CPE names. These are still written as received: finding `title`, `evidence` items, report `notes`, `validation_notes` and `ai_analysis`. They hold GhostSight's own text today. In v0.4.0 and v0.5.0 they will quote banner text, CVE descriptions or model output, so cleaning them must be part of those milestones. The NVD reader also keeps CVE descriptions as received, so the code that writes them out must clean them.
- (Updated: it has also run on all 147 records of the OpenSSH response, 0 failed. The text below is the earlier state.) The NVD reader has been run on hand-built dictionaries and once on the real 32-record response for 9.6p1 (all counts matched). It has not been run on the other three responses, and those files are now lost. They hold older shapes (glued versions, a bound with letters). The reader keeps those strings as received, so it is not expected to fail, but that is untested.
- (Partly addressed: an out-of-sample check on 7.2p2 matched NVD's 53 of 53 with no extras. The policy still rests on OpenSSH and p1 or p2 targets only.) The version-matching findings are in-sample: the rules were chosen after the four NVD answers were seen, and the pool held only CVEs those answers returned. The policy for exact `-` rules and for ranges rests on one CVE each. The matcher tests were written before the modules but from the same probe notes, so they show less than tests written before the data.
- (Partly recovered: a 147-record response was fetched again into `~/ghostsight-probe/`, outside the repository. The four old files are still gone.) The probe scripts and the four saved NVD responses were lost when `/tmp` was cleared (see "Evidence lost" in the research section). Nothing in the repository can reproduce the 74-record comparison. Whether to fetch again is undecided, and no trimmed fixture exists.
- (Updated: the matcher has since run over a real 147-record response, see the real-data results section. The text below is the earlier state.) The matcher modules have met only hand-built data (unit tests, and two CVEs rebuilt by hand). They have not been run over any real NVD response.
- (Updated: 0 such nodes among 509 in the 147-record response. The cautious rule is still untested on real odd nodes.) Nodes that are negated, or have an operator other than OR, were never seen in real data (all 109 nodes in the 9.6p1 response were OR and not negated). The matcher answers "cannot tell" for them. That is a cautious guess and is untested against real data.
- (Measured on one pool: 28 to 37 of 147 records per target, see the real-data results section.) "Cannot tell" noise is unmeasured: a vulnerable rule whose name cannot be read (for example one containing a backslash) makes `match_cve` answer "cannot tell" for that CVE, even if the name belongs to an unrelated product. How often this happens on real data is unknown.
- The version is read from Nmap's CPE only, not from the display text (agreed, decision 38 a). `service_versions` does this and returns nothing for a service with no CPE or no readable version, which means cannot tell. `analysis.py` calls it since v0.4.0.
- `evidence.py` lists the matched rules and states the platform and backport caveats, which closes most of the old gap that the matcher did not say which rule matched. It still does not say which rule was unreadable when the answer is cannot tell. Its matched-rule and caveat lines now appear in saved reports (`vulnerabilities.txt`, checked on real data).
- (Updated: both now run inside `analyse` on real records, see the real-data results section.) Score choice and evidence have met only hand-built data, like the matcher. No real NVD response has gone through `choose_scores` or `build_evidence`.
- `evidence.py` imports the underscore name `_is_odd` from `cve_match.py`. Making it public would be a separate commit and is undecided.
- A no-match answer carries no caveat (pinned by a test). It says only that no NVD rule matched the version, and a reader could take it as safe. Whether it should carry a caveat is undecided.
- (Partly checked: a real 1,246,864-byte, 147-record response was cached and read back in the real-data check. The 256 MiB limit is still a guess.) Cache: `MAX_CACHE_BYTES` (256 MiB) is a guess, not a measured value. The cache has been tested only with hand-built data in a temporary home, never with a real NVD download. A damaged or oversize file reads as `None` with no log line, so the caller cannot tell why.
- Without `GHOSTSIGHT_HOME`, the cache folder sits inside the project folder. It is git-ignored by the rule `/cache/` (checked with `git check-ignore`).
- The NVD reader drops a malformed score or rule silently. It keeps no count and writes no log line, so a feed with many bad entries would look the same as a clean one. Whether to count or log drops is undecided (reasoned, not tested).
- The reader checks a base score only against the range 0 to 10. It does not check that the score agrees with the severity text or the vector string, which are kept as received. A CVSS score is one scorer's reading, not the risk to a particular host.
- Terminal escape characters: a probe with `&#27;` in a banner showed the parser refuses it ("reference to invalid character number"), because XML 1.0 forbids that character. A hostile banner can therefore make a scan fail, which is fail-closed. This was tested with hand-built XML, not with real Nmap output. The formatters do not remove escape characters, so hand-built `Service` data and text from future sources (AI, CVE feed) are not covered.
- `test_missing_version_is_marked_not_detected` in `tests/test_reporting.py` passes for the wrong reason: `extra_info` is also empty there, so "Not detected" appears anyway. The CPE-less case is covered separately in `tests/test_services_report.py`.
- The development machine's OpenSSH is `1:9.6p1-3ubuntu13.18` while the package list shows `13.20` as available. The real-run evidence in this file names 13.18. If the package is upgraded, that evidence changes and this file must say so.
- Masscan 1.3.2 (Ubuntu `universe` package, built February 2021) is installed at `/usr/bin/masscan` but GhostSight does not use it. It has no file capability set (`getcap` prints nothing). Its default rate is 100 packets per second, from `masscan --echo`.
- An unprivileged probe, `masscan 127.0.0.1 -p22 --rate 100`, failed with "permission denied" while initialising the adapter `wlp2s0`, which is the Wi-Fi card and not the loopback interface `lo`. No packets were sent. Whether Masscan can scan loopback even with the capability is unverified. The concern, from memory and not verified, is that it uses its own network stack and would send frames out of the Wi-Fi interface. Nothing was granted to test this, and `ip route get 127.0.0.1` was not run.
- If Masscan returns, `status` will need to check whether the capability is set. Today it only checks that `masscan --version` runs.
- Bounds are not shown. A bounded-range evidence line reads `Matched rule: cpe:2.3:a:openbsd:openssh:*:*:*:*:*:*:*:* (bounded range)`. The limits (`version_start_including` and the like) are separate fields that `RuleEvidence` (criteria and basis only) does not carry, so a reader cannot see which range the version fell into. Confirmed in a real saved report. A fix touches `evidence.py`, `analysis.py` and their tests. Planned after the v0.4.0 tag unless decided otherwise.
- File permissions: `scan_data.json` is owner-only (0600), but the six report files are 0664 under umask 002 and hold the same information as readable copies. Whether they should be owner-only is undecided.
- `analyse --save` replaces all earlier findings (no merge). It rewrites `scan_data.json` through the strict reader, so unknown extra keys in a hand-edited file are dropped. A scan note that starts with `Vulnerability analysis: ` is treated as an analysis note and dropped on the next save.
- Cannot-tell CVEs stay cannot tell: glued versions, letter bounds, the five `openssh:-` rules and the unreadable name (listed in the real-data results). For 9.6p1 NVD lists none of them, but that was checked for 9.6p1 only, and no policy is chosen for them.
- Only application CPEs (part `a`) are matched. Operating-system CPEs are not used, and the analysis says so in a note.
- A match is only a version match. All 32 matches for 9.6p1 carry the platform and backport caveats, and GhostSight cannot tell whether a given host has the distributor's fix.
- `analysis.py` has `_plain` and `main.py` has `_printable`, two copies of nearly the same text-cleaning helper. Merging them into one public function would be a separate commit and is undecided.
- The real `nvd-fetch` path has run against NVD once (openbsd:openssh, 147 records, see the v0.5.0 research section). Other products, products with many pages, the error paths against the real server and an API key were not tried. Its page size, pacing and size limits are still guesses.
- Ollama uses the GPU only when the machine boots `7.0.0-43-generic`. On `6.17.0-1030-oem` the loaded NVIDIA module is 595.84 while the libraries are 595.99.02, `nvidia-smi` fails with a version mismatch and Ollama runs on the CPU (about 21 tokens/s instead of about 35). GRUB settings: `GRUB_DEFAULT=0`, `GRUB_TIMEOUT_STYLE=hidden`, `GRUB_TIMEOUT=-1`. Menu entries in `grub.cfg`: `Ubuntu` (first), `Advanced options for Ubuntu` (submenu), two memtest entries and `Windows Boot Manager (on /dev/nvme0n1p1)`. Which kernel the first entry boots was not read, and whether the next normal boot returns to the oem kernel has not been checked. No system change has been made.
- GPU throughput (about 35 tokens/s) was lower than the 60 to 150 tokens/s that was guessed. One clock sample during a request showed 690 to 1005 MHz of a 3090 MHz maximum at 98 to 99 % utilisation and 39 to 49 W against a 45 W cap, which is consistent with a power limit. This is not proven, and temperature was not sampled.
- The AI text from the 4B model can state wrong counts, blur findings shown with findings found, leave out the unchecked records, and call an unchecked service clean. No schema catches this. The text is labelled as AI-generated and not proof. The facts block (`980fc65`) shows the counts from code above it, which reduces the harm and does not remove it. The facts block cannot say which service was unchecked, because the scan data stores no per-service flag.
- `explain` was tried on one scan (OpenSSH and CUPS on loopback) in repeated runs. Other scans and other products have not been tried. The prompt limits (12 services, 8 findings, 3 CVE IDs per finding, 4 notes, 7700 characters) and the reply limits are guesses.
- The model name `qwen3:4b` is fixed in code (`AI_MODEL` in `main.py`), and `status` checks only that some model is installed. Decision 7 (a configuration setting) is not done yet.
- `explain` prints no timing. The cold model-load time and the 300-second timeout were not measured on a long output. What Ollama does when prompt and reply exceed the context was not probed (the context was raised to avoid it).
- `explain --save` stores only the AI text. The facts block is preview-only on purpose, so a saved `ai_analysis.txt` holds no counts from code.
- Duplicated helpers: `_plain` in `analysis.py` and `ai_prompt.py`, `_printable` in `main.py`, `_model_name` in `ai_text.py`, and `_status_totals` in both `ai_prompt.py` and `scan_facts.py`. Merging them is undecided.
- (Fixed in `bd8fd06`.) A saved scan kept the scanner's note "No vulnerability analysis has been done yet" after analysis was saved, which contradicted the findings and misled the model.
- Audit log limits (decision 57). It is tamper-evident, not tamper-proof. Removing the last record is not noticed. Someone who can rewrite the whole file could recompute the hashes, because the chain has no secret (reasoned, not tested). There is no file locking, so two commands running at once could both read the same last record and break the chain on the next check (reasoned, not tested). The whole file is read again before each append, which will slow down on a very large log (not measured). A record says an action was approved, not that it finished.
- The audit hooks for `nvd-fetch`, `analyse --save` and `explain --save` are tested with stubs, and the CLI audit tests call `_save_analysis` and `_save_ai_text` directly. Only the `scan` hook has run in a real command (loopback, before the policy work, and again after it). Refused saves, declined downloads and unsafe product names are not recorded, by design.
- (Checked before the v0.6.0 tag, see the v0.6.0 section: one allowed loopback scan ran through the real Nmap path and was recorded. The text below is the earlier state.) No allowed scan has gone through the real Nmap path since the policy wiring. The wiring tests stub `_start_scan`, and the real runs after it were refusals. A loopback run is planned before the v0.6.0 tag, and this entry will be updated with its result.
- The policy engine enforces only the address limit, and only `scan` consults it. `[lab] allowed` is parsed and not used until v0.7.0. `nvd-fetch`, `analyse` and `explain` have no policy check, because they download public CVE data or read local files.
- A broken scope or policy file stops `scan` with exit 3 before anything is logged, so that attempt leaves no audit record. A policy path that is a folder should be caught as `OSError`, but this was not tested.

### Added in v0.7.0

- The `status` sample in the README shows the GPU row as `OK`, but the real `status` on the development machine shows `NVIDIA GPU WARN nvidia-smi reported an error` (a known GPU and kernel issue, the kernel was not checked). The footer line `1 optional item(s) are not ready` comes from the GPU, not from Metasploit. The sample was left as it is on purpose.
- `msfrpcd -h` starts the snap's database. It is still running on `127.0.0.1:5433` and was left on purpose.
- The Metasploit snap (`metasploit-framework` v6.4.126-dev, revision 2435, channel `latest/stable`, publisher `jitpatro`) has an unresolved trust question. Decide before v0.8.0.
- SSH (port 22) listens on `0.0.0.0` and `[::]`. Noticed during the port checks and unrelated to GhostSight. Nothing was changed.
- A bad `msf search` query still leaves an `approved` audit record, because the query is checked after the log write.
- (Supersedes the statements above that `[lab] allowed` is unused until v0.7.0.) The lab-target rule `evaluate_lab_target` exists and is tested, but no command calls it until v0.8.0.
- Metasploit client limits: tested against a fake network, a real local HTTP server (redirect refusal) and one real `msfrpcd` session. Real login, database mode, `module.info` and module-running calls are untested. The `msf` commands were never run against a real server. A `-n` server is open to every local program. Only the first 100 search results are checked and a reply over 1 MiB is refused.
- The lab questions (Windows version, how the laptops connect, virtual machine or daily install, backup) are still open and matter at v0.8.0.

### Added in v0.8.0

- (Supersedes older entries.) `validate` is no longer a stub. `evaluate_lab_target` is now called by `validate` (decision 64). The Metasploit snap trust question was answered by the user, who chose to trust the snap, and no further check was made. The lab questions were answered (a Windows 11 laptop on a phone hotspot, decision 37, restore point `before-ghostsight-test`). Entries above that say otherwise describe the state at v0.7.0.
- Against the real lab laptop `analyse` finds 0 findings, because Windows gives no application version, so no real `module.check` has run. A real full report needs a scan of `127.0.0.1`, `nvd-fetch` (internet), `analyse --save` and `explain --save`.
- The remediation text in reports is one fixed sentence per finding type (`_POTENTIAL_REMEDIATION` in `analysis.py`). It is not AI advice. AI-written suggested fixes are not built and are a candidate for v1.0.0.
- The empty-plan message of `validate` (`No finding can be checked: each one is already decided or has no CVE id to look up.`) is slightly off for a scan with zero findings. An empty-plan `validate` writes no audit record.
- In `--confirm`, findings that were skipped (no candidate module, or none with a check) are shown on screen only and are not saved.
- The dry run's `msf-query` audit record names only `module.search, module.info`. The single `validate-check` record of `--confirm` also covers its lookups.
- The check sets only `RHOSTS`, so a module checks its own default port. Only the first supported module is run per finding. Only the first 100 search results are looked at.
- Only validation notes are stripped of control characters. Other report text in `formatters.py` (such as `\x1b`) is not, and no fix across all report text was made.
- `_save_ai_text` calls `apply_ai_text` (in `ai_apply.py`, not read for this version), which has no refusal for a scan that has validation notes.
- The default nmap profiles can report no host up on a firewalled Windows host. The workaround is `--skip-discovery`, for one address only. It does not hide the scan, and it is not the default for any profile.
- `--confirm` has end-to-end tests only against a fake server, and the fake does not cover polling. `tests/test_msf_rpc_http.py` still has the slow 0.5 s `shutdown` in its fixture.
- The README `status` sample still shows the GPU row as `OK`, while the real row is `WARN` (recorded before, left as it is).
- In the demo report, "Recommended next steps" printed the same fixed sentence 10 times for 33 findings. It is one sentence per finding, shown repeatedly. Why it stops at 10 was not read in the code. It is a display problem, not a wrong claim.
- In the demo report, the row for the unchecked OpenSSH records reads `[Not detected] port 22/tcp: 37 CVE records could not be checked (Unknown, confidence not rated)`. Showing "Not detected" for an unknown severity is confusing wording. The code that produces it was not read.
- The demo report names the OpenSSH package `1:9.6p1-3ubuntu13.20`, while the real-run evidence in this file names `13.18`. The package was probably upgraded since then (inferred from the report only, `dpkg` was not checked), so the older evidence describes the earlier build.
- `scripts/demo.sh` was run once end to end. Step 2 needs internet, and a hotspot without internet would stop it with exit 4. It writes only to a throwaway home under `/tmp`.

## Pending decisions

- (Resolved: option A, see decision 42.) Data source for the CVE cache (decision 36 defers it to the downloader step). Options: A, fetch per product (tells NVD which software is checked); B, mirror the whole database once, started by the user (nothing about targets leaves the machine; the recommended lean, but the size is unmeasured and the plan is to download and measure a small slice first); C, CVE List V5 (unprobed, and from memory it lacks version ranges). If B proves impractical, A is the fallback, with a clear warning that it sends product names to NVD.
- Whether the reader should count or log what it drops (see known issues).
- (Done: see the real-data results section.) Whether to fetch the 4.4p1 NVD answer again: one generic query that sends only the OpenSSH CPE string (NVD sees the IP address), saved in `~/ghostsight-probe/`. The CVE count may differ from the earlier 67. It would allow the 74-record ground-truth test and show what the 5 backslash names are. Not yet answered; the working assumption is no re-fetch, and it is easy to reverse.
- Whether to commit a trimmed NVD fixture (IDs and match rules only) so a ground-truth test can run from the repository. NVD's terms of use must be read first and the size measured. This also needs a fresh fetch.
- Whether to make `_is_odd` public in `cve_match.py` (a separate commit).
- Whether a no-match answer should carry a caveat (today none, pinned by a test).
- Masscan: revisit after the policy engine exists. The user now has a second machine (see decision 37). If Masscan is added, the preferred plan is `setcap cap_net_raw+ep` on a private root-owned copy such as `/usr/local/bin/ghostsight-masscan` (mode 0750), not on `/usr/bin/masscan`. A copy does not receive package security updates, and that trade-off is not yet decided.
- (Answered for v0.8.0: the lab target is the owner's Windows 11 laptop on a phone hotspot, with the restore point `before-ghostsight-test`. See decision 37 and the v0.8.0 run section. The text below is the earlier state.) Lab setup, now for v0.7.0 and v0.8.0 (decision 37, renumbered by decision 56). Still to ask at v0.7.0 planning: the Windows version, how the two laptops will be connected, whether to use a virtual machine instead of the daily-use install, and what backup or restore point exists. Public test sites are still suitable only for scanning (the user reads each site's terms, Low-Noise, few scans, resolve the IP each time), never for Metasploit.
- (Done: `ollama list` shows `qwen3:4b`, digest 359d7dd4bcda.) Confirm the exact Qwen model name with `ollama list` (v0.5.0).
- (Done in `717bebd`.) Declare `pydantic` explicitly in `pyproject.toml` when v0.5.0 uses it (today it only arrives through Typer).
- Decide when to make the GitHub repository public (README and LICENSE exist). It is currently private.
- (Done in v0.6.0, `b1389d7`, decision 58: the limit is a policy setting and the old constant is a backstop. The text below is the earlier state.) Replace the placeholder 1024-address limit with the policy engine's rules. This belongs to the audit log and policy engine milestone (decision 35), whose version number and design are not yet decided.
- Whether to fix the bounds display (see known issues) before the v0.4.0 tag or after it. The recommendation is after.
- Whether the six report files other than `scan_data.json` should get owner-only permissions.
- Whether to merge the duplicated `_plain` and `_printable` helpers into one public function (a separate commit).
- Policy for the five `openssh:-` rules, glued versions and letter bounds. Today they stay cannot tell.
- The definition of "stable" for v1.0.0 (proposed, not agreed): every pipeline stage works end to end on a lab target; the policy engine and audit log are in place and tested; no stub commands remain; README, status file and `--help` match real behaviour; SQLite storage exists with a documented upgrade path from the JSON files; the owner decides whether to make the repository public.
- (Done in v0.6.0, `773bfae` and `9ae5c91`, decisions 57 and 59. The text below is the earlier state.) Add an audit log for scans. This belongs to the same milestone (decision 35).
- Whether to make the model name a configuration setting, and whether `status` should then check the exact model (decision 7).
- Whether the prompt and reply limits (all guesses) need a measured basis from more scans than one.
- Whether to make the GPU fix persistent (choose the default kernel in GRUB). No change was made. For the owner to decide.
- Whether `explain --save` should also store the facts block (not done, on purpose).
- Whether to merge the duplicated helpers, now including `_status_totals` (a separate commit).
- (Still open: v0.8.0 now relies on the log, and it has no locking and no keyed hash. A candidate for v1.0.0. The text below is the earlier state.) Whether to harden the audit log with file locking and a keyed hash (HMAC), so that two commands at once and a rewritten file are caught. Today neither is. To decide before v0.8.0 relies on the log.
- Whether the audit log should notice that the last record was removed (for example by printing the last hash in `audit verify` for the owner to keep), and whether it should record that an action finished and not only that it was approved.
- (Resolved in v0.8.0: decisions 64, 67 and 69. The text below is the earlier state.) How `[lab] allowed` is enforced from v0.7.0, and which Metasploit calls need a policy decision and an audit record. To decide at v0.7.0 planning.
- AI-written suggested fixes. Not built: the `remediation` text in reports is one fixed sentence per finding type. A candidate for v1.0.0, to be designed on its own (the AI must stay a recommender, and its text must be labelled).
- Web application scanning with OWASP ZAP, and domain names in `scan`. The owner chose to keep v0.8.0 as designed. ZAP is proposed as a milestone after v1.0.0 and needs its own permission design. Hostnames are still refused by the scope manager.

Resolved: the data source for the CVE cache is option A, an explicit user command (decision 42).

Resolved: the `analyse` command exists and `analyse --save` stores findings (decision 46).

Resolved: the bare-wildcard and range-update policies were changed after real data (decisions 43 and 44).

Resolved: the scope manager is now the only source of `authorised` in the scan path. `scan` sets it from the scope decision and no flag can override it. The `report` demo command still hard-codes `False`.

Resolved: Masscan is deferred, not added (decision 29).

Resolved: the CPE field exists (decisions 31, 32).

Resolved: the product/version split exists, as additive fields (decision 34).

Resolved: the evidence step is built. The score choice (decision 36 b) and the CPE-only version source (decision 38 a) were accepted as the defaults offered. The cache format, one JSON file per vendor and product (decision 40), was taken by default and not discussed in detail; only tests use it so far, and SQLite at v1.0.0 remains the upgrade path.

Resolved: nothing more was added to v0.3.0. It was released as it stood (decision 35).

## Tests passed

1119 pytest tests at the last full run of the v0.6.0 work (the README commits after it change no test; see New since 1033 at the end of this section). Older figure: 1033 pytest tests (suite total at commit `980fc65`; the README commit after it changes no test). The list below was written when the total was 810 (commit `8089ecc`). The list below was written at 511 tests, and the files added since are named in the paragraph "New since 511". Test files at 511: authorisation, CLI (`status`, `scope`, `scan`), logging, reporting, report honesty, services report, report injection, service product, system check, version, scope manager, scope normalisation, Nmap command builder, Nmap parser, Nmap executor, scanner, NVD reader, NVD reader scores, NVD reader huge scores, CPE version, CPE criteria, version compare, rule match, CVE match, probe cases, score choice, evidence, NVD cache, service target. Nmap is never started by the tests; the process boundary is faked. Run with `pytest -q` inside the virtual environment.

New since v0.2.0: 18 parser tests for CPE (valid, malformed, overlong, duplicate, capped, empty), 6 tests for CPE lines in `services.txt`, 28 tests for report injection (7 line-break characters, 6 service fields, 2 header fields, 3 reports, 1 guard test for ordinary text), and 9 tests for the product/version split (separate storage, unchanged combined text, product only, version only, no service element, a service element with neither attribute, hostile text kept verbatim, the two keys in `to_dict()`, hand-built defaults). The injection tests were run before the fix and 22 failed. The product tests were run before the fix and 8 of 9 failed (the ninth checks that the combined text is unchanged, so it was expected to pass). That shows they test the real behaviour.

New since v0.3.0: 56 tests for the NVD reader, in three files. `tests/test_nvd_reader.py` has 39 (basic fields, immutability, 8 bad IDs, 4 non-dict inputs, descriptions, V3.1 and V2 score fields, every score kept, newest first, malformed scores, the four range bounds, `AND` configurations, negate, a missing `vulnerable` flag, dropped rules, missing configurations). That file was committed with the suite green at 274; no red run of it is recorded here. `tests/test_nvd_reader_scores.py` has 15 (8 bad scores: `nan`, `inf`, `-inf`, `True`, `False`, 10.1, 999, -0.1; one mixed case where only the valid score survives; 5 accepted values: 0, 0.0, 10, 10.0, 4.3; and one JSON `NaN` case). `tests/test_nvd_reader_huge_scores.py` has 2 (`10**400` and `-(10**400)`).

New since v0.3.0, continued: 146 tests for the matcher chain. By module: `cpe_version` 27, `cpe_criteria` 23, `version_compare` 36, `rule_match` 37 (12 exact, 14 range, 11 others), `cve_match` 15, and 8 in `tests/test_probe_cases.py` (CVE-2024-6387 and CVE-2025-26466 rebuilt by hand and checked against 4.4p1, 7.4p1, 9.6p1 and 9.8p1). The first five were run before their modules existed and each stopped at collection with `ModuleNotFoundError`, which shows only that they were written first, not that they test behaviour. `test_probe_cases.py` is a characterisation test: it passed the first time, so it has no red phase. Suite total: 291 + 146 = 437.

New since v0.3.0, continued: 74 tests for the steps after the matcher. By module: `score_choice` 17 (16 functions, one parametrised into 2), `evidence` 20 (17 functions, one parametrised into 4), `nvd_cache` 29 (13 functions, one parametrised into 11 and one into 7), `service_target` 8. The score choice, cache and service target tests were run before their modules existed. The score choice and service target runs stopped with `ModuleNotFoundError`, and the cache run stopped with `ImportError: cannot import name 'nvd_cache'`. No red run of the evidence tests is recorded here. The cache and service target modules passed all their tests on the first run after being written. Suite total: 437 + 74 = 511.

New since 511 (suite 511 to 810). The figures are the growth of the suite at each commit: wildcard fix +13 net (524), range-update policy +12 (536), `nvd_download` 33 (569), `nvd_http` 26 (595), `nvd_update` 14 (609), `nvd-fetch` command 13 (622), scan reader 70 (692), confidence display 10 (702), analysis 28 (730), scan finder 22 (752), `analyse` command 14 (766), `services_checked` 8 (774), `analysis_apply` 16 (790), atomic `write_scan_data` 8 (798), `analyse --save` 12 (810). Files added: `test_any_version`, `test_range_update`, `test_nvd_download`, `test_nvd_http`, `test_nvd_update`, `test_cli_nvd_fetch`, `test_scan_reader`, `test_confidence_display`, `test_analysis`, `test_analysis_checked`, `test_scan_finder`, `test_cli_analyse`, `test_analysis_apply`, `test_scan_data_atomic`, `test_cli_analyse_save`.

Red runs recorded for this stretch: `test_scan_data_atomic.py` gave 2 failed and 6 passed (the 6 are characterisation tests of behaviour that already held). `test_cli_analyse_save.py` first gave 11 failed and 1 passed. The pass was vacuous (a test that failed identically twice and so compared equal), a line was added that checks the saved file really is analysed, and the next run gave 12 failed. Red runs for the other files in this stretch were not recorded in this file.

Real-data checks (offline, throwaway home, one OpenSSH record set): see the research section "real-data results". The tests with fakes prove the wiring. The real-data runs are the only evidence about behaviour on NVD's actual data, and they cover OpenSSH only.

Red then green for the score-range rule: the 15 score tests were run before the fix and 10 failed, 5 passed. They showed `nan`, `inf` and `-inf` stored as they were, `true` read as 1.0 and `false` as 0.0, and 10.1, 999 and -0.1 stored. A JSON `NaN` through `json.loads` was stored as `base_score=nan`, so Python's `json` accepts a bare `NaN`. The 2 huge-integer tests were run before the fix and both failed with `OverflowError: int too large to convert to float` at the `float()` call in `_read_score`. The same crash was reproduced by hand with a one-line probe. After the fix: 17 passed in the two score files and 291 passed in the whole suite, and the same probe printed `()`. The fix diff was 12 insertions and 1 deletion, and it contained only the two constants, the helper and the one changed condition.

The version guard test failed on purpose after each version bump (0.2.0, then 0.3.0) and passed again after `pip install -e .`, which confirms the test works. For the 0.3.0 bump the run before the reinstall was 1 failed and 234 passed, and after it 235 passed.

Real-run checks done by hand, on loopback only, in a throwaway `GHOSTSIGHT_HOME`: Low-Noise and Deep scans, an out-of-scope target, an invalid profile, and Nmap missing from `PATH`. Also checked: real Nmap output for ports 22 and 631 on loopback gives the expected CPE lists through the parser and into `services.txt`. Also checked: the same real output gives `product` and `product_version` as `OpenSSH` and `9.6p1 Ubuntu 3ubuntu13.18` for port 22, and `CUPS` and `2.4` for port 631, with the combined `version` text identical to before.

(Superseded in part: the repository matcher has since been run over a real 147-record response, see the research section "real-data results".) Probed since v0.3.0 (read-only, no repository code): NVD response shapes, score sources, match-rule shapes, the Ubuntu changelog for CVE-2024-6387, the real 9.6p1 response through the reader, and four NVD answers (4.4p1, 7.4p1, 9.6p1, 9.8p1) against a throwaway prototype in `/tmp`. That data and those scripts are now lost (see the research section). The matcher in the repository was never run against the four answers; only two CVEs, rebuilt by hand, are tested.

(Partly superseded: the matcher agreed with NVD's own answers for 9.6p1, 4.4p1 and 7.2p2 over 147 records, see "real-data results".) Still only reasoned: how a matcher should treat other products and other version formats, whether the reader copes with the older shapes in the 4.4p1 and 7.4p1 responses, how often "cannot tell" occurs on real data, how nodes with negation or an operator other than OR behave, how to judge backports on a remote host, and whether the matcher in the repository agrees with NVD's four answers (the planned ground-truth test, blocked by the lost data).

New since 810 (v0.5.0, suite 810 to 1033). The figures are the growth of the suite at each commit: reply schema 70 (880), Ollama client 52 and proxy handling 3 (935), prompt builder 21 (956), AI text 12 (968), AI apply 12 (980), empty AI section 3 (983), `explain` command 17 (1000), clearing AI text on save 3 (1003), `status` model check 4 (1007), totals-and-notes change 9 (1016), note cleanup 5 (1021), context budget 1 (1022), scan facts 9 (1031), `explain` facts 2 (1033). Files named in this stretch: `test_ollama_proxy`, `test_status_ollama_models`, `test_cli_explain`, `test_analysis_clears_ai`, `test_note_cleanup`, `test_context_budget`, `test_scan_facts`, `test_cli_explain_facts`. The `explain` tests fake the AI, so the real model is covered only by the manual runs in the research section.

Red runs recorded for this stretch: `test_note_cleanup.py` gave 3 failed and 2 passed, and the failures were for the intended reasons. The context test failed on its arithmetic (5133.33 + 1500 is over 4096) before `NUM_CTX` changed. `test_scan_facts.py` stopped at collection with `ModuleNotFoundError`. The facts test for the command gave 1 failed and 1 passed (a control). Red runs for the other new files in this stretch were not recorded in this file.

New since 1033 (v0.6.0, suite 1033 to 1119). The figures are the growth of the suite at each commit: audit log 18 (1051), `audit verify` 12 (1063), audit hooks 15 (1078), policy loader 23 cases (1101), policy evaluation 6, wiring 7 and refusal wording 1 (1115), scope file encoding 3 (1118), `scan --help` 1 (1119). Files added: `test_audit_log`, `test_cli_audit`, `test_audit_hooks`, `test_policy`, `test_policy_evaluation`, `test_policy_wiring`, `test_policy_message`, `test_scope_encoding`, `test_scan_help`. One existing test was changed (`test_range_over_the_size_limit_is_rejected`, `192.168.0.0/21` to `10.0.0.0/8`).

Red runs seen for this stretch: `test_cli_audit.py` stopped with `ImportError: cannot import name 'default_audit_path'`. `test_audit_hooks.py` gave 10 failed and 5 passed (one failure was a test-helper artefact, `IsADirectoryError`, in the red run only). `test_policy.py` stopped with `ModuleNotFoundError`. `test_policy_evaluation.py` stopped with `ImportError: cannot import name 'PolicyDecision'`. `test_policy_wiring.py` gave 5 failed and 2 passed, each failure for the intended reason. `test_policy_message.py` gave 1 failed (`assert 2 == 1`). `test_scope_encoding.py` gave 2 failed and 1 passed (the control), with a raw `UnicodeDecodeError` and exit 1 instead of 3. No red run is recorded for `test_audit_log.py`. The red run of `test_scan_help.py` was not seen (the old help text held neither word, which is reasoning, not a result).

One test file, `tests/test_policy.py`, was committed empty by mistake (the stat showed `| 0`) and was recovered by re-creating it and amending. Since then every staged file is checked in `git diff --cached --stat` before a commit.

New since 1119 (v0.7.0, suite 1119 to 1231). The figures are the growth of the suite at each commit: `status` Metasploit row 5 (1124), RPC client 40 cases (1164), queries 34 (1198), real reply shapes 7 (1205), lab rule 10 cases (1215), audit event 2 (1217), `msf` commands 11 cases (1228), real local HTTP server 3 (1231). Files added: `test_status_metasploit`, `test_msf_rpc_client`, `test_msf_queries`, `test_msf_real_shapes`, `test_policy_lab`, `test_audit_msf_event`, `test_msf_commands`, `test_msf_rpc_http`. The `msf` command tests use fakes. The HTTP test uses a real local server on `127.0.0.1`.

Red runs seen for this stretch are the break controls listed in the v0.7.0 run-vs-reasoned section (lab rule, audit call, redirect). Red runs for the other new files were not recorded in this file.

New since 1231 (v0.8.0, suite 1231 to 1548). The figures are the growth of the suite at each commit: status rules 28 (1259), re-analyse guard 3 (1262), lab gate 10 (1272), module choice 23 (1295), check client 114 (1409), check plan 14 (1423), validation apply 26 (1449), check run 14 (1463), audit event 2 (1465), `validate` dry run 17 (1482), `validate --confirm` 18 (1500), `validation.txt` 11 (1511), end-to-end 7 (1518), `skip_discovery` in the builder 9 (1527), the executor 3 (1530), the scanner 9 (1539), the `scan` command 6 (1545), `status` purpose text 3 (1548). Files added: `test_validation_status`, `test_analysis_keeps_validation`, `test_lab_gate`, `test_module_choice`, `test_msf_check`, `test_check_plan`, `test_validation_apply`, `test_check_run`, `test_audit_validate_event`, `test_cli_validate`, `test_cli_validate_confirm`, `test_validation_report`, `test_validate_end_to_end`, `test_nmap_skip_discovery`, `test_nmap_executor_skip_discovery`, `test_scanner_skip_discovery`, `test_cli_scan_skip_discovery`, `test_status_metasploit_purpose`.

Red runs seen for this stretch: the executor and scanner pass-through tests failed before their code was written, and `test_status_metasploit_purpose.py` gave 3 failed before the fix. The break controls are listed in the v0.8.0 run-versus-reasoned section. Red runs for the other new files were not recorded in this file. The full suite took about 3.6 s at the last run.

## Architectural decisions

1. Python 3.12, Typer for the CLI, Rich for terminal formatting.
2. All code lives inside a single `ghostsight/` package to avoid import-name collisions.
3. Reports are TXT, with structured JSON preserved internally so reports can be regenerated.
4. AI recommends and a deterministic policy engine decides. AI never executes shell commands directly.
5. Low-Noise is the default scan profile. It reduces network load and is not for evading detection.
6. Only explicitly allowlisted targets can be scanned. Metasploit validation is limited to authorised lab targets.
7. The Ollama model name will be a configuration setting.
8. Nmap scans default to the unprivileged TCP connect scan so GhostSight does not need root for normal use.
9. Only `main.py` imports Typer. Other modules are plain Python.
10. Logs go to a rotating file (`logs/ghostsight.log`), not the terminal. `GHOSTSIGHT_HOME` relocates all working files. Tests always use a temporary home.
11. The reporting layer is split into `models.py` (data), `formatters.py` (layout) and `generator.py` (file writing). Other formats can reuse the same model.
12. Scan directories are numbered and never overwritten. `scan_data.json` is the source of truth; TXT files are rendered from it.
13. `FindingStatus` encodes potential, likely, validated, false positive and unknown so every module uses the same vocabulary.
14. Reports state only what the data supports. Authorisation is shown as "Not confirmed" unless recorded, and demo data is never marked authorised.
15. The version number lives only in `ghostsight/__init__.py`. `pyproject.toml` reads it with `dynamic = ["version"]`.
16. The project is MIT licensed. The license does not grant permission to test anyone's systems, and the README says so.
17. `status` exits with code 1 only when a required check fails. A missing optional tool is reported but is not an error.
18. The scope file is deny-by-default TOML with IP addresses and CIDR ranges only. Hostnames are rejected because DNS can change between the check and the scan. A missing file denies everything, and a broken file stops the command (exit 3) instead of becoming "allowed".
19. The scope decision is a frozen object that carries the normalised target. Scan code receives the decision, and `authorised` is set from `decision.allowed` and nothing else. There is no `--force` or `--authorised` flag.
20. Exit codes: `scope` gives 0 allowed, 1 denied, 3 broken scope file. `scan` gives 1 refused, 2 usage error (Typer), 3 broken scope file, 4 scan failed or reports not written.
21. The Nmap command builder, parser and executor are separate modules. The executor is the only place a process is started. It uses list arguments, no shell, no stdin, a timeout, and puts the target after `--`.
22. Nmap profiles use `-sT -sV -n --open` with no NSE scripts, `-A`, `-O` or evasion options. Each profile's hard timeout is longer than its `--host-timeout`, so Nmap's own limit fires first.
23. A temporary 1024-address limit guards the target size until the policy engine exists.
24. Nmap output is untrusted data. The parser caps input at 10 MB, refuses XML entities, fails closed on bad input, records whether Nmap finished cleanly, and never infers a service from banner text.
25. A failed scan writes no report. An incomplete scan is reported with a visible warning.
26. Reports distinguish "not analysed" from "nothing found" using `analysis_performed`, which stays `False` until an analysis step runs. Report notes state which ports were covered.
27. "Authorised" in a report means the target is inside the user's own scope file, not that legal permission exists, and the report says so. The report's `Reference` is the timestamp ID; the `Report folder` is the numbered directory.
28. Design for Masscan if it is added later: discovery only, a fixed rate of 100 packets per second passed explicitly, no flag or config override, never run through `sudo`, no `--banners` (Nmap does service detection afterwards). It goes through the same scope decision and address limit as Nmap, and its output is untrusted data parsed with the same fail-closed rules. Raw-socket ability comes from `setcap cap_net_raw+ep`, preferably on a private root-owned copy of the binary.
29. Masscan is deferred. Nmap covers the 1024-address limit, Masscan cannot be tested end to end on this machine without granting a capability and possibly sending frames out of the Wi-Fi interface, and the policy engine that should govern a high-rate scanner does not exist yet. No capability was set, no Masscan code was written, and `status` labels it "Not used yet (optional)".
30. A release tag is created last. Documentation and the status file are corrected and committed first, so the tagged commit does not contradict its own release.
31. CPE is optional extra data that Nmap reports, and GhostSight never constructs one. Only the `cpe:/` form is accepted (Nmap 7.94 emits only that form), with part `a`, `h` or `o`, characters from letters, digits and `. _ ~ % : -`, at most 200 characters per name and 10 names per service. Duplicates are removed and order is kept. A bad, overlong or surplus entry is dropped and the scan continues, so a hostile banner cannot make a scan fail through this field. The `cpe:2.3:` form is added only if a later step needs it. (v0.4.0 matching may need it, because NVD uses that form; this is decided when the matcher is written.)
32. A CPE is a name, not evidence of a vulnerability. A CPE without a version must not count as a version match in v0.4.0.
33. Untrusted text is neutralised where it meets a line-based format. The parser keeps text exactly as received (decision 24). The formatters collapse all whitespace, including every line-break character, so each value occupies one line. Fields that are shown without the "Not detected" placeholder, such as `name` and `protocol` in the overview table and the final report, use the same collapsing.
34. `Service` stores Nmap's `product` and `version` attributes separately as `product` and `product_version`, exactly as received (the Ubuntu suffix is kept). This is additive: `Service.version` stays as the combined display text, so no existing code or test changed. The Nmap parser is the only code that fills the two new fields, and it builds `version` from them. The three fields can disagree if a `Service` is built by hand, so a derived property is a candidate for the v1.0.0 schema change. Nothing displays the new fields yet. The reason for the split is that CVE matching in v0.4.0 needs product and version as separate values (reasoned, not yet tested against real CVE data).
35. v0.3.0 was released with the service-description work only. The audit log and the policy engine are about controlling what GhostSight may do, not about describing services, so they are a separate milestone that must be finished before v0.6.0 (Metasploit). Its version number is not assigned, because v0.4.0 is already vulnerability intelligence. Until it exists, the 1024-address limit stays and GhostSight has no audit log. (Superseded by decision 56: the audit log and policy engine are now v0.6.0, and they were built before any Metasploit work.)
36. v0.4.0 is built on probed NVD data (see the research section), in small steps. (a) The first step is a pure function with no network that reads one NVD `cve` object into GhostSight's own structure, tested first with hand-built dictionaries copied from the probes. It keeps the English description, keeps every CVSS entry with its source and type, and keeps match rules grouped by configuration so `AND` platform conditions stay visible. (b) Scores are never silently averaged, maximised or minimised. Every score is stored with its source and type, the NVD Primary score is shown when there is one, and the report says plainly when sources disagree or only a Secondary score exists. (c) A version match is at most "potential". A wildcard rule, an open-ended range, and a platform condition that was not checked each lower the evidence, and the report states which basis was used. The backport caveat is written into the report. (d) The matcher is tested against NVD's own answer for 9.6p1 (the 32 CVEs probed) before it is trusted. (e) Text from NVD (descriptions, titles) is neutralised where it is written out (decision 33). (f) The data source (fetch per product, local mirror, or another) is decided at the downloader step, with a measured slice of data in hand. The planned order after step (a): version matcher, on-disk cache, explicit downloader command, `analyse` producing findings, release. (g) A CVSS base score is accepted only if it is a real number (not a bool) from 0 to 10 inclusive. Anything else is dropped, not clamped, and the check runs before any `float()` conversion, so NaN, infinity, `true`/`false` and huge integers can neither be stored nor crash the reader. Step (a) is done (commits 9c68b47 and e4f27ef), and (g) was added test-first. (h) The matcher policy is decision 38, now encoded in tests. Step (d) was meant to be extended to the four NVD answers (74 records), but that test is not written because the saved data was lost (see the research section); the two-CVE regression test stands in for it.
37. The project owner owns a second laptop running Windows, and it is the intended target for Metasploit validation in v0.6.0 and v0.7.0. (Version numbers superseded by decision 56: Metasploit is v0.7.0 and validation is v0.8.0.) Owning it settles authorisation but not safety or isolation. Before v0.6.0, the lab needs a network containing only the two machines (for example a direct cable or a dedicated hotspot, not the shared home Wi-Fi), a backup or restore point (or a throwaway virtual machine instead of the daily-use install), and the allowlist and audit log from decision 35. Validation stays limited to explicitly allowlisted, isolated lab targets. This replaces the earlier note that the project owner had no second machine.
38. Matcher policy (amended by decisions 43 and 44, which replace the bare-wildcard and range-update rules in (c); a working policy taken from the probes, in-sample, and now encoded in tests). (a) The version is read from Nmap's CPE, not from the display text with its Ubuntu suffix (agreed). (b) A version such as `9.6p1` is split into a number and an update. Only digits and dots plus an optional `p` and digits were seen (OpenSSH). A number has no leading zeros and at most 40 characters, and numbers are compared numerically with trailing zeros padded, so `9.6` equals `9.6.0`. (c) One rule gives one of five results: match, no match, not applicable (not a vulnerable rule, a different part, vendor or product, or a bare wildcard with no bounds), version unreadable, or name unreadable. Ranges ignore the update field. An exact version with update `-` matches only a target with no update, `*` matches any update, and `pN` matches an equal update. (d) One CVE gives one of three answers, with match ranking over cannot tell, and cannot tell over no match. Unreadable data never becomes "no match": an unreadable rule name or version gives "cannot tell", and so does any rule in a negated node, or a node whose operator is not OR, that is not simply "not applicable". Such rules never count as a match. This replaces the earlier idea of skipping unsplittable names, which could hide a real OpenSSH rule behind an escape. The cost is noise from unrelated unreadable names, and its size is unmeasured. (e) `AND` platform conditions are not checked, and the answer does not say which rule matched. `evidence.py` now lists the matched rules and states the platform caveat; it does not say which rule was unreadable when the answer is cannot tell.
39. Score choice and evidence (decision 36 b made concrete). The NVD Primary score of the newest CVSS version is shown, V3.1 before V2, and a Primary V2 score beats a Secondary V3.1 score. With no Primary score, every score is shown, each labelled with its source. Scores are never averaged, maximised or minimised, and disagreement is judged within one CVSS version only, with the note naming each source and score. A CVE with no score says so, and says that does not mean it is harmless. An evidence record states the answer, the matched rules with their basis (exact version, bounded range or open-ended range), and caveats: the platform was not checked, a distributor may have backported a fix, and cannot tell is not a clean result. A service with no readable version gives cannot tell, never clean.
40. NVD cache. One JSON file per vendor and product under `<home>/cache/nvd/`, written atomically (temporary file, then `os.replace`). Names are accepted only if they match a known-good pattern and are never cleaned, so `../` and similar cannot leave the cache folder. A missing, oversize or damaged file reads as `None`, and `None` means cannot tell, never no CVEs. The cache takes `fetched_at` from the caller and never reads the clock. The folder is git-ignored. A plain JSON file was chosen over a database for now; SQLite at v1.0.0 remains the upgrade path.
41. A service's version comes only from its CPE names (decision 38 a, agreed). `service_versions` returns every distinct readable version, and an empty result means cannot tell. The Ubuntu suffix and the `product_version` text are never parsed.
42. Data source for the CVE cache is option A: an explicit user command, `ghostsight nvd-fetch --vendor V --product P`. It prints a plain warning first (NVD learns the product name and the user's IP address, nothing about scans or targets) and asks for confirmation unless `--yes` is given. It never runs by itself, and `analyse` never contacts NVD. The query is `virtualMatchString=cpe:2.3:<part>:<vendor>:<product>`, paged by `startIndex`. The fetcher allows one host (`services.nvd.nist.gov`), https only, no redirects, a 30-second timeout and a reply size limit. A download is written to the cache only if its distinct CVE IDs equal `totalResults` exactly; anything less is discarded and the old cache stays untouched. The 6-second pause, the 50-page cap and the 64 MiB reply limit are guesses, and the pause is based on a rate limit that was remembered, not read. The cache holds every CVE for a product and the matcher filters by version. Option B (a whole-database mirror) stays possible later.
43. Bare wildcard (replaces the bare-wildcard part of decision 38 c). A rule on the right part, vendor and product with version `*`, no bounds and update `*` is a match, with the basis "any version (no version limit)". NVD lists such CVEs for 9.6p1, and treating the rule as not applicable hid three of them. The platform and backport caveats still apply and the finding is at most potential. A `*` version with a specific update and no bounds is version unreadable (never seen in data). Commit `df925c3`.
44. Range rules and the update field (replaces "ranges ignore the update field" in decision 38 c). For a `*` version with bounds, the number is judged first, and out of range is no match whatever the update. In range: update `*` is a match, an update equal to the target's update is a match, and update `-` or any other update is version unreadable (cannot tell). The policy is cautious and rests on four rules in one product, so it is not a proven NVD rule. Commit `984091b`.
45. Findings written by the analysis. One potential finding per matching CVE, never higher. Confidence is 0.0, because there is no basis for a number, and reports show it as "not rated". One unknown finding per service lists every cannot-tell CVE and says it is not a clean result. A service counts as checked only if at least one cache entry for it had a readable record, and `analysis_performed` is set only if at least one service was checked, so "0 findings" cannot mean "never checked". A score is filled in only when exactly one score is shown. Evidence lines state the version Nmap found, the matched rules with their basis, the scores and the caveats. All text the analysis builds is printable ASCII, cut to 200 characters, because the formatters print it raw (decision 33).
46. `analyse` and `analyse --save`. A scan name must fully match `scan_` plus 1 to 9 digits, and without a name the highest-numbered scan folder that holds `scan_data.json` is used. `scan_data.json` is read by a strict reader that refuses damaged files and never echoes their values. `analyse` alone is a preview: no file changes and nothing is sent to NVD. `--save` replaces the scan's findings (no merge), sets `analysis_performed`, adds the analysis notes with the prefix `Vulnerability analysis: ` and rebuilds all seven files. It is refused (exit 2) for demonstration scans and for an analysis that checked no service. A write failure prints a fixed message and exits 4. `write_scan_data` is atomic (temporary file in the same folder, then `os.replace`), so an interrupted save cannot leave a half-written `scan_data.json`. Commits `aa813d7`, `31e0f35` and `8089ecc`.
47. Local AI scope for v0.5.0 (agreed). (a) The AI writes only plain-language explanation and suggested next steps. It never changes a finding's status, score or confidence and never runs commands. The policy engine will enforce this later. (b) A new command `ghostsight explain --scan scan_NNN` with a preview and `--save`, like `analyse`. `analyse` stays the NVD step. (c) Ollama is reached on `127.0.0.1` only, with the host checked in code, so scan data never leaves the machine. (d) The model is `qwen3:4b` (pulled, digest `359d7dd4bcda`), to become a configuration setting.
48. Request shape (superseded in part: the schema probe showed that omitting `think` spent all 1500 tokens on thinking and left `response` empty, so the request sends `think` false together with the schema. The original text follows, kept as written). Omit `think`, set `format` to a JSON schema, read `response` only, and never display `thinking`. `think:false` leaked reasoning into `response` in probe 1, so it is not trusted.
49. Validation (built; no objection was raised when it was proposed). Every reply is validated with pydantic. Bad JSON, a missing field, a reply containing `<think` or `</think`, an empty `response`, or a `done_reason` other than `stop` becomes a fixed error and is never shown as text. Both `response` and `thinking` are untrusted model output, and scan banners and NVD text are untrusted prompt input.
50. Limits (built, with two changes: `num_ctx` is now 8192, decision 54, and the 300-second timeout is a guess, because no long output was timed). The client sets `num_ctx` explicitly and caps the prompt size. Timeouts are in minutes, with the values taken from a run on a real prompt. The command says that it may take a few minutes before it starts.
51. Facts block (accepted with "go for default"). `explain` prints "Facts from the scan (computed by GhostSight, not AI)" above the AI text: services found, whether analysis was done, findings by status, the highest score with its severity word (only a known word is printed), and how many CVE records could not be checked. Code computes the numbers from the scan data. The block is preview-only and is never saved. Reason: after the prompt wording was changed, 4 of 5 runs still said "8 potential vulnerabilities" (five samples on one scan).
52. Prompt content (a fix after real data). The prompt carries the totals by status, "shown N of M" lines, findings ordered by importance (unknown first, then scored before unscored, highest score first), at most 3 CVE IDs per finding, and the first sentence of at most 4 notes, analysis notes first. Text from scans and NVD is cleaned and cut, and placed between BEGIN SCAN DATA and END SCAN DATA. The reply must pass the schema. No phrase deny-list was added, and the wording is not tuned further against five samples.
53. Stale note. The scanner's "No vulnerability analysis has been done yet" text lives in one constant, `NOT_ANALYSED_NOTE` (`ghostsight/reporting/notes.py`). `apply_analysis` drops it when analysis is saved, so a saved scan no longer says both things.
54. Context budget. `NUM_CTX` is 8192. A prompt of at most 7700 characters at a worst case of 1.5 characters per token (below the 1.89 measured on one random sample) is 5,133 tokens, and with 1500 reply tokens that is 6,633 of 8,192. A test pins the arithmetic. The cost is 3.9 GB of GPU memory instead of 3.2 GB, still 100% GPU.
55. Saved AI text. `explain --save` stores the AI text only and replaces any earlier text. `analyse --save` clears the saved AI text, because that text described findings the save replaces. Both refuse a demonstration scan.
56. Milestone numbering (agreed with default). The audit log and policy engine are v0.6.0, Metasploit RPC (lab only) is v0.7.0, controlled lab validation is v0.8.0, and v1.0.0 is the stable release with SQLite. This replaces the numbering in decision 37 (Metasploit in v0.6.0 and validation in v0.7.0) and in the earlier Pending modules list. Decision 35 still holds: no Metasploit work before the audit log and policy engine exist.
57. Audit log format (agreed). JSON Lines at `<home>/logs/audit.jsonl`, one record per line with `time`, `event`, `target`, `allowed`, `reason`, `previous_hash` and `hash`. Each record carries the previous record's hash (64 zeros for the first), so editing any record breaks every later link. The project owner was asked about dropping the chain and kept it. Limits, stated plainly: tamper-evident, not tamper-proof; removing the last record is not noticed; rewriting the whole file with recomputed hashes would pass (reasoned, not tested); no file locking; the whole file is re-read before each append. A record says an action was approved, not that it finished. It never stores scan results, banners or AI text.
58. Policy file (agreed). A separate `config/policy.local.toml`, ignored by git through `config/*.local.toml`, with `config/policy.example.toml` committed. The scope file stays about targets only. A missing file gives the defaults (limit 1024, no lab targets). `[policy] max_target_addresses` must be a whole number from 1 to 65536, and booleans, decimals and text are refused. `[lab] allowed` is parsed into networks and is unused until v0.7.0. Unknown sections and keys are refused, so a typo cannot silently do nothing. The decision uses only the policy and the target, never AI output. A broken policy file stops `scan` with exit 3, like a broken scope file, and is never treated as allowed. `nmap_runner.MAX_TARGET_ADDRESSES` stays as a backstop equal to the largest allowed limit (65536).
59. The audit writer fails closed (agreed). Before each append the chain is checked, and if the log is damaged, unreadable or cannot be written, the action is not carried out and the command exits 5 with a message pointing to `ghostsight audit verify`. In `scan` the order is scope, policy, audit record, then the scan, so refused scans are recorded too. A scan stopped by a broken scope or policy file (exit 3) is not recorded, and neither is a declined `nvd-fetch`, an unsafe product name or a refused save.
60. A scope file that is not UTF-8 text is a `ScopeError` and `scan` exits 3 (found by a probe, then fixed test-first). The policy loader already handled this case.
61. Metasploit client (agreed with default). GhostSight talks to `msfrpcd` through its JSON-RPC server (`-j`) with Python's standard library, so there is no `msgpack` and no new dependency. The client is loopback only, uses plain HTTP, ignores proxy settings, refuses redirects, allows three method names (`core.version`, `core.module_stats`, `module.search`) and has no generic call function. The user and password come only from `GHOSTSIGHT_MSF_USER` (default `msf`) and `GHOSTSIGHT_MSF_PASSWORD`. Replies over 1 MiB are refused.
62. `msf` commands (agreed with default). Three commands: `version`, `stats`, `search`. The order is settings, audit record, query. The record holds the server address and the method name, never the search text. If the log cannot be written nothing is sent (exit 5). Missing or unusable settings exit 2 and record nothing. A failed query exits 4 and leaves its record, because a record says approved, not finished. These queries touch no target, so they do not use the lab rule.
63. `status` never starts Metasploit. The check only looks for the two programs with `shutil.which`. Reason: `msfrpcd -h` was seen starting the snap's database.
64. Lab-target rule. `evaluate_lab_target` is built and tested in v0.7.0, and no command calls it until v0.8.0, where validation must go through it. This updates decision 58 and the earlier entries that say `[lab] allowed` is unused until v0.7.0.
65. Server stance. GhostSight never starts, stops or installs `msfrpcd`. It must be started with `-a 127.0.0.1`, because its default is to listen on all interfaces. A `-n` server answered read calls with no credentials or a wrong password (seen once, not proven for every method), so enforcement lives in GhostSight (loopback only, read-only method list, audit record), not in the server. No login or token code was written, because it could not be tested against a server that checks passwords.
66. Validation statuses. A check outcome becomes a finding status by fixed rules (`status_rules.py`): `vulnerable` gives validated, `appears_vulnerable` gives likely (only from potential or unknown), `not_vulnerable` gives false positive, `detected` and `cannot_tell` change nothing. A status is never lowered silently: a validated finding that a later check calls not vulnerable stays validated and is flagged as a conflict. `validation_notes` is the marker that a scan was validated, so re-analysing it and validating it a second time are both refused.
67. Lab gate. A target may be validated only if the scope file allows it and `[lab] allowed` in the policy allows it (`evaluate_lab_target`: one private address inside a listed range). Both must pass, and the check comes before any Metasploit call. The target must be one canonical IP address. Public websites and hostnames cannot be validated.
68. Check-only modules. Only `auxiliary` modules are candidates, never exploits, with at most 5 CVE queries and 3 candidates per finding, in rank order. The check client has its own method list (`module.info`, `module.check`, `module.running_stats`, `module.results`) and `module.execute` is in no list. The read-only client is unchanged. The check sets only `RHOSTS`, and only the first supported module is run per finding. `module.check` is asynchronous, so the client polls (5 polls, 2 s apart, both guesses). An unknown result code means cannot tell.
69. Dry run by default. `validate` without `--confirm` sends nothing to the target and changes no file. It asks the local Metasploit server read-only questions (`module.search`, `module.info`) under one `msf-query` audit record (the owner answered "yes keep it default"). With `--confirm` the order is settings, one `validate-check` audit record (it also covers the lookups), the checks, the result on screen, then the save. If the log cannot be written nothing is sent (exit 5). A plan with no checkable finding ends the command before Metasploit is contacted. If no check produced a result, nothing is saved.
70. Validation report. `validation.txt` explains each result in plain words and says that validation is for lab targets only. Control characters are stripped from validation notes only. The final report is unchanged. A check result is what the module reported, not proof beyond that.
71. `scan --skip-discovery`. An opt-in flag that adds Nmap `-Pn` for one address, for hosts whose firewall makes the default profiles report no host up. A range is refused (exit 1, before the policy check and the audit record). Reports say discovery was skipped and that this does not hide the scan. It is not the default for any profile and it is not an evasion option.
72. Scope of v0.8.0. The owner chose to keep v0.8.0 as designed (option C). Nothing built is Windows-specific, and scanning works for any operating system by IP address inside the scope. ZAP web scanning is proposed after v1.0.0, domain names are not added to `scan`, and AI-written suggested fixes are a v1.0.0 candidate.
73. What the release claims. v0.8.0 is controlled lab validation as built and tested with fakes and probes. No real `module.check` has run against a vulnerable machine or the lab laptop (Windows gives no application version, so `analyse` finds 0 findings there), and only the result code `unknown` was seen from a real server. The v0.8.0 run section lists what was run and what was only reasoned.
