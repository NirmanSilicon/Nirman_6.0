# UQUAL research model: synthetic_india

**SYNTHETIC DEMONSTRATION ONLY.** No real Indian repayment outcomes were used. Reported accuracy is against simulator labels, not real people. Scores must never be used for credit decisions.

Selected model: xgboost-0. Feature contract: cashflow-monotone-v2.

Evaluation role: Synthetic development partitions; final independent-seed evaluation is separate. No real Indian validation..

Target: Simulated 3 consecutive missed hypothetical EMI payments within 6 future months.

Test ROC-AUC: 0.9181; bootstrap 95% interval: {'lower_95': 0.9083992905720264, 'upper_95': 0.9284238176474708, 'valid_resamples': 500}.
Test PR-AUC: 0.5749; Brier: 0.0805.

This is a research artifact, not an Indian credit score or a validated Financial Behaviour Index. Independent Indian validation has not been established. Metrics are measured on this source population only. AUC measures ranking, not individual probability accuracy. Inspect calibration and operating-point errors. The risk index is only 100 × (1 − estimated source-target probability); it is not a bureau score.

Berka: completed-loan selection creates survivorship/selection effects; loan horizons vary. A million transactions do not create a million independent loan labels. Credit labels are limited. Unknown credits can include transfers/refunds/borrowing; known-income features exclude them, but gross cashflow predictors can still be affected. Loan-day and future transactions are excluded.

GMSC/Home Credit are separate tabular benchmarks with different features and targets. Do not deploy those artifacts on bank-statement features. SHAP explains raw model contributions, not causality or calibrated probability changes. No fairness certification, causal improvement guarantee or production approval is implied.

Read metrics.json, split_assignments.csv, candidate_results.json and test_predictions.csv for exact sample counts, settings and outcomes. Calibration and final test records were not used to fit the predictor.

- Trained and evaluated only on generated transactions and simulated outcomes; metrics measure generator recovery
- No Indian statement-linked repayment validation or fairness approval
