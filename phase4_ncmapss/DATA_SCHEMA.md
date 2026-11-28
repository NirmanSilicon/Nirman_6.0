# N-CMAPSS DS05 data schema to verify against the selected HDF5 file

| HDF5 array | Meaning | Columns / labels | Default role |
|---|---|---|---|
| `W_*` | Flight scenario descriptors | `alt`, `Mach`, `TRA`, `T2` | Candidate inputs (4) |
| `X_s_*` | Measured physical channels | `Wf`, `Nf`, `Nc`, `T24`, `T30`, `T48`, `T50`, `P15`, `P2`, `P21`, `P24`, `Ps30`, `P40`, `P50` | Candidate inputs (14) |
| `X_v_*` | Virtual/model-derived channels | Read from HDF5 variable metadata | Excluded from initial observable input baseline |
| `T_*` | Hidden model-health parameters | Read from HDF5 variable metadata | Excluded to avoid target leakage |
| `Y_*` | Remaining useful life | RUL in cycles | Prediction target only |
| `A_*` | Auxiliary data | `unit`, `cycle`, `Fc`, `hs` | Grouping / metadata / evaluation only |

The `dev` suffix is the development split and `test` is held out. The inspector reads variable names and engine IDs from the HDF5 file, checks row alignment and finite values, and verifies that development and test engine IDs do not overlap. It deliberately avoids hard-coding an engine split from another N-CMAPSS subset.

**Feature policy:** the initial observable input set is `W + X_s` (18 channels if the standard 4+14 layout is confirmed by inspection). Never include `Y` (RUL), `T` (hidden model health parameters), or `A` metadata as ordinary predictors. Treat `X_v` as virtual/model-derived channels and exclude them from the initial physical-sensor baseline.
