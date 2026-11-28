# UQUAL scoring model: judge demo evidence

The app contains one financial statement assessment journey. It displays two **different** outputs:

1. **Behaviour Index (0–100):** a transparent weighted description of the statement's observed cashflow. It is calculated from confirmed income, spending, deficit months, obligations and savings. It is not trained ML or a bureau credit score.
2. **Research Model Index (0–100):** `100 × (1 − calibrated simulated stress probability)`. This comes from a trained, monotonic XGBoost classifier. A higher index means lower estimated *simulated* stress. This is not a validated probability of real default.

## What was trained

- Development source: 20,000 generated Indian-style borrower profiles and 11,083,461 generated transaction rows. These produce 19,681 eligible borrower-level labels, **not 11 million independent training samples**.
- Target: a simulated sequence of three missed hypothetical EMI payments within the following six months. It is a simulator label, not observed repayment history.
- Temporal split: 10,584 training profiles, 2,949 validation, 3,016 calibration, 3,132 untouched final test.
- Candidates: four LightGBM and four XGBoost configurations compared on validation ROC AUC. Selected candidate: XGBoost with 400 trees, maximum depth 5, learning rate 0.07, minimum child weight 5 and monotonic constraints.
- Ten input features: external outflow ratio, mean/minimum/ending liquidity ratios, negative-balance share, low-liquidity share, deficit-month share, low-surplus-month share, inflow variation and obligations ratio. The constraints prevent the expected direction of an individual feature from reversing when other inputs are fixed.
- Separate probability calibration fit only on the calibration partition. No test outcomes were used for fitting or threshold selection.

## Measured performance

| Cohort | Profiles | ROC AUC | PR AUC | Brier | Precision | Recall |
|---|---:|---:|---:|---:|---:|---:|
| Temporal test, held out | 3,132 | 0.9181 | 0.5749 | 0.0805 | 0.4194 | 0.9402 |
| Different seed, same simulator | 2,953 | 0.9227 | 0.6066 | 0.0775 | 0.4299 | 0.9388 |

The final test base outcome rate is 14.94%; its constant prediction baseline has ROC AUC 0.5, PR AUC 0.1494 and Brier 0.1271. The test ROC AUC 95% bootstrap interval is 0.9084–0.9284. Precision and recall are at the frozen research threshold, not at a lending policy threshold.

The [benchmark figure](model_benchmark.png) contains actual train and validation booster log loss, same-simulator benchmark bars, and independent-seed ROC and precision–recall curves. [Calibration](calibration.png), [round-level loss data](learning_curve.csv), [independent predictions](independent_predictions.csv), and [machine-readable metrics](benchmark.json) make the results reproducible. The train loss falls to about 0.236 while validation loss bottoms near 0.241 and rises slightly by tree 400. This is mild overfitting; the plot should be shown, not hidden. The selection criterion was validation ROC AUC, so the 400-tree model is not claimed to minimize validation log loss.

## Claim boundaries for the pitch

A credible line is: **“We trained and calibrated a constrained gradient-boosted scoring model on borrower profiles derived from more than 11 million simulated transactions, then measured it on both a temporal holdout and a separate-seed cohort. We have not yet validated it against real Indian repayment outcomes.”** The fitted model is about 99 KB, so calling it a “large model” would be misleading. Its strength is the measured pipeline, explicit feature contract, calibration and explainability, not model file size.

The different-seed cohort comes from the **same generator**. It tests reproducibility across simulated samples, not real-world generalization. Actual financial use requires consented statement-linked repayment outcomes, population and fairness checks, prospective validation, security review and a lender-owned decision policy. The app should be demonstrated as research decision support only.

## Reproduce

From the repository root:

```sh
PYTHONPATH=src .venv/bin/python -m uqual.cli train synthetic_india --source-dir data/synthetic/india-v1 --config configs/synthetic_india_v2.json --out artifacts/synthetic-india-v2-retrained-20261129
PYTHONPATH=src .venv/bin/python scripts/report_scoring_model.py
```
