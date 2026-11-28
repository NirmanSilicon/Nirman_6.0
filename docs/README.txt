# Measured acceleration traces

Three 10 second recordings taken with phyphox on an Android phone on 29 November 2026, using the
Acceleration with g sensor, which reads the raw accelerometer including gravity.

| File | What it is |
|---|---|
| traces/still.xlsx | Phone flat on a table, untouched. The noise floor. |
| traces/impact.xlsx | Phone flat on the table, a heavy book dropped on the table beside it. |
| traces/shake.xlsx | Phone held in the hand and shaken hard. |

ashvin_accelerometer_evidence.png plots all three against the 3.8 g pothole threshold.

Findings: the still trace has a standard deviation of 0.003 g and every sample inside 0.02 g, so the
3.8 g threshold sits far above the noise. A table impact alone reaches 4.95 g, which crosses that
threshold, and that is why detection requires a second condition, speed falling to zero. A violent
shake peaks at 7.40 g, below the 18.4 g crash threshold.

These are hand and table tests on a phone. They are not a road test, and they are not the MPU6050.
