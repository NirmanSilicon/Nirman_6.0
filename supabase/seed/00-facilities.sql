-- Seed 00: Facilities (Blueprint §7.7: 3 facilities)
-- 1 fully capable (all cardiac + CT), 1 partial (no defib / no CT), 1 close-but-incapable.
-- The third is what makes the capability matching story land.

INSERT INTO facilities (id, name, area, phone, distance_min, capabilities, ed_beds_total, ed_beds_free, night_doctor, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'Sunrise Hospital, Cuttack', 'Mangalabag, Cuttack', '+91-671-2414080', 8, 
 ARRAY['ecg','defib','oxygen','ct','usg','blood','ot','icu','ventilator','cardiac_team','thrombolysis','cath_lab'], 
 15, 6, true, true),

('22222222-2222-2222-2222-222222222222', 'Capital Hospital, Bhubaneswar', 'Unit 6, Bhubaneswar', '+91-674-2391983', 14, 
 ARRAY['ecg','oxygen','ct','usg','blood','ot','icu','ventilator'], 
 20, 4, true, true),

('33333333-3333-3333-3333-333333333333', 'Kalinga Care Clinic', 'Buxi Bazaar, Cuttack', '+91-671-2300112', 4, 
 ARRAY['ecg','oxygen'], 
 4, 1, false, true)
ON CONFLICT (id) DO UPDATE SET
name = EXCLUDED.name,
capabilities = EXCLUDED.capabilities,
ed_beds_free = EXCLUDED.ed_beds_free;
