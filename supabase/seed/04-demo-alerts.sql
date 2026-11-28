-- Seed 04: Demo Alerts (Optional initial demo cases)
-- Blueprint §7.7: "Seed only directory data. Demo alerts are generated dynamically during rehearsals."
-- This file provides clean reference scenarios for automated tests.

-- Scenario 1: Active Cardiac Case (GH-4F7K)
INSERT INTO alerts (
    id, temp_id, access_token, facility_id, patient_name, patient_age, patient_sex,
    flags, capability_req, playbook_key, eta_minutes, state, created_at
) VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'GH-4F7K',
    'f0000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Priya Mohapatra', 62, 'F',
    '{"chest_pain": true, "sweating": true, "breathless": true}'::jsonb,
    ARRAY['ecg', 'defib', 'cardiac_team', 'oxygen'],
    'cardiac',
    8,
    'SENT',
    timezone('utc', now() - INTERVAL '30 seconds')
)
ON CONFLICT (id) DO NOTHING;
