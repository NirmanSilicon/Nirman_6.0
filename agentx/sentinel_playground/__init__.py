"""SENTINEL Attack Playground & Side-by-Side Guard Comparator."""

from .engine import (
    ATTACK_TEMPLATES,
    compare_attack,
    get_template,
    run_attack_mode,
)
from .extractors import (
    extract_from_csv,
    extract_from_html,
    extract_from_image,
    extract_from_pdf,
)
from .vault import (
    SAMPLE_PDF_SPECS,
    SANDBOX_VAULT_DIR,
    ensure_sample_pdfs_on_disk,
    ensure_sandbox_vault,
    generate_sample_attack_pdf,
    list_vault_folders,
    read_vault_file,
)

__all__ = [
    "ATTACK_TEMPLATES",
    "SAMPLE_PDF_SPECS",
    "SANDBOX_VAULT_DIR",
    "compare_attack",
    "ensure_sample_pdfs_on_disk",
    "ensure_sandbox_vault",
    "extract_from_csv",
    "extract_from_html",
    "extract_from_image",
    "extract_from_pdf",
    "generate_sample_attack_pdf",
    "get_template",
    "list_vault_folders",
    "read_vault_file",
    "run_attack_mode",
]
