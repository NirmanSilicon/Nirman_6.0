-- Seed 03: Beds (Initial bed allocation)
-- GoldenHour Blueprint §7.3 / NIRMAN 2026

-- Update current capacity
UPDATE facilities
SET ed_beds_total = 15,
    ed_beds_free = 6
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE facilities
SET ed_beds_total = 20,
    ed_beds_free = 4
WHERE id = '22222222-2222-2222-2222-222222222222';
