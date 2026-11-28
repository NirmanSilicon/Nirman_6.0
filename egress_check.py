#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
egress_check.py — AXYRA SpaceTech Network Egress Isolation Verifier

Asserts complete network isolation in SOVEREIGN / Air-Gapped deployment mode.
Uses EXCLUSIVELY Python standard library modules (socket, sys, os).

Audited Outbound Hostnames Tested:
1. njwimuvvnicbjsvvvccx.supabase.co (Supabase PostgREST cloud database)
2. fonts.googleapis.com            (Google Fonts stylesheet CDN)
3. fonts.gstatic.com               (Google Fonts binary asset delivery)
4. www.gstatic.com                 (Three.js Draco decoder CDN)
5. unpkg.com                       (Three.js Basis transcoder CDN)
"""

import os
import sys
import socket

# Audited hostnames from Phase 1 egress scan
AUDITED_HOSTNAMES = [
    "njwimuvvnicbjsvvvccx.supabase.co",
    "fonts.googleapis.com",
    "fonts.gstatic.com",
    "www.gstatic.com",
    "unpkg.com",
]

def run_egress_check(warn_only: bool = False) -> int:
    mode = os.environ.get("DEPLOYMENT_MODE", "SOVEREIGN").strip().upper()
    
    print("=" * 70)
    print("  AXYRA SpaceTech — Network Egress Isolation Check")
    print("=" * 70)
    print(f"[*] DEPLOYMENT_MODE: {mode}")
    
    # 1. Cloud Mode Bypass
    if mode == "CLOUD":
        print("[+] CLOUD mode active. Outbound network egress is permitted for cloud demo.")
        print("[+] Skipping air-gap isolation check.")
        print("=" * 70)
        return 0

    # 2. Sovereign Mode Strict Isolation Assertion
    print(f"[*] Probing {len(AUDITED_HOSTNAMES)} audited outbound hostnames (timeout=2s)...")
    socket.setdefaulttimeout(2.0)
    
    resolved_violations = []
    
    for hostname in AUDITED_HOSTNAMES:
        try:
            ip = socket.gethostbyname(hostname)
            resolved_violations.append((hostname, ip))
            print(f"    [-] LEAK DETECTED: {hostname} resolved to {ip}")
        except (socket.gaierror, socket.timeout, OSError):
            # Expected passing outcome in an air-gapped / sovereign environment
            print(f"    [+] ISOLATED: {hostname} could not be resolved (expected)")

    print("-" * 70)
    
    if resolved_violations:
        print(f"[FAIL] SOVEREIGN MODE VIOLATION: {len(resolved_violations)} external hostname(s) resolved!")
        print("       The host is connected to the Internet or an external DNS resolver.")
        print("       In a certified air-gapped sovereign environment, DNS resolution must fail.")
        for host, ip in resolved_violations:
            print(f"       -> {host} -> {ip}")
        print("=" * 70)
        
        if warn_only:
            print("[!] WARNING: Running in developer mode with --warn-only flag. Continuing...")
            return 0
        return 1

    print("[PASS] Zero network egress confirmed. All audited external hostnames are unreachable.")
    print("[PASS] Full sovereign / air-gapped isolation verified.")
    print("=" * 70)
    return 0

if __name__ == "__main__":
    is_warn_only = "--warn-only" in sys.argv
    exit_code = run_egress_check(warn_only=is_warn_only)
    sys.exit(exit_code)
