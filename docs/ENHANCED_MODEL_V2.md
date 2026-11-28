# Enhanced synthetic cashflow model v2

Completed locally on 8 November 2026. The trained artifact is `artifacts/synthetic-india-v2/model.joblib`; `/score-synthetic` now defaults to it. Statement inference works on normalized, reconciled transactions. A universal PDF uploader is still outside this ML pipeline.

This remains a synthetic demonstration. No real Indian repayment labels were acquired, no personal statement was assigned a training target, and no lending validation is claimed.

## Changes that were implemented

`src/uqual/features_v2.py` defines a versioned training/inference contract with ten dimensionless predictors: external outflow ratio, mean/minimum/ending liquidity ratios, negative-balance and low-liquidity day shares, deficit-month and low-surplus-month shares, external inflow variability, and obligations ratio. Raw payment counts, occupation, account identity, absolute income and future simulation data are excluded.

Identified own-account transfers, refunds/reversals and loan disbursements are excluded from external credits. Identified refunds offset external expenses. Unknown credits remain unidentified; the model cannot determine their origin from amounts alone. The supplied categories must be reliable. There is no trained Indian narration classifier.

The extractor checks each consecutive running-balance equation within the assessment window, preserving source order within each transaction date. A discrepancy over 0.011 currency units rejects the input. This catches many missing/misordered transactions; it cannot prove that the source statement is authentic or complete. It requires 90 observed days, 20 transactions, both directions, positive external credits and two complete calendar months. Assessment-day and later transactions are excluded.

Both candidate families, LightGBM and XGBoost, enforce explicit monotonic directions for all ten features. More outflow, variability, obligations or stressed periods cannot reduce predicted risk while other features stay fixed; larger liquidity ratios cannot increase it. These are imposed engineering assumptions, not causal findings about actual borrowers. A real intervention may change several features at once.

Eight candidate fits used the original chronological development partitions. Validation selected `xgboost-0`; a separate calibration partition fitted a positive-slope logistic calibrator. Train-only clipping, imputation, customer separation, artifact checksums, applicability abstention and SHAP explanations remain. The old test partition is reported as a development comparison because v1 results had already been inspected. It was not used for refitting, threshold selection or hyperparameter selection.

## Full data and fresh evaluation

All **20,000 source profiles and 11,083,461 transaction rows** were re-extracted. Quality rules retained 19,681 profiles; none were randomly downsampled. The predictor fitted the 10,584 training profiles; 2,949 validation, 3,016 calibration and 3,132 test profiles stayed separate. The reduced feature count does not mean reduced transaction data.

A separate seed, **20261120**, generated **3,000 additional profiles and 1,660,044 transactions**. All original cohort manifest hashes were verified. The 2,953 common eligible profiles were scored by frozen v1 and v2 models with their existing calibrators and thresholds. No evaluation label was used to fit or tune either artifact. Seed plus profile ID identifies a borrower because generator-local ID strings recur between seeds.

| Fresh same-simulator cohort | v1 | v2 |
|---|---:|---:|
| ROC-AUC | 0.9195 | 0.9227 |
| PR-AUC | 0.6081 | 0.6066 |
| Brier loss, lower is better | 0.07909 | 0.07749 |
| Recall at each validation-selected threshold | 94.10% | 93.88% |
| Precision at that threshold | 42.56% | 42.99% |
| False positives | 560 | 549 |
| Missed simulated adverse outcomes | 26 | 27 |

V2 ROC-AUC's descriptive bootstrap 95% interval is 0.9121–0.9324. The small point changes do not establish statistically significant superiority; PR-AUC and recall did not improve. Each model abstains on one additional otherwise-eligible profile for exceeding the feature-range policy; both all-eligible and applicable-only results are saved. These are independent simulated profiles from the same generator, not an independent real population. Results by simulated persona are recorded and do not establish demographic fairness.

Machine-readable evidence: `artifacts/synthetic-india-v2-evaluation/report.json`, `predictions.csv` and `controlled_sweep.csv`. Training provenance and development metrics are in `artifacts/synthetic-india-v2/metrics.json`.

## Behavioural regression results

The controlled sweep covers **504 statements**: stable, gig and irregular inflows; three opening reserve levels; and 56 expense ratios from 60% through 115% of inflow. The tests check raw model outputs even when the public scorer would abstain, so abstention cannot hide a reversal.

| Check | v1 failures | v2 failures |
|---|---:|---:|
| Higher expenses must not raise the score, 495 comparisons | 140 | 0 |
| Larger opening reserves must not lower the score, 336 comparisons | 17 | 0 |

V2 also passes feature-level direction checks, fixed-window matched same-day self-transfer invariance and proportional currency scaling. The matched-transfer example's score change fell from 0.4749 points to zero. This test assumes identified transfers with no end-of-day balance change within the same observed window; it does not cover unknown transfers or transfers that alter real liquidity timing.

The previously exposed stable-income case now gives:

| Expenses as share of external credits | v1 demo score | v2 demo score |
|---|---:|---:|
| 100% | 65.25 | 85.76 |
| 101% | 42.57 | 63.68 |
| 102% | 42.04 | 58.14 |
| 103% | 54.73 | 52.13 |
| 105% | 51.44 | 50.36 |

These are model outputs, not hand-assigned targets. A high score at breakeven cashflow shows why a synthetic index must not be read as financial health. V2's applicability policy abstains on 28 of the 504 controlled statements; v1 abstains on none. The complete sweep retains those cases and their diagnostic predictions rather than silently deleting them.

The supplied three-month normalized personal statement was rescored without training on it. Its v2 synthetic index is **47.57/100**, compared with v1's 66.66. This reflects the changed model, not a change in that person's finances or an empirically validated repayment assessment. The private output is `data/private/pdf_check/score_synthetic_v2.json`; no selected feature exceeds the training min/max ranges. Category uncertainty remains.

## Use and reproduce

The artifact is already trained on this machine. To score the previously normalized statement:

```bash
cd /Users/sahin/Documents/ChatGPT/UNIQLO
source .venv/bin/activate
uqual score-synthetic --model artifacts/synthetic-india-v2/model.joblib \
  --transactions data/private/pdf_check/transactions.parquet \
  --assessment data/private/pdf_check/assessment.json \
  --out data/private/pdf_check/score_synthetic_v2.json
```

To reproduce training, use a new artifact directory:

```bash
uqual prepare-features-v2 --source-dir data/synthetic/india-v1
uqual train synthetic_india --source-dir data/synthetic/india-v1 \
  --config configs/synthetic_india_v2.json --out artifacts/synthetic-india-v2-reproduction
```

For a larger run, preserve the full cohort:

```bash
uqual generate-synthetic --out data/synthetic/india-v2-100k \
  --borrowers 100000 --seed 20261121 --chunk-borrowers 500
uqual prepare-features-v2 --source-dir data/synthetic/india-v2-100k
uqual train synthetic_india --source-dir data/synthetic/india-v2-100k \
  --config configs/synthetic_india_v2.json --out artifacts/synthetic-india-v2-100k
```

That larger command is provided, **not executed**. More synthetic rows do not establish actual Indian accuracy.

The executed evaluation is reproducible against the frozen v1/v2 artifacts and cohort:

```bash
# Generate only if this fresh-cohort directory does not already exist:
uqual generate-synthetic --out data/synthetic/india-v2-evaluation \
  --borrowers 3000 --seed 20261120 --chunk-borrowers 500
uqual prepare-features-v2 --source-dir data/synthetic/india-v2-evaluation
python scripts/evaluate_v2.py
pytest -q
ruff check src tests scripts
```

For new examples near 80, use `python scripts/explore_scores.py --model artifacts/synthetic-india-v2/model.joblib --out artifacts/v2-exploration-new`. These deliberately selected examples are not an accuracy benchmark.

The API loads v2 at startup, so restart an existing server. `UQUAL_SYNTHETIC_MODEL_PATH` remains available for an explicit override. `/score-synthetic` requires the existing bearer key and normalized JSON schema; it does not accept arbitrary PDF bytes. Integration checks confirmed API/CLI score agreement, 401 without authorization, 422 for a broken ledger, and continued `out_of_domain` abstention on the normal source-data `/score` route. All 30 tests and Ruff checks passed.

The next substantive validation step still requires actual authorized Indian transactions linked to later repayment outcomes. V2 improves tested engineering consistency and simulator prediction; it does not replace bureau scores or establish production lending readiness.
