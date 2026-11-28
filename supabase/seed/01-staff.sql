-- Seed 01: Staff (Blueprint §7.7: 8 staff at Sunrise Hospital)
-- Supervisor, doctor, nurse, counter, 2x medicine, equipment, stretcher

INSERT INTO staff (id, facility_id, full_name, role, team, pin_hash, is_on_shift) VALUES
('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Dr. Pragyan Mohanty', 'supervisor', NULL, '1234', true),
('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Dr. Alok Nayak', 'doctor', NULL, '1234', true),
('a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Nurse Sneha Rout', 'nurse', NULL, '1234', true),
('a0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Priyanka Behera', 'counter', 'counter', '1234', true),
('a0000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Pharm. Manoj Jena', 'medicine', 'medicine', '1234', true),
('a0000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Pharm. Sunita Das', 'medicine', 'medicine', '1234', true),
('a0000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Tech. Bikas Patra', 'equipment', 'equipment', '1234', true),
('a0000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'Ranjan Sahoo', 'stretcher', 'stretcher', '1234', true)
ON CONFLICT (id) DO UPDATE SET
full_name = EXCLUDED.full_name,
role = EXCLUDED.role;
