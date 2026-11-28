# GhostSight

**AI-powered vulnerability assessment and security validation for Linux, from the command line.**

GhostSight is a modular, CLI-first tool that is being built to discover network services, analyse them, assess likely vulnerabilities, validate findings in controlled labs, and write reports that non-experts can understand. All AI runs locally, so scan data never leaves your machine.

> **Project status: early development.** Latest release: v0.8.0 (controlled lab validation). Earlier releases: v0.7.0 (Metasploit connection and read-only queries), v0.6.0 (audit log and policy engine), v0.5.0 (local AI), v0.4.0 (vulnerability intelligence), v0.3.0 (service intelligence), v0.2.0 (scanning engine) and v0.1.0 (CLI foundation).
> **Working today:** scope checks, a policy file for the largest range, a tamper-evident audit log, read-only questions to a local Metasploit server, Nmap scanning of allowed targets, a record of what Nmap reports about each service, a local cache of NVD CVE data, version-based vulnerability analysis of a saved scan, plain-language AI explanations from a local model, and TXT reports.
> **Validation is limited:** `validate` works only on isolated lab targets, and its `--confirm` step has not yet run a real check against a real target (see [Limitations](#limitations)). The local AI only explains a scan in words and cannot change a finding. Analysis findings are version matches only: at most "potential", never proof. See [What works today](#what-works-today), [Limitations](#limitations) and the [Roadmap](#roadmap).

## Contents

- [Authorised use only](#authorised-use-only)
- [What works today](#what-works-today)
- [Design principles](#design-principles)
- [The pipeline](#the-pipeline)
- [Installation](#installation)
- [Usage](#usage)
- [Project layout](#project-layout)
- [Dependencies](#dependencies)
- [Limitations](#limitations)
- [Roadmap](#roadmap)
- [License](#license)

## Authorised use only

Only scan systems you own or have **explicit written permission** to test. Scanning or attacking systems without permission is illegal in many countries and can cause real harm.

The MIT license lets you use and modify this code. It does **not** give you permission to test anyone's systems. You are responsible for how you use this tool.

GhostSight refuses to scan anything that is not in your scope file (a deny-by-default list of IP addresses and ranges). There is no option to override that. The scope file is **your own list**: it records your decision and is not proof that you have legal permission. Validation is limited to isolated lab targets with an audit trail.

## What works today

| Feature | State |
|---|---|
| `ghostsight --version`, `--help` | Implemented |
| `ghostsight status`: checks Python, workspace, git, nmap, masscan, Ollama, GPU, Metasploit (looks for the programs, never starts them) | Implemented |
| `ghostsight scope`: checks a target against your scope file, sends no network traffic | Implemented |
| `ghostsight scan`: Nmap scan of a target inside your scope, with three profiles | Implemented |
| `ghostsight scan --skip-discovery`: for one address, skips Nmap's host-up check (`-Pn`) and tries the ports anyway. The report says discovery was skipped | Implemented (one real scan of a lab laptop) |
| Service details exactly as Nmap reports them: product, version and CPE names. CPE names appear in `services.txt`, and product and version are stored separately in `scan_data.json` | Implemented |
| `ghostsight nvd-fetch`: downloads the CVE records for one product from NVD into a local cache. The only command that contacts NVD | Implemented (run live once, for OpenSSH only, see [Limitations](#limitations)) |
| `ghostsight analyse`: checks a saved scan against the cached NVD data and prints the findings. A preview, it changes no file | Implemented (checked on real data for OpenSSH only) |
| `ghostsight analyse --save`: stores the findings in the scan folder and rebuilds its reports | Implemented |
| `ghostsight report`: writes a TXT report folder from **demonstration data** | Implemented |
| File logging with a `--verbose` option | Implemented |
| Structured JSON copy of every scan, used to regenerate reports | Implemented |
| `ghostsight explain`: asks the local AI model to explain a saved scan in plain language, with code-counted facts shown above the AI text. A preview, it changes no file | Implemented (needs Ollama and the `qwen3:4b` model, tried on one scan) |
| `ghostsight explain --save`: stores the AI text in the scan's `ai_analysis.txt` and rebuilds its reports | Implemented |
| `ghostsight audit verify`: checks the hash-chained audit log of scans, NVD downloads, saves, Metasploit queries and validation checks | Implemented |
| Policy file `config/policy.local.toml`: sets the largest range a scan may cover | Implemented |
| Lab-target rule (policy engine): allows one private address inside a range listed under `[lab] allowed`. `validate` requires it, together with the scope file | Implemented |
| `ghostsight msf version`, `msf stats`, `msf search`: read-only questions to a Metasploit server on this computer, each recorded in the audit log before it is sent | Implemented (the query code ran against a real local server once and the commands were tested with fakes, see [Limitations](#limitations)) |
| `ghostsight validate`: dry run. Plans which Metasploit check modules would be run for the findings of a saved scan, using read-only questions to the local Metasploit server. Nothing is sent to the target and no file is changed | Implemented (tested with fakes and a fake server. The only real run was on a scan with no findings, see [Limitations](#limitations)) |
| `ghostsight validate --confirm`: runs the planned check-only modules against one lab target, saves the results in the scan and rewrites its reports | Implemented (tested against a fake server only, see [Limitations](#limitations)) |
| Masscan fast discovery | Deferred. `status` detects it, but nothing uses it |

## Design principles

- **Authorisation first.** Only targets in your scope file can be scanned. Reports say "Not confirmed" unless the scan data records that the target was inside the scope file.
- **No overclaiming.** A version match is not proof of a vulnerability. Findings use five labels: `potential`, `likely`, `validated`, `false positive` and `unknown`. Analysis produces only `potential` and `unknown`. A scan that has not been analysed is reported as "Not analysed yet", never as "all clear".
- **Unknown is not clean.** If a CVE record cannot be read or compared, or a service has no stored CVE data, GhostSight says so. It never turns missing data into "no vulnerabilities".
- **Offline analysis.** Only `nvd-fetch` contacts NVD, only when you run it, and it warns you first. `analyse` reads local files and sends nothing.
- **AI recommends, rules decide.** The local AI only writes plain-language explanations and next steps, and it cannot change a finding. A deterministic policy engine now decides what is allowed, so far only how large a range a scan may cover. AI never runs shell commands.
- **Low-Noise means low load, not stealth.** The default scan profile is gentle on the network. GhostSight has no features for evading detection, and the scan is visible to anyone watching.
- **Untrusted input.** Scanner output, NVD data and saved scan files are treated as untrusted data. Parsing fails closed: bad input stops the step instead of producing a guess. Text that comes from a scanned host is shown on one line in reports, so a banner cannot fake a report line.
- **No root.** Scans use the unprivileged TCP connect method, so GhostSight does not need `sudo`.
- **Local and lightweight.** It runs on one machine with modest resources (developed on 16 GB RAM).
- **Reports for people.** Plain language first, technical detail after.

## The pipeline

```
Discover  ->  Analyse         ->  Assess     ->  Validate    ->  Report
  (Nmap)      (NVD version        (local AI)     (lab only,      (TXT)
               matching)                          audited)
```

All five stages exist today. Analyse compares service versions with cached NVD data. The Assess stage is the local AI `explain` command, which writes an explanation and changes no finding. Validate is the `validate` command. It is limited to lab targets, and its `--confirm` step has been tested only against a fake server.

## Installation

Requirements: Linux (developed on Ubuntu 24.04), Python 3.12 or newer, and git.

```bash
git clone https://github.com/ashmit-rath/GhostSight.git
cd GhostSight
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Check that it works:

```bash
ghostsight --version
pytest
```

Scanning needs Nmap:

```bash
sudo apt install nmap
```

Ollama is needed only for `ghostsight explain`. Install it from [ollama.com](https://ollama.com), then download the model (about 2.5 GB):

```bash
ollama pull qwen3:4b
```

Masscan is not used yet.

## Usage

### Show the commands

```text
$ ghostsight --help
Usage: ghostsight [OPTIONS] COMMAND [ARGS]...

 AI-Powered Automated Vulnerability Assessment and Security Validation CLI.

Options:
  --version -v   Show version and exit.
  --verbose      Write detailed debug messages to the log file.
  --help         Show this message and exit.

Commands:
  status     Show GhostSight system and dependency status.
  scope      Check whether a target is inside your allowed scope.
  scan       Scan a target, but only if it is inside your allowed scope.
  nvd-fetch  Download CVE data for one product from NVD into the local cache.
  analyse    Check a saved scan against the stored NVD data. Sends nothing.
  explain    Ask the local AI to explain a saved scan in plain language.
  validate   Validate findings in a controlled, authorised lab environment.
  report     Generate a human-readable TXT security report.
  audit      Check the audit log.
```

This is shortened. Typer also adds shell-completion options and draws the lists in boxes.

### Check your system

```text
$ ghostsight status
┏━━━━━━━━━━━━━━━┳━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Check         ┃ Status ┃ Details                                                                ┃ Needed for                ┃
┡━━━━━━━━━━━━━━━╇━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ Python        │ OK     │ 3.12.3                                                                 │ Running GhostSight        │
│ Workspace     │ OK     │ /home/stealth-ops/GhostSight                                           │ Logs and reports          │
│ git           │ OK     │ git version 2.43.0                                                     │ Version control           │
│ nmap          │ OK     │ Nmap version 7.94SVN ( https://nmap.org )                              │ Scanning (v0.2.0)         │
│ masscan       │ OK     │ Masscan version 1.3.2 ( https://github.com/robertdavidgraham/masscan ) │ Not used yet (optional)   │
│ ollama        │ OK     │ ollama version is 0.40.0                                               │ Local AI (v0.5.0)         │
│ ollama server │ OK     │ running, 1 model(s): qwen3:4b                                          │ Local AI (v0.5.0)         │
│ NVIDIA GPU    │ OK     │ NVIDIA GeForce RTX 5060 Laptop GPU, 595.99.02, 8151 MiB                │ Faster local AI           │
│ metasploit    │ OK     │ msfconsole and msfrpcd found (not started)                             │ Controlled lab validation │
└───────────────┴────────┴────────────────────────────────────────────────────────────────────────┴───────────────────────────┘
All required checks passed.
```

This is output from the development machine. Yours will differ. The `metasploit` row only checks that `msfconsole` and `msfrpcd` can be found. It never starts them. `status` exits with code 1 only if a **required** check fails. A missing optional tool is shown as `MISSING` and is not an error.

### Set your scope

GhostSight scans nothing until you list targets in a scope file. Copy the example and edit it:

```bash
cp config/scope.example.toml config/scope.local.toml
nano config/scope.local.toml
```

The file looks like this. Every entry in the committed example is commented out:

```toml
[scope]
allowed = [
    # "127.0.0.1",          # this machine
    # "192.168.56.0/24",    # an isolated lab network
]
```

List **only** systems you own or have explicit written permission to test. The rules:

- Entries are IP addresses or CIDR ranges. Hostnames are rejected, because DNS can change between the check and the scan.
- A missing file or an empty list allows nothing.
- A broken file stops the command with exit code 3. It is never treated as "allowed".
- `config/scope.local.toml` is ignored by git, so your list is not committed.

### The policy file

The policy file holds limits that are separate from your scope. To change them, copy `config/policy.example.toml` to `config/policy.local.toml`. The local file is ignored by git.

```toml
[policy]
max_target_addresses = 1024
```

- `max_target_addresses` is the largest range a scan may cover, as a whole number from 1 to 65536. Without a policy file the limit is 1024.
- Unknown sections or keys, text or decimal values, and `true` or `false` are refused.
- A broken policy file stops `scan` with exit code 3, the same as a broken scope file. It is never treated as "allowed", and nothing is recorded.
- A range over the limit is refused with exit code 1 and recorded in the audit log, with the reason.
- The file also has a `[lab] allowed` list. It is read and checked. A lab-target rule uses it (one private address inside a listed range, nothing else), and `validate` applies that rule. The `msf` commands below ask only about Metasploit's own module list and need no lab target.
- The decision comes from the policy file and the target only. The AI is never asked.

### The audit log

Each scan decision (allowed or refused), `nvd-fetch` download, `analyse --save`, `explain --save` and `msf` query adds one line to `logs/audit.jsonl` in the GhostSight home folder. A record holds the time, the event, the target, whether it was allowed, a short reason, and a hash that links it to the record before it. It never stores scan results, banners or AI text. The file is created with owner-only permissions.

```bash
ghostsight audit verify
```

- `audit verify` re-reads the log, checks every link and prints `Records checked: N` (exit code 0). With no log it prints `No audit records yet.` (exit code 0). A broken chain prints the problem and exits with code 1. It never prints record contents.
- If the log cannot be written, or is damaged, the action is refused. `scan`, `nvd-fetch`, `analyse --save`, `explain --save` and the `msf` commands then exit with code 5 and tell you to run `ghostsight audit verify`.
- A scan stopped by a broken scope or policy file is not recorded. Neither is a declined download, a refused save, or an `msf` command stopped by missing settings.
- The log says an action was approved, not that it finished.
- The chain is tamper-evident, not tamper-proof. Changing a record breaks every link after it, but removing the last record is not noticed, and someone who can rewrite the whole file could recompute the hashes. There is no file locking.

### Ask Metasploit read-only questions

GhostSight can ask a Metasploit server that runs on this computer three questions. None of them touches a target.

```bash
read -rs GHOSTSIGHT_MSF_PASSWORD && export GHOSTSIGHT_MSF_PASSWORD
ghostsight msf version
ghostsight msf stats
ghostsight msf search smb
```

- `msf version` shows the Metasploit version, `msf stats` shows how many modules of each type are loaded, and `msf search WORDS` searches Metasploit's own module list. A search shows the first 100 results and the true total.
- The password is read from `GHOSTSIGHT_MSF_PASSWORD` and the user from `GHOSTSIGHT_MSF_USER` (default `msf`). Neither is taken from a file or an option.
- The client talks only to `127.0.0.1` over plain HTTP. The commands always use port 55553, and the check inside the client does not look at the port. It ignores proxy settings and never follows a redirect. It allows three method names and has no call that runs a module. `validate` sends its checks through separate code, described under Validate findings in a lab.
- Each command writes an `msf-query` record to the audit log before anything is sent. The record holds the server address and the method name, never the search words. If the log cannot be written, nothing is sent and the exit code is 5.
- Exit code 2 means the Metasploit settings are missing or not usable (nothing is recorded). Exit code 4 means Metasploit could not be reached or its reply could not be used. A failed query still leaves its record, because the log says approved, not finished.
- GhostSight never starts Metasploit. Start `msfrpcd` yourself with `-a 127.0.0.1`, because its default is to listen on every network interface. In one test, a server started with `-n` (no database) answered calls without checking the password, so any program on that computer could use it.

### Check a target

```bash
ghostsight scope 192.168.56.10
```

This reads the scope file and sends no network traffic. Exit code 0 means allowed, 1 means denied, 3 means the scope file is broken.

### Scan a target

```bash
ghostsight scan --target 192.168.56.10
ghostsight scan --target 192.168.56.10 --profile normal
ghostsight scan --target 192.168.56.10 --skip-discovery
```

`scan` runs the same scope check first. If the target is not allowed, it exits with code 1, writes no report and records the refusal in the audit log. A range larger than the policy limit is refused the same way. No option overrides this, and the profile never changes what is allowed.

A scan uses Nmap's TCP connect method with service detection, reports open TCP ports only, and runs no Nmap scripts and no operating-system detection. It does send packets to the target, so run it only against systems you are allowed to test. The policy file sets the largest range a scan may cover (1024 addresses unless you change it).

| Profile | Ports checked | Pace | Nmap's limit per host | GhostSight stops the scan after | Measured on loopback |
|---|---|---|---|---|---|
| `low-noise` (default) | 100 most common TCP ports | gentle | 10 minutes | 15 minutes | about 47 seconds |
| `normal` | 1000 most common TCP ports | standard | 30 minutes | 40 minutes | not measured |
| `deep` | all 65535 TCP ports | standard, most thorough service detection | 60 minutes | 70 minutes | about 4 minutes 20 seconds |

The measured times come from scanning the development machine and will differ on a real network. A service on a port a profile does not check will be missed, and each report states how many ports were covered.

If a firewall drops Nmap's host-up check, a scan can report that no host is up and never test the ports. For one address that you know is online, `--skip-discovery` adds Nmap `-Pn`, so the ports are tried without that check. It is refused for a range (exit code 1). The report says discovery was skipped, and a result of no open services then does not show that the host was online. It does not hide the scan from anyone watching, and it is never the default.

Exit codes for `scan`: 1 means refused, 2 means a usage error (for example an unknown profile), 3 means the scope file or the policy file is broken, and 4 means the scan failed or its reports could not be written. Exit code 5 means the audit log could not be written, so the scan did not start. A failed scan writes no report. A scan that Nmap did not finish cleanly is reported with a visible warning.

A successful scan writes a numbered folder under `output/scans/`, in the same layout as the demonstration report below. The report shows the target as authorised only because it was inside your scope file, and it says that this is not proof of legal permission. A new scan has not been analysed, so its report says "Not analysed yet" and lists no findings until you run `analyse --save`.

### Fetch CVE data

```bash
ghostsight nvd-fetch --vendor openbsd --product openssh
```

This downloads every NVD record for one product (named by its CPE vendor and product, for example `openbsd` and `openssh`) and stores it in a local cache under `cache/nvd/` in your workspace. It is the only GhostSight command that contacts NVD, and it never runs by itself.

- NVD sees the product name and your IP address, and nothing about any scan. GhostSight prints this warning and asks for confirmation. `--yes` skips the question but not the warning.
- The download is stored only if it is complete. A partial download changes nothing.
- The name must be letters, digits, dots, dashes or underscores. Anything else is refused and not printed.
- Exit codes: 1 means you declined, 2 means the name is not safe or the usage is wrong, 4 means the download failed or the cache could not be written, and 5 means the audit log could not be written, so nothing was downloaded.
- The cache folder is ignored by git.

### Analyse a scan

```bash
ghostsight analyse
ghostsight analyse --scan scan_001
ghostsight analyse --scan scan_001 --save
```

`analyse` reads a saved scan (the newest one unless `--scan` names a folder), compares each service's version with the cached NVD data and prints the findings. It sends nothing to NVD.

Without `--save` it is a preview and no file is changed. With `--save`, the findings and notes are stored in the scan folder and all seven report files are rebuilt. Saving replaces any findings stored earlier in that scan, and clears any AI text saved there, because that text described the old findings. A demonstration scan, or an analysis that checked no service, is refused and nothing is written.

How to read the results:

- A **potential** finding means the version Nmap reported falls inside a version range or list that NVD gives for that CVE. It is not proof. A Linux distributor may have fixed the problem without changing the version number, and the platform conditions in the CVE are not checked. Each finding says both.
- Confidence is shown as "not rated". No number is invented.
- If a CVE record cannot be read or compared, the service gets one **unknown** finding that lists those CVE IDs. This is not a clean result.
- A note tells you when a service has no stored CVE data, and which `nvd-fetch` command would fetch it. A service with no stored data is "not checked", not "clean".
- Only application versions that Nmap gives as a CPE name are checked. The text version Nmap prints is never parsed.

Exit codes for `analyse`: 2 means no scan was found, the name is not valid, or a save was refused, 4 means the scan file is unreadable or damaged, or the save could not be written, and 5 means the audit log could not be written on `--save`.

### Explain a scan

```bash
ghostsight explain --scan scan_001
ghostsight explain --scan scan_001 --save
```

`explain` reads a saved scan and asks a local AI model (`qwen3:4b`, run by Ollama on this computer) to explain it in plain language. It needs Ollama running and the model downloaded (see [Installation](#installation)). The scan data is sent only to Ollama on `127.0.0.1`. It may take a few minutes.

Without `--save` it is a preview and no file is changed. What it prints, in order:

- A block headed "Facts from the scan (computed by GhostSight, not AI)": services found, whether analysis was done, findings by status, the highest score, and how many CVE records could not be checked. Code counts these numbers, not the model. If the AI text disagrees with this block, trust the block.
- The AI text, labelled "AI-GENERATED TEXT - NOT PROOF": a short summary and a list of suggested next steps. GhostSight checks the shape of the model's reply. A reply that is not in the expected format is discarded and an error is printed.

How to read it:

- The AI text can be wrong. In five test runs on one scan with 32 potential findings, four summaries still said 8 potential vulnerabilities, and none mentioned the 37 CVE records that could not be checked. That is five runs on one scan, not a measured error rate.
- The model is shown at most 12 services, 8 findings and 4 notes, so on a large scan it sees only part of the data.
- The model may call a service clean when it was never checked. Not checked is not clean.
- The AI cannot change a finding, status, score or confidence. It only writes text.

With `--save`, the AI text is stored in `ai_analysis.txt` and all seven report files are rebuilt. No finding, status, score or confidence is changed. The facts block is not saved. Saving replaces AI text stored earlier. Running `analyse --save` afterwards clears the saved AI text, because it described the old findings. A demonstration scan is refused.

Exit codes for `explain`: 2 means no scan was found, the name is not valid, the scan is a demonstration scan, or a save was refused. 4 means the scan file is unreadable or damaged, the AI step failed (for example Ollama is not running, or its reply was unusable), or the save could not be written. 5 means the audit log could not be written on `--save`.

### Validate findings in a lab

`validate` checks the findings of a saved scan with Metasploit modules that can only check, never exploit. It is for isolated lab systems that you own.

```bash
ghostsight validate --scan scan_001
ghostsight validate --scan scan_001 --confirm
```

- `validate` looks at the findings saved in a scan (use `--scan`, or it takes the newest). It refuses a demonstration scan and a scan that was already validated.
- The target must be one IP address that is in the scope file and also in the `[lab] allowed` list of the policy file. Otherwise `validate` is refused with exit code 1. Public websites and hostnames cannot be validated.
- Only findings with a status of potential, likely or unknown, and with a CVE id, can be checked. For each one, GhostSight asks the local Metasploit server for modules that match the CVE id and keeps only auxiliary modules that have a check method. Exploit modules are never chosen. At most 5 CVE ids are searched per finding and 3 candidate modules are considered, and the first suitable one is run.
- Without `--confirm` it is a dry run. It needs a Metasploit server started by you (see above) and `GHOSTSIGHT_MSF_PASSWORD`. It sends only the read-only questions `module.search` and `module.info` to that local server, shows the planned checks, sends nothing to the target and changes no file. If no finding can be checked it says so and needs no Metasploit server.
- With `--confirm`, each planned check is run. This sends real network traffic to the target. The results are saved in the scan (status, evidence line and validation notes) and its reports are rewritten. One `validate-check` record is written to the audit log first. If it cannot be written, nothing is sent.
- A check result changes a status only by these rules: `vulnerable` makes a finding `validated`. `appears vulnerable` makes it `likely` (only from `potential` or `unknown`). `not vulnerable` makes it `false positive`, but a finding that is already `validated` stays validated and is flagged as a conflict. `detected` and `cannot tell` change nothing. A result code that GhostSight does not know counts as cannot tell. A status is never lowered silently.
- After `--confirm` has saved results, `analyse --save` refuses that scan, so the validation is not overwritten.
- Exit codes for `validate`: 0 means it finished (this includes the case where no finding can be checked). 1 means refused: a demonstration scan, a scan that was already validated, or the scope file or lab list does not allow the target. 2 means the scan folder was not found, a save was refused, or the Metasploit settings are missing. 3 means the scope file or the policy file is broken. 4 means the scan file could not be read, the scan folder could not be written, or Metasploit could not be reached or its reply could not be used. 5 means the audit log could not be written, so nothing was sent.
- GhostSight never calls the Metasploit method that runs a module. A check can still disturb a fragile system, so use lab systems only.

### Generate a demonstration report

```bash
ghostsight report --target demo.local
```

This writes a new numbered folder, `output/scans/scan_001`, then `scan_002`, and so on. Existing folders are never overwritten. Each folder holds:

| File | Contents |
|---|---|
| `final_report.txt` | The main report for non-experts |
| `scan_results.txt` | Scan overview |
| `services.txt` | Services found |
| `vulnerabilities.txt` | Findings and their status labels |
| `ai_analysis.txt` | AI explanation section (filled by `explain --save`, otherwise a placeholder) |
| `validation.txt` | Validation section: the checks that were run and what they reported (a placeholder until `validate --confirm` has saved results) |
| `scan_data.json` | Structured data, the source of truth the TXT files are made from |

**The data in the `report` command is invented for demonstration.** The report says so, and shows the authorisation status as "Not confirmed". `analyse --save` refuses to write into a demonstration scan.

### Logs and workspace

Logs go to `logs/ghostsight.log` (rotating), not to the terminal. Use `--verbose` to include debug messages. Set the `GHOSTSIGHT_HOME` environment variable to move the logs, scope file, NVD cache and output to another directory.

## Project layout

```text
ghostsight/
  main.py            CLI commands (the only file that imports Typer)
  scanner.py         Scan workflow: scope decision in, scan result out
  system_check.py    Checks behind `ghostsight status`
  paths.py           Where logs and output live
  logging_config.py  File logging
  reporting/         Data model, text formatters, report writer, scan file reader and finder
  integrations/      Nmap command builder, XML parser and executor, Metasploit RPC client, read-only queries and check runner
  security/          Scope manager, audit log and policy engine
  validation/        Lab gate, check planning and running, status rules, saving results
  intelligence/      NVD reader, downloader and cache, version matching, evidence, analysis, AI prompt, Ollama client and reply checks
  core/              Empty placeholder
  database/          Empty placeholder (SQLite storage)
config/              scope.example.toml, policy.example.toml
tests/               pytest suite
docs/                Reserved for documentation
```

The `msf` commands ask read-only questions only. `validate --confirm` also runs the check method of auxiliary Metasploit modules. GhostSight never calls the method that runs an exploit.

## Dependencies

| Package | Why |
|---|---|
| [Typer](https://typer.tiangolo.com/) | Command-line interface |
| [Rich](https://rich.readthedocs.io/) | Readable terminal tables |
| [Pydantic](https://docs.pydantic.dev/) | Checks that the AI reply has the expected shape, and describes that shape to Ollama |
| [pytest](https://pytest.org/) (dev only) | Tests |

External tool: [Nmap](https://nmap.org/), used by `scan`. GhostSight starts it with fixed arguments, never through a shell.

External data: [NVD](https://nvd.nist.gov/), used only by `nvd-fetch`. The download uses Python's standard library, so it adds no package. Check NVD's terms of use before you rely on it.

External service: [Ollama](https://ollama.com/), used only by `explain` and running on this computer. GhostSight talks to it on `127.0.0.1` with Python's standard library, so this adds no package. The model is `qwen3:4b`.

External service: Metasploit (`msfrpcd`), used only by the `msf` commands and running on this computer. GhostSight talks to it on `127.0.0.1` with Python's standard library, so this adds no package. GhostSight does not install or start it.

Planned, added only when the milestone needs them: SQLite (storage), and possibly Masscan.

## Limitations

- Analysis compares version numbers only. A **potential** finding is not proof, and the absence of findings never means "secure".
- Backports are not detected. A distributor may have patched a CVE without changing the version number, so a potential finding may already be fixed. The reverse is also possible: missing data can hide a real problem.
- The platform (operating system or hardware) named in a CVE is not checked.
- Only products whose data you fetched with `nvd-fetch` are checked. Only application versions that Nmap reports as a CPE name are used. Without one, the service is "cannot tell".
- Some CVE records cannot be compared, for example versions written with letters in a way GhostSight does not read. They are listed in one unknown finding per service and are not judged either way.
- Analysis was checked against real NVD data for OpenSSH only: for three versions, the findings matched NVD's own answer for each version. Other products and version formats have not been tested.
- Evidence lines for a range match show the rule but not the version limits of the range. This is planned.
- `nvd-fetch` has been run against the live NVD server once, for OpenSSH only (147 records in under 9 seconds). Other products, products with many result pages, error cases and an API key were not tried. Most of its download code is tested with fakes.
- `analyse` produces only `potential` and `unknown` findings. Only `validate --confirm` can set `likely`, `validated` or `false positive`, and only from a Metasploit check result. Confidence is not rated.
- `analyse --save` replaces the findings stored earlier in that scan. `scan_data.json` is written with owner-only permissions. The other six report files use your normal umask.
- A CVSS score is one scorer's opinion. GhostSight shows the scores with their source and does not average or pick between scorers.
- Scans cover open TCP ports only. UDP is not scanned, and the default profile checks only the 100 most common ports.
- Targets must be IP addresses or CIDR ranges. Hostnames are not supported.
- The policy engine checks the size of a scan range, and `validate` uses its lab-target rule.
- The audit log is tamper-evident, not tamper-proof, and records approval rather than completion (see The audit log).
- A service Nmap cannot identify stays `unknown`. GhostSight does not guess from banner text.
- `validate --confirm` has not run a real check against a real target. On the Windows 11 lab laptop, `analyse` found no findings, because Windows gives no application version, so there was nothing to check. The check code is tested with fakes and with a fake local server that copies reply shapes seen from a real Metasploit server. One real check against a closed port on this computer returned `unknown`. The other result codes have never been seen from a real server.
- `validate` checks only findings that have a CVE id, only with auxiliary modules that have a check method, and only the first suitable module for each finding. A check sets only the target address, so a module uses its own default port, not the port the scan found the service on. Findings that are skipped are shown on screen only and are not saved.
- A check result is only what one Metasploit module reported. It is not proof that a system is secure or vulnerable, and a check sends real traffic to the target.
- The default scan profiles can report that no host is up for a host behind a firewall and never test its ports. This happened with the Windows laptop. `--skip-discovery` works around it for one address. The firewall explanation is a theory that was not proven.
- Hostnames and public websites cannot be validated, and web application scanning is not built yet.
- The three Metasploit queries ran through GhostSight's client against a real local server once. The `msf` commands were tested with fakes only. The server in that test did not check the password, so logging in has never been tested. A server with a database was not tried. `module.info` and one check (`module.check`) were tried only in probe scripts, not through the audit-logged commands. GhostSight never runs an exploit module.
- `msf search` checks only the first 100 results and refuses a reply over 1 MiB.
- The scope file records your own decision. It does not prove that you have permission.
- `status` warns when the Ollama server runs but no model is installed. It checks only that some model exists, not that it is `qwen3:4b`.
- The AI text can be wrong. It can state wrong counts, mix up findings shown with findings found, and call a service clean when it was never checked. The facts block above it is counted by code. Treat the AI text as a reading aid, not as proof.
- The model sees only part of a large scan (up to 12 services, 8 findings and 4 notes), so its text may leave things out.
- The model name `qwen3:4b` is fixed in the code. It is not a setting yet.
- `explain` was tried on one scan (OpenSSH and CUPS on the development machine) in five runs. Other scans have not been tested.
- Tested only on Ubuntu 24.04 with Python 3.12.
- A report is not proof that a system is secure or insecure. Findings are labelled by confidence, and professional assessment is still needed for important systems.

## Roadmap

| Version | Goal | State |
|---|---|---|
| v0.1.0 | CLI foundation: commands, status, logging, reports | Released |
| v0.2.0 | Scanning engine: scope manager and Nmap scanning with Low-Noise (default), Normal and Deep profiles. Masscan deferred | Released |
| v0.3.0 | Service intelligence: CPE names, product and version stored separately, report text that cannot forge lines | Released |
| v0.4.0 | Vulnerability intelligence: local NVD cache, version matching against CVE records, evidence with caveats, `analyse` and `analyse --save` | Released |
| v0.5.0 | Local AI: `explain` and `explain --save`, validated JSON reply, facts block counted by code | Released |
| v0.6.0 | Audit log and policy engine: hash-chained audit log, `audit verify`, policy file with a configurable range limit | Released |
| v0.7.0 | Metasploit RPC connection and read-only queries (local server, audit-logged), lab-target rule in the policy engine, `status` check | Released |
| v0.8.0 | Controlled lab validation: `validate` dry run and `--confirm`, check-only Metasploit modules, lab-target rule in use, `scan --skip-discovery` | Released |
| v1.0.0 | Stable release with SQLite storage | Planned |
| After v1.0.0 | Web application scanning with OWASP ZAP. Needs its own permission design first | Proposed |

The audit log and policy engine arrived in v0.6.0. They must stay in place before any Metasploit work. The lab-target rule arrived in v0.7.0, and v0.8.0 uses it in `validate`.

## License

MIT. See [LICENSE](LICENSE). Copyright (c) 2026 ashmit-rath.
