import type { HospitalFacility } from '../types/hospital.ts';

export const PRIMARY_HOSPITAL_FACILITY_ID = 'HOSP-KHORDHA-DH';

export const HOSPITAL_FACILITIES: HospitalFacility[] = [
  {
    id: 'HOSP-KHORDHA-DH',
    name: 'District Hospital Khordha',
    shortName: 'District Hospital Khordha',
    facilityCode: 'HOSP-KHORDHA-DH',
    district: 'Khordha',
    state: 'Odisha',
    tier: 'District Referral & Maternal Care Hospital',
    obgynBeds: 120,
    emergencyDeskPhone: '+91 6755 220 108',
    catchmentBlocks: ['Khorda Village', 'Village Rampur', 'Rampur PHC', 'Jatni', 'Khordha Sadar'],
  },
  {
    id: 'fac-ch-bbsr',
    name: 'Capital Hospital, Bhubaneswar',
    shortName: 'Capital Hospital',
    facilityCode: 'OD-KH-CH-002',
    district: 'Khordha',
    state: 'Odisha',
    tier: 'District Referral & Maternal Care Hospital',
    obgynBeds: 140,
    emergencyDeskPhone: '+91 674 239 1983',
    catchmentBlocks: ['Bhubaneswar Urban', 'Balianta', 'Jatni', 'Balipatna'],
  },
  {
    id: 'fac-rampur-phc',
    name: 'Rampur Primary Health Centre (PHC)',
    shortName: 'Rampur PHC',
    facilityCode: 'OD-KH-PHC-003',
    district: 'Khordha',
    state: 'Odisha',
    tier: 'Primary Health & Antenatal Centre',
    obgynBeds: 24,
    emergencyDeskPhone: '+91 6755 224 102',
    catchmentBlocks: ['Village Rampur Sector 3 East', 'Village Rampur Sector 4 North', 'Khorda Village Ward 2'],
  },
];

const KHORDHA_DH_ALIASES = new Set([
  'hosp-khordha-dh',
  'fac-dh-khordha',
  'od-kh-dh-001',
  'district hospital khordha',
]);

export function findFacilityByIdentifier(identifier: string | undefined | null): HospitalFacility | undefined {
  if (!identifier || !identifier.trim()) return undefined;
  const trimmed = identifier.trim();
  const lower = trimmed.toLowerCase();
  const direct = HOSPITAL_FACILITIES.find(
    (f) =>
      f.id.toLowerCase() === lower ||
      f.facilityCode.toLowerCase() === lower ||
      f.name.toLowerCase() === lower
  );
  if (direct) return direct;
  if (KHORDHA_DH_ALIASES.has(lower)) {
    return HOSPITAL_FACILITIES[0];
  }
  return undefined;
}

