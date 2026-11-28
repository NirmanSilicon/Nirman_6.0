# DocuReady 2.0 — Lane B: Identity Document Evaluation Report (Phase 4)

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Evidence:** [`evidence/comprehensive/phase4_7/phase4_7_results.json`](../../../evidence/comprehensive/phase4_7/phase4_7_results.json) (`phase4_identity`) & [`evidence/comprehensive/phase4_7/phase4_7.log`](../../../evidence/comprehensive/phase4_7/phase4_7.log)

---

## 1. Identity Document Results (Native-Vector Live Execution + Scanned Block)

| ID | Document | Classification | Fields Extracted (`DocumentExtractor`) | Limitations / Findings |
|---|---|---|---|---|
| `ID_AADHAAR_FRONT_BACK` | Aadhaar (Front+Back, Masked `XXXX XXXX 4321`) | `AADHAAR` (**PASS**) | `applicant_name` (`KAVITA SWAIN`), `dob` (`1992-08-22`), `gender` (`FEMALE`), `aadhaar_no` (`XXXXXXXX4321`) | **Address NOT extracted** (`address_extracted: false`); no QR parsing or UIDAI verification. |
| `ID_AADHAAR_MISSING_DOB` | Aadhaar (Missing DOB) | `AADHAAR` (**PASS**) | `applicant_name`, `gender`, `aadhaar_no` (`dob` absent) | Correctly omits missing `dob` rather than hallucinating. |
| `ID_AADHAAR_DEGRADED_IMG` | Aadhaar (JPEG q=30 image-only PDF) | — | `0` fields (`doc_status = "UNREADABLE"`) | Fails closed to `UNREADABLE` because Tesseract is unavailable (**Track B OCR BLOCKED**). |
| `ID_PASSPORT_SYN` | Passport (Synthetic `Z0000000`, MRZ) | `None` (`is_uncertain=True`) | Unsupported (**NOT EXTRACTED**) | Correctly rejected as unrecognized; no MRZ/nationality/expiry support. |
| `ID_PAN_SYN` | PAN Card (`ABCDE0000F`) | `None` (`is_uncertain=True`) | Unsupported (**NOT EXTRACTED**) | Only `identifier_validation.py` regex helper exists (`AB0DE1234F` -> `ABSTAIN`); not wired to `DocumentType`/`extractor.py`. |
| `ID_VOTER_SYN` | Voter ID (`SYN0000002`) | `None` (`is_uncertain=True`) | Unsupported (**NOT EXTRACTED**) | Correctly rejected as unrecognized. |
| `ID_DL_SYN` | Driving Licence (`OD02 20190000002`) | `None` (`is_uncertain=True`) | Unsupported (**NOT EXTRACTED**) | Correctly rejected as unrecognized. |
| `ID_RATION_SYN` | Ration Card (`SYN-RC-0002`) | `None` (`is_uncertain=True`) | Unsupported (**NOT EXTRACTED**) | Slot `ration_card` exists in `odisha.subhadra/pack.yaml`, but no `DocumentType`/classifier/extractor exists. |

## 2. Cross-Document Contradiction (`odisha.subhadra`)
- `PH4_CONTRA` (`ID_AADHAAR_FRONT_BACK` `"KAVITA SWAIN"` vs `ID_CONTRA_PASSBOOK` `"SUNITA ROUT"`): `readiness = "NEEDS_CHECKS"` (`RULE-SUB-NAME-01` is capped at `max_severity: REVIEW` by design).
