// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MultiSigSignOff
 * @notice Multi-party co-signing contract for CubeSat incident finality.
 *
 * Implements a threshold signature scheme (e.g. 3-of-4 or 4-of-4) across key space mission
 * stakeholders:
 *   1. Subsystem Manufacturer
 *   2. Flight Operations / Operator
 *   3. Spacecraft Underwriter / Insurer
 *   4. Launch Provider
 *
 * An incident dossier cannot be marked as RESOLVED until this contract confirms
 * that the required quorum of authorized stakeholders has signed off on-chain.
 */
contract MultiSigSignOff {
    struct Incident {
        bool registered;
        uint256 threshold;
        uint256 signatureCount;
        bool finalized;
        address[] requiredSigners;
        mapping(address => bool) isRequiredSigner;
        mapping(address => bool) hasSigned;
    }

    mapping(bytes32 => Incident) private incidents;

    event IncidentRegistered(bytes32 indexed incidentId, uint256 threshold, address[] signers);
    event SignOffRecorded(bytes32 indexed incidentId, address indexed signer, uint256 currentSignatures, uint256 threshold);
    event IncidentFinalized(bytes32 indexed incidentId, uint256 timestamp, address[] signers);

    /**
     * @notice Register an incident requiring threshold-of-N sign-offs.
     * @param incidentId 32-byte identifier for the incident
     * @param requiredSigners Array of authorized stakeholder addresses
     * @param threshold Minimum number of signatures required to finalize
     */
    function registerIncident(
        bytes32 incidentId,
        address[] memory requiredSigners,
        uint256 threshold
    ) external {
        require(incidentId != bytes32(0), "Invalid incident ID");
        require(requiredSigners.length > 0, "Must provide at least one signer");
        require(threshold > 0 && threshold <= requiredSigners.length, "Threshold must be between 1 and signers count");

        Incident storage inc = incidents[incidentId];
        require(!inc.registered, "Incident already registered");

        inc.registered = true;
        inc.threshold = threshold;
        inc.requiredSigners = requiredSigners;

        for (uint256 i = 0; i < requiredSigners.length; i++) {
            address s = requiredSigners[i];
            require(s != address(0), "Zero address not allowed as signer");
            require(!inc.isRequiredSigner[s], "Duplicate signer address");
            inc.isRequiredSigner[s] = true;
        }

        emit IncidentRegistered(incidentId, threshold, requiredSigners);
    }

    /**
     * @notice Sign off on an incident as an authorized stakeholder.
     * @param incidentId 32-byte identifier for the incident
     */
    function signOff(bytes32 incidentId) external {
        Incident storage inc = incidents[incidentId];
        require(inc.registered, "Incident not registered");
        require(inc.isRequiredSigner[msg.sender], "Caller is not a registered signer for this incident");
        require(!inc.hasSigned[msg.sender], "Signer has already signed off on this incident");

        inc.hasSigned[msg.sender] = true;
        inc.signatureCount += 1;

        emit SignOffRecorded(incidentId, msg.sender, inc.signatureCount, inc.threshold);

        if (!inc.finalized && inc.signatureCount >= inc.threshold) {
            inc.finalized = true;
            emit IncidentFinalized(incidentId, block.timestamp, inc.requiredSigners);
        }
    }

    /**
     * @notice Check whether an incident has reached finality.
     * @param incidentId 32-byte identifier for the incident
     */
    function isFinalized(bytes32 incidentId) external view returns (bool) {
        return incidents[incidentId].finalized;
    }

    /**
     * @notice Retrieve sign-off details for a registered incident.
     */
    function getIncidentSigners(bytes32 incidentId) external view returns (
        address[] memory signers,
        bool[] memory signed,
        uint256 signatureCount,
        uint256 threshold,
        bool finalized
    ) {
        Incident storage inc = incidents[incidentId];
        require(inc.registered, "Incident not registered");

        uint256 len = inc.requiredSigners.length;
        bool[] memory signedArr = new bool[](len);

        for (uint256 i = 0; i < len; i++) {
            signedArr[i] = inc.hasSigned[inc.requiredSigners[i]];
        }

        return (
            inc.requiredSigners,
            signedArr,
            inc.signatureCount,
            inc.threshold,
            inc.finalized
        );
    }

    /**
     * @notice Check if incident is registered.
     */
    function isRegistered(bytes32 incidentId) external view returns (bool) {
        return incidents[incidentId].registered;
    }
}
