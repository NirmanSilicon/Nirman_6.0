// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface for snarkjs-exported Groth16 Solidity verifier (CausalVerdictVerifier).
 */
interface ICausalVerdictVerifier {
    function verifyProof(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[6] calldata input
    ) external view returns (bool r);
}

/**
 * @title ParametricPolicy
 * @notice Automated, smart-contract-triggered parametric insurance policy for CubeSat missions.
 *
 * Verifies a Groth16 Zero-Knowledge proof that the causal reasoning engine identified
 * a critical subsystem fault cascade with confidence exceeding the policy's threshold,
 * without disclosing proprietary telemetry or subsystem internal states.
 */
contract ParametricPolicy {
    address public immutable policyholder;
    address public immutable insurer;
    uint256 public immutable payoutAmount;
    bool public immutable requiredVerdict;
    uint256 public immutable minConfidenceScaled;
    address public immutable verifierContract;

    bool public claimed;
    uint256 public claimTimestamp;
    bytes32 public claimCommitment;

    event PolicyFunded(address indexed funder, uint256 amount, uint256 totalBalance);
    event ClaimPaid(bytes32 indexed commitment, uint256 amount, uint256 timestamp, address recipient);

    modifier onlyInsurer() {
        require(msg.sender == insurer, "Only insurer can call this");
        _;
    }

    constructor(
        address _policyholder,
        address _insurer,
        uint256 _payoutAmount,
        bool _requiredVerdict,
        uint256 _minConfidenceScaled,
        address _verifierContract
    ) {
        require(_policyholder != address(0), "Invalid policyholder address");
        require(_insurer != address(0), "Invalid insurer address");
        require(_verifierContract != address(0), "Invalid verifier address");
        require(_payoutAmount > 0, "Payout must be > 0");

        policyholder = _policyholder;
        insurer = _insurer;
        payoutAmount = _payoutAmount;
        requiredVerdict = _requiredVerdict;
        minConfidenceScaled = _minConfidenceScaled;
        verifierContract = _verifierContract;
    }

    /**
     * @notice Fund the escrow balance. Typically called by the underwriter / insurer.
     */
    function fund() external payable {
        require(msg.value > 0, "Must fund with non-zero amount");
        emit PolicyFunded(msg.sender, msg.value, address(this).balance);
    }

    /**
     * @notice Submit a ZK-proven incident claim for automated payout.
     * @param a Groth16 proof point A
     * @param b Groth16 proof point B
     * @param c Groth16 proof point C
     * @param publicSignals Public signals:
     *        [0] = verdict_confirmed (1 or 0)
     *        [1] = w_temporal
     *        [2] = w_dependency
     *        [3] = w_intermediate
     *        [4] = threshold
     *        [5] = private_input_commitment
     */
    function submitClaim(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[6] calldata publicSignals
    ) external {
        require(!claimed, "Policy already claimed");
        require(address(this).balance >= payoutAmount, "Escrow underfunded");

        // 1. Verify Groth16 proof via CausalVerdictVerifier
        bool proofValid = ICausalVerdictVerifier(verifierContract).verifyProof(a, b, c, publicSignals);
        require(proofValid, "Invalid ZK proof: verification rejected by circuit verifier");

        // 2. Validate public signals against policy terms
        uint256 proofVerdict = publicSignals[0];
        uint256 proofThreshold = publicSignals[4];
        bytes32 commitment = bytes32(publicSignals[5]);

        bool verdictBool = (proofVerdict == 1);
        require(verdictBool == requiredVerdict, "Verdict does not satisfy policy criteria");
        require(proofThreshold >= minConfidenceScaled, "Threshold below policy minimum confidence requirement");

        // 3. Mark claimed and execute transfer
        claimed = true;
        claimTimestamp = block.timestamp;
        claimCommitment = commitment;

        (bool success, ) = policyholder.call{value: payoutAmount}("");
        require(success, "Payout transfer to policyholder failed");

        emit ClaimPaid(commitment, payoutAmount, block.timestamp, policyholder);
    }

    /**
     * @notice Query policy terms and live escrow status.
     */
    function getPolicyStatus() external view returns (
        uint256 escrowBalance,
        bool isClaimed,
        uint256 payout,
        bool triggerVerdict,
        uint256 minConfidence,
        address holder,
        address underwriter,
        uint256 claimedAt,
        bytes32 commitment
    ) {
        return (
            address(this).balance,
            claimed,
            payoutAmount,
            requiredVerdict,
            minConfidenceScaled,
            policyholder,
            insurer,
            claimTimestamp,
            claimCommitment
        );
    }

    receive() external payable {
        emit PolicyFunded(msg.sender, msg.value, address(this).balance);
    }
}
