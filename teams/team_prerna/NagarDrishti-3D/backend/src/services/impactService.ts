export interface ScenarioModelInput {
  model_type:
    | 'road_widening'
    | 'new_road'
    | 'park'
    | 'residential_building'
    | 'commercial_building'
    | 'hospital'
    | 'school'
    | 'drainage'
    | 'public_transport';
  label: string;
  width_m: number;
  length_m: number;
  height_m: number;
  scale_x: number;
  scale_y: number;
  scale_z: number;
}

export interface CostRatesInput {
  road_per_sqm_inr: number;
  park_per_sqm_inr: number;
  building_per_sqm_inr: number;
  drainage_per_m_inr: number;
  transit_unit_inr: number;
}

export interface FacilityDistance {
  facility_type: string;
  facility_name: string;
  distance_m: number;
  source_name: string;
}

export interface ImpactReport {
  is_simulation: true;
  disclaimer: string;
  existing_road_area_sqm: number;
  proposed_additional_road_area_sqm: number;
  total_proposed_road_area_sqm: number;
  existing_green_area_sqm: number;
  proposed_green_space_change_sqm: number;
  total_proposed_green_area_sqm: number;
  proposed_built_up_footprint_sqm: number;
  proposed_drainage_length_m: number;
  additional_land_requirement_sqm: number;
  estimated_cost_inr: number;
  cost_breakdown: Array<{ category: string; quantity: number; unit: string; unit_rate_inr: number; subtotal_inr: number }>;
  nearest_facilities: FacilityDistance[];
  unavailable_data_notices: string[];
}

export const DEFAULT_COST_RATES: CostRatesInput = {
  road_per_sqm_inr: 3200,
  park_per_sqm_inr: 1400,
  building_per_sqm_inr: 26000,
  drainage_per_m_inr: 6500,
  transit_unit_inr: 4500000,
};

export function calculateImpactAnalysis(params: {
  existingRoadAreaSqm: number;
  existingGreenAreaSqm: number;
  models: ScenarioModelInput[];
  costRates?: Partial<CostRatesInput>;
  nearestFacilities?: FacilityDistance[];
}): ImpactReport {
  const rates: CostRatesInput = { ...DEFAULT_COST_RATES, ...(params.costRates || {}) };

  let addedRoadArea = 0;
  let addedParkArea = 0;
  let builtUpFootprint = 0;
  let builtUpGrossFloorArea = 0;
  let drainageLength = 0;
  let transitUnits = 0;

  for (const m of params.models) {
    const effW = Math.max(0.1, Number(m.width_m) * Number(m.scale_x || 1));
    const effL = Math.max(0.1, Number(m.length_m) * Number(m.scale_z || 1));
    const effH = Math.max(0.5, Number(m.height_m) * Number(m.scale_y || 1));
    const footprint = effW * effL;

    if (m.model_type === 'road_widening' || m.model_type === 'new_road') {
      addedRoadArea += footprint;
    } else if (m.model_type === 'park') {
      addedParkArea += footprint;
    } else if (m.model_type === 'drainage') {
      drainageLength += Math.max(effW, effL);
    } else if (m.model_type === 'public_transport') {
      transitUnits += 1;
      builtUpFootprint += footprint;
    } else {
      // Buildings: approximate 3m per floor for gross floor area cost estimate
      const floors = Math.max(1, Math.round(effH / 3));
      builtUpFootprint += footprint;
      builtUpGrossFloorArea += footprint * floors;
    }
  }

  const roadCost = Math.round(addedRoadArea * rates.road_per_sqm_inr);
  const parkCost = Math.round(addedParkArea * rates.park_per_sqm_inr);
  const buildingCost = Math.round(builtUpGrossFloorArea * rates.building_per_sqm_inr);
  const drainageCost = Math.round(drainageLength * rates.drainage_per_m_inr);
  const transitCost = Math.round(transitUnits * rates.transit_unit_inr);

  const costBreakdown = [
    { category: 'Roads & Widening', quantity: Number(addedRoadArea.toFixed(1)), unit: 'sq.m', unit_rate_inr: rates.road_per_sqm_inr, subtotal_inr: roadCost },
    { category: 'Parks & Green Cover', quantity: Number(addedParkArea.toFixed(1)), unit: 'sq.m', unit_rate_inr: rates.park_per_sqm_inr, subtotal_inr: parkCost },
    { category: 'Buildings (Est. GFA)', quantity: Number(builtUpGrossFloorArea.toFixed(1)), unit: 'sq.m', unit_rate_inr: rates.building_per_sqm_inr, subtotal_inr: buildingCost },
    { category: 'Drainage Channels', quantity: Number(drainageLength.toFixed(1)), unit: 'm', unit_rate_inr: rates.drainage_per_m_inr, subtotal_inr: drainageCost },
    { category: 'Public Transport Hubs', quantity: transitUnits, unit: 'units', unit_rate_inr: rates.transit_unit_inr, subtotal_inr: transitCost },
  ].filter((row) => row.quantity > 0);

  const additionalLandRequirement = addedRoadArea + addedParkArea + builtUpFootprint;

  return {
    is_simulation: true,
    disclaimer: 'SIMULATION ONLY — NOT AN APPROVED GOVERNMENT PLAN. Cost figures use configurable unit rates for planning discussion.',
    existing_road_area_sqm: Number(params.existingRoadAreaSqm.toFixed(1)),
    proposed_additional_road_area_sqm: Number(addedRoadArea.toFixed(1)),
    total_proposed_road_area_sqm: Number((params.existingRoadAreaSqm + addedRoadArea).toFixed(1)),
    existing_green_area_sqm: Number(params.existingGreenAreaSqm.toFixed(1)),
    proposed_green_space_change_sqm: Number(addedParkArea.toFixed(1)),
    total_proposed_green_area_sqm: Number((params.existingGreenAreaSqm + addedParkArea).toFixed(1)),
    proposed_built_up_footprint_sqm: Number(builtUpFootprint.toFixed(1)),
    proposed_drainage_length_m: Number(drainageLength.toFixed(1)),
    additional_land_requirement_sqm: Number(additionalLandRequirement.toFixed(1)),
    estimated_cost_inr: roadCost + parkCost + buildingCost + drainageCost + transitCost,
    cost_breakdown: costBreakdown,
    nearest_facilities: params.nearestFacilities || [],
    unavailable_data_notices: [
      'Cadastral parcel ownership & intersecting building footprints are not loaded for this boundary unless uploaded by an Administrator.',
      'Dynamic traffic flow simulation (SUMO) and hydrodynamic stormwater flood modeling are future scope and are NOT computed here.',
      'Geotechnical soil bearing capacity and utility relocation costs are excluded from unit-rate estimates.',
    ],
  };
}
