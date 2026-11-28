export interface TelemetryFragment {
  id: string;
  subsystemId: string;
  subsystemName: string;
  timestamp: string;
  timeOffsetSec: number;
  alarmCode: string;
  alarmTitle: string;
  telemetryLine: string;
  rawReading: string;
  nominalRange: string;
  evidenceNote: string;
  confidence: number;
  isOrigin: boolean;
  preventedByIntervention: boolean;
  preventionDetail?: string;
  causalParentId?: string;
  coordinates: {
    incidentX: number;
    incidentY: number;
    traceX: number;
    traceY: number;
    rotation: number;
  };
}

export interface CausalEdge {
  fromId: string;
  toId: string;
  relationType: string;
  evidenceSummary: string;
  delayMs: number;
}

export interface MissionMetadata {
  missionId: string;
  craftClass: string;
  orbitProfile: string;
  incidentTimestamp: string;
  investigationRef: string;
  classification: string;
}
