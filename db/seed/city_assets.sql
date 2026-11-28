-- Seed initial synthetic district assets for AFTERSHOCK PostGIS
-- Matches district_v1 fixtures and 3D synthetic grid

INSERT INTO assets (asset_id, name, type, geom, properties) VALUES
('P-01', 'Substation Alpha', 'substation', ST_SetSRID(ST_MakePoint(-73.985, 40.748), 4326), '{"voltage": "138kV", "capacity_mw": 120}'::jsonb),
('P-02', 'Substation Beta', 'substation', ST_SetSRID(ST_MakePoint(-73.975, 40.755), 4326), '{"voltage": "138kV", "capacity_mw": 95}'::jsonb),
('W-01', 'Water Treatment Facility 1', 'water_treatment', ST_SetSRID(ST_MakePoint(-73.990, 40.740), 4326), '{"capacity_mgd": 45}'::jsonb),
('W-02', 'River Pumping Station', 'pumping_station', ST_SetSRID(ST_MakePoint(-73.980, 40.735), 4326), '{"capacity_mgd": 30}'::jsonb),
('H-01', 'Metropolitan Hospital', 'hospital', ST_SetSRID(ST_MakePoint(-73.982, 40.750), 4326), '{"beds": 450, "trauma_level": 1}'::jsonb),
('H-02', 'East District Clinic', 'hospital', ST_SetSRID(ST_MakePoint(-73.970, 40.758), 4326), '{"beds": 120, "trauma_level": 3}'::jsonb),
('T-01', 'Telecom Tower North', 'telecom_tower', ST_SetSRID(ST_MakePoint(-73.988, 40.760), 4326), '{"coverage_radius_km": 4.5}'::jsonb),
('T-02', 'Telecom Tower Central', 'telecom_tower', ST_SetSRID(ST_MakePoint(-73.978, 40.745), 4326), '{"coverage_radius_km": 5.0}'::jsonb),
('R-01', 'Main River Suspension Bridge', 'bridge', ST_SetSRID(ST_MakePoint(-73.984, 40.738), 4326), '{"span_meters": 350, "lanes": 4}'::jsonb)
ON CONFLICT (asset_id) DO NOTHING;
