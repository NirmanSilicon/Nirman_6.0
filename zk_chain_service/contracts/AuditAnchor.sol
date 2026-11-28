// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AuditAnchor
 * @notice On-chain immutable cryptographic anchor for AXYRA AI model drift governance
 *         and Master Incident Report dossiers.
 *
 * Prevents retroactive history rewriting: Even if a local adversary alters the JSONL
 * audit chain or local database, the on-chain anchor guarantees third-party provability
 * of the original cryptographic state.
 */
contract AuditAnchor {
    // Maps entry SHA-256 hash (bytes32) to block timestamp
    mapping(bytes32 => uint256) public anchoredAt;

    // Maps entry hash to submitter address
    mapping(bytes32 => address) public submitters;

    // Maps entry hash to descriptive event type
    mapping(bytes32 => string) public eventTypes;

    event Anchored(
        bytes32 indexed entryHash,
        string eventType,
        uint256 timestamp,
        address submitter
    );

    /**
     * @notice Anchor an audit log or dossier hash on-chain.
     * @param entryHash 32-byte hash of the record or audit entry
     * @param eventType Description of the event (e.g., 'drift_check_completed', 'incident_dossier_finalized')
     */
    function anchor(bytes32 entryHash, string calldata eventType) external {
        require(entryHash != bytes32(0), "Invalid entry hash");
        require(anchoredAt[entryHash] == 0, "Entry already anchored");

        anchoredAt[entryHash] = block.timestamp;
        submitters[entryHash] = msg.sender;
        eventTypes[entryHash] = eventType;

        emit Anchored(entryHash, eventType, block.timestamp, msg.sender);
    }

    /**
     * @notice Check whether an entry hash is anchored and retrieve its timestamp.
     * @param entryHash 32-byte hash to verify
     * @return isAnchored_ True if anchored on-chain
     * @return timestamp_ The block timestamp when it was anchored
     */
    function isAnchored(bytes32 entryHash) external view returns (bool isAnchored_, uint256 timestamp_) {
        uint256 ts = anchoredAt[entryHash];
        return (ts > 0, ts);
    }
}
