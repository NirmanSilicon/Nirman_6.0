pragma circom 2.0.0;

/*
 * causal_verdict.circom
 *
 * AXYRA Zero-Knowledge Causal Scoring Verification Circuit
 *
 * PROVES:
 *   1. That a specific causal verdict (verdict_confirmed = 1 or 0) was produced
 *      by evaluating the linear causal scoring formula:
 *         confidence = w_temporal * s_temporal + w_dependency * s_dependency + w_intermediate * s_intermediate
 *      without disclosing the private telemetry feature scores (s_temporal, s_dependency, s_intermediate).
 *   2. That the evaluation is cryptographically bound to a pre-committed set of
 *      telemetry features via Poseidon(s_temporal, s_dependency, s_intermediate, salt) == private_input_commitment.
 *
 * FIXED-POINT SCALING FACTOR:
 *   Circom operates over the bn128 scalar field without native IEEE 754 float support.
 *   All float values in [0.0, 1.0] are scaled by 1,000,000 (10^6) and rounded to integers:
 *     scaled_val = round(float_val * 1,000,000)
 *   Weights sum to ~1,000,000. Maximum product is ~10^12, which fits comfortably within 64 bits (< 2^64).
 *   Division by 10^6 is computed via quotient and remainder with a strict range check.
 */

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template CausalVerdict() {
    // -------------------------------------------------------------------------
    // Private Inputs (Hidden telemetry scores and randomizing salt)
    // -------------------------------------------------------------------------
    signal input s_temporal;       // Scaled temporal precedence score (0 to 1,000,000)
    signal input s_dependency;     // Scaled dependency path strength (0 to 1,000,000)
    signal input s_intermediate;   // Scaled intermediate event match score (0 to 1,000,000)
    signal input salt;             // Cryptographic blinding salt (random field element)

    // -------------------------------------------------------------------------
    // Public Inputs (Transparent model parameters & binding commitment)
    // -------------------------------------------------------------------------
    signal input w_temporal;                // Calibrated temporal weight (scaled by 10^6)
    signal input w_dependency;              // Calibrated dependency weight (scaled by 10^6)
    signal input w_intermediate;            // Calibrated intermediate weight (scaled by 10^6)
    signal input threshold;                 // Minimum required confidence threshold (scaled by 10^6)
    signal input private_input_commitment;  // Poseidon(s_t, s_d, s_i, salt)

    // -------------------------------------------------------------------------
    // Public Output
    // -------------------------------------------------------------------------
    signal output verdict_confirmed;        // 1 if confidence >= threshold, else 0

    // -------------------------------------------------------------------------
    // 1. Cryptographic Commitment Constraint
    // Verify that the private inputs match the previously published Poseidon hash.
    // -------------------------------------------------------------------------
    component hasher = Poseidon(4);
    hasher.inputs[0] <== s_temporal;
    hasher.inputs[1] <== s_dependency;
    hasher.inputs[2] <== s_intermediate;
    hasher.inputs[3] <== salt;

    hasher.out === private_input_commitment;

    // -------------------------------------------------------------------------
    // 2. Fixed-Point Linear Combination
    // Confidence raw = w_T * s_T + w_D * s_D + w_I * s_I (scale ~ 10^12)
    // -------------------------------------------------------------------------
    signal t_prod;
    signal d_prod;
    signal i_prod;

    t_prod <== w_temporal * s_temporal;
    d_prod <== w_dependency * s_dependency;
    i_prod <== w_intermediate * s_intermediate;

    signal scaled_sum;
    scaled_sum <== t_prod + d_prod + i_prod;

    // -------------------------------------------------------------------------
    // 3. Witness-Computed Rescaling with Range-Checked Remainder
    // Division by SCALE (1,000,000) using circom quotient + remainder constraint:
    //   scaled_sum = confidence * 1,000,000 + remainder
    //   0 <= remainder < 1,000,000
    // -------------------------------------------------------------------------
    var SCALE = 1000000;

    signal confidence;
    signal remainder;

    confidence <-- scaled_sum \ SCALE;
    remainder <-- scaled_sum % SCALE;

    // Constraint: division identity
    scaled_sum === confidence * SCALE + remainder;

    // Constrain remainder < SCALE to ensure unique decomposition and prevent overflow
    component remCheck = LessThan(64);
    remCheck.in[0] <== remainder;
    remCheck.in[1] <== SCALE;
    remCheck.out === 1;

    // -------------------------------------------------------------------------
    // 4. Threshold Comparison
    // verdict_confirmed = 1 if confidence >= threshold else 0
    // -------------------------------------------------------------------------
    component geq = GreaterEqThan(64);
    geq.in[0] <== confidence;
    geq.in[1] <== threshold;

    verdict_confirmed <== geq.out;
}

component main {public [w_temporal, w_dependency, w_intermediate, threshold, private_input_commitment]} = CausalVerdict();
