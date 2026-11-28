# UQUAL research model: berka

Selected model: lightgbm-2. Feature contract: cashflow-v1.

Target: Completed loan ended with unpaid debt (B) versus repaid (A).

Test ROC-AUC: 0.8772; bootstrap 95% interval: {'lower_95': 0.75, 'upper_95': 0.9736842105263158, 'valid_resamples': 477}.
Test PR-AUC: 0.2889; Brier: 0.0739.

This is a research artifact, not an Indian credit score or a validated Financial Behaviour Index. Independent Indian validation has not been established. Metrics are measured on this source population only. AUC measures ranking, not individual probability accuracy. Inspect calibration and operating-point errors. The risk index is only 100 × (1 − estimated source-target probability); it is not a bureau score.

Berka: completed-loan selection creates survivorship/selection effects; loan horizons vary. A million transactions do not create a million independent loan labels. Credit labels are limited. Unknown credits can include transfers/refunds/borrowing; known-income features exclude them, but gross cashflow predictors can still be affected. Loan-day and future transactions are excluded.

GMSC/Home Credit are separate tabular benchmarks with different features and targets. Do not deploy those artifacts on bank-statement features. SHAP explains raw model contributions, not causality or calibrated probability changes. No fairness certification, causal improvement guarantee or production approval is implied.

Read metrics.json, split_assignments.csv, candidate_results.json and test_predictions.csv for exact sample counts, settings and outcomes. Calibration and final test records were not used to fit the predictor.

- Fewer than 30 bad outcomes in final holdout: very high statistical uncertainty
- No Indian statement-linked repayment validation or fairness approval

Evaluation role: Development comparison on a previously inspected source holdout; not new independent or Indian validation.
