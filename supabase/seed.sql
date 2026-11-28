-- =============================================================================
-- Seed Data for GoldenHour (Odisha Pilot Setup)
-- Real hospitals in Bhubaneswar & Cuttack, realistic capabilities, staff PINs,
-- 4-category task templates in English & Odia, and active demo alerts.
-- =============================================================================

-- Clean up existing data safely
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE alert_tasks CASCADE;
TRUNCATE TABLE alerts CASCADE;
TRUNCATE TABLE staff_members CASCADE;
TRUNCATE TABLE task_templates CASCADE;
TRUNCATE TABLE hospital_resources CASCADE;
TRUNCATE TABLE hospital_capabilities CASCADE;
TRUNCATE TABLE hospitals CASCADE;

-- -----------------------------------------------------------------------------
-- 1. HOSPITALS (Real Pilot Locations in Odisha)
-- -----------------------------------------------------------------------------
INSERT INTO hospitals (id, code, name, short_name, district, state, address, latitude, longitude, phone_number, emergency_phone, entrance_notes) VALUES
('11111111-1111-1111-1111-111111111111', 'CAPITAL_HOSP_BBS', 'Capital Hospital, Bhubaneswar', 'Capital Hospital', 'Khordha', 'Odisha', 'Unit 6, Ganga Nagar, Bhubaneswar, Odisha 751001', 20.264800, 85.828100, '+91-674-2391983', '102 / +91-674-2391984', 'Enter via Gate 2 directly to Trauma Casualty building. Ramp available.'),
('22222222-2222-2222-2222-222222222222', 'AIIMS_BBS', 'All India Institute of Medical Sciences, Bhubaneswar', 'AIIMS Bhubaneswar', 'Khordha', 'Odisha', 'Sijua, Patrapada, Bhubaneswar, Odisha 751019', 20.231200, 85.776600, '+91-674-2476789', '+91-674-2476499', 'Dedicated Emergency & Trauma entrance on West Wing. Direct ambulance bay.'),
('33333333-3333-3333-3333-333333333333', 'SCB_MCH_CTC', 'SCB Medical College & Hospital, Cuttack', 'SCB Medical College', 'Cuttack', 'Odisha', 'Mangalabag, Cuttack, Odisha 753007', 20.463300, 85.891300, '+91-671-2414080', '+91-671-2414100', 'Emergency gate opposite Medical Post Office. Red floor path directly to resus bay.'),
('44444444-4444-4444-4444-444444444444', 'SUM_ULT_BBS', 'SUM Ultimate Medicare, Bhubaneswar', 'SUM Ultimate', 'Khordha', 'Odisha', 'K8 Kalinga Nagar, Ghatikia, Bhubaneswar, Odisha 751003', 20.296100, 85.783600, '+91-674-3500500', '+91-674-3500911', 'Emergency triage counter immediately on ground floor main porch.');

-- -----------------------------------------------------------------------------
-- 2. HOSPITAL CAPABILITY MATRIX
-- -----------------------------------------------------------------------------
-- Capital Hospital: Strong trauma, CT, blood bank, oxygen; transfers advanced cath lab
INSERT INTO hospital_capabilities (hospital_id, category, is_available, ct_scanner_active, cath_lab_active, blood_bank_active, ventilator_active, last_confirmed_at, confirmed_by) VALUES
('11111111-1111-1111-1111-111111111111', 'chest_pain', true, true, false, true, true, timezone('utc', now() - INTERVAL '10 minutes'), 'Dr. P. Mohanty (ER Lead)'),
('11111111-1111-1111-1111-111111111111', 'stroke_signs', true, true, false, true, true, timezone('utc', now() - INTERVAL '15 minutes'), 'Dr. P. Mohanty (ER Lead)'),
('11111111-1111-1111-1111-111111111111', 'severe_bleeding', true, true, false, true, true, timezone('utc', now() - INTERVAL '5 minutes'), 'Dr. P. Mohanty (ER Lead)'),
('11111111-1111-1111-1111-111111111111', 'severe_breathlessness', true, true, false, true, true, timezone('utc', now() - INTERVAL '8 minutes'), 'Dr. P. Mohanty (ER Lead)');

-- AIIMS Bhubaneswar: Apex facility, all active including 24/7 cath lab and stroke unit
INSERT INTO hospital_capabilities (hospital_id, category, is_available, ct_scanner_active, cath_lab_active, blood_bank_active, ventilator_active, last_confirmed_at, confirmed_by) VALUES
('22222222-2222-2222-2222-222222222222', 'chest_pain', true, true, true, true, true, timezone('utc', now() - INTERVAL '4 minutes'), 'Dr. S. Das (HOD Emergency)'),
('22222222-2222-2222-2222-222222222222', 'stroke_signs', true, true, true, true, true, timezone('utc', now() - INTERVAL '6 minutes'), 'Dr. S. Das (HOD Emergency)'),
('22222222-2222-2222-2222-222222222222', 'severe_bleeding', true, true, true, true, true, timezone('utc', now() - INTERVAL '2 minutes'), 'Dr. S. Das (HOD Emergency)'),
('22222222-2222-2222-2222-222222222222', 'severe_breathlessness', true, true, true, true, true, timezone('utc', now() - INTERVAL '12 minutes'), 'Dr. S. Das (HOD Emergency)');

-- SCB Cuttack: Apex trauma and surgery
INSERT INTO hospital_capabilities (hospital_id, category, is_available, ct_scanner_active, cath_lab_active, blood_bank_active, ventilator_active, last_confirmed_at, confirmed_by) VALUES
('33333333-3333-3333-3333-333333333333', 'chest_pain', true, true, true, true, true, timezone('utc', now() - INTERVAL '20 minutes'), 'Casualty Medical Officer'),
('33333333-3333-3333-3333-333333333333', 'stroke_signs', true, true, true, true, true, timezone('utc', now() - INTERVAL '22 minutes'), 'Casualty Medical Officer'),
('33333333-3333-3333-3333-333333333333', 'severe_bleeding', true, true, true, true, true, timezone('utc', now() - INTERVAL '18 minutes'), 'Casualty Medical Officer'),
('33333333-3333-3333-3333-333333333333', 'severe_breathlessness', true, true, true, true, true, timezone('utc', now() - INTERVAL '25 minutes'), 'Casualty Medical Officer');

-- SUM Ultimate
INSERT INTO hospital_capabilities (hospital_id, category, is_available, ct_scanner_active, cath_lab_active, blood_bank_active, ventilator_active, last_confirmed_at, confirmed_by) VALUES
('44444444-4444-4444-4444-444444444444', 'chest_pain', true, true, true, true, true, timezone('utc', now() - INTERVAL '3 minutes'), 'Triage Desk'),
('44444444-4444-4444-4444-444444444444', 'stroke_signs', true, true, true, true, true, timezone('utc', now() - INTERVAL '7 minutes'), 'Triage Desk'),
('44444444-4444-4444-4444-444444444444', 'severe_bleeding', true, true, true, true, true, timezone('utc', now() - INTERVAL '5 minutes'), 'Triage Desk'),
('44444444-4444-4444-4444-444444444444', 'severe_breathlessness', true, true, true, true, true, timezone('utc', now() - INTERVAL '9 minutes'), 'Triage Desk');

-- -----------------------------------------------------------------------------
-- 3. HOSPITAL RESOURCES (Live Bed Counts & Teams)
-- -----------------------------------------------------------------------------
INSERT INTO hospital_resources (hospital_id, total_emergency_beds, available_emergency_beds, held_beds, active_teams_count, updated_by) VALUES
('11111111-1111-1111-1111-111111111111', 12, 6, 2, 3, 'Matron Shift Lead'),
('22222222-2222-2222-2222-222222222222', 20, 11, 3, 5, 'Trauma Control Lead'),
('33333333-3333-3333-3333-333333333333', 30, 8, 4, 6, 'Casualty Sister In-Charge'),
('44444444-4444-4444-4444-444444444444', 10, 5, 1, 3, 'ER Duty Nurse');

-- -----------------------------------------------------------------------------
-- 4. STAFF MEMBERS (PIN: '1234' hash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4')
-- -----------------------------------------------------------------------------
INSERT INTO staff_members (id, hospital_id, name, role, pin_hash, is_duty_lead, is_active) VALUES
-- Capital Hospital staff
('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Dr. Alok Nayak', 'doctor', '1234', false, true),
('a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Nurse Sneha Rout', 'nurse', '1234', false, true),
('a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Pharm. Manoj Jena', 'pharmacy', '1234', false, true),
('a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Tech. Bikas Patra', 'equipment', '1234', false, true),
('a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ranjan Sahoo', 'transport', '1234', false, true),
('a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Priyanka Behera', 'counter', '1234', false, true),
('a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Dr. Pragyan Mohanty', 'in_charge', '1234', true, true),
-- AIIMS Staff
('b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Dr. Subhashree Mishra', 'doctor', '1234', false, true),
('b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Nurse Anita Das', 'nurse', '1234', false, true),
('b7777777-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Dr. S. K. Rath', 'in_charge', '1234', true, true);

-- -----------------------------------------------------------------------------
-- 5. TASK TEMPLATES (Exactly 4 preparation tasks per category in English & Odia)
-- -----------------------------------------------------------------------------
-- Category 1: Chest Pain (ଛାତିରେ ଯନ୍ତ୍ରଣା)
INSERT INTO task_templates (hospital_id, category, task_sequence, role_required, title_en, title_or, instructions_en, instructions_or) VALUES
(NULL, 'chest_pain', 1, 'doctor', 'Doctor Ready (Cath/ECG Review)', 'ଡାକ୍ତର ପ୍ରସ୍ତୁତ ରୁହନ୍ତୁ (ଇସିଜି/କ୍ୟାଥ୍)', 'Verify ECG lead availability and alert on-call cardiologist.', 'ଇସିଜି ପ୍ରସ୍ତୁତ ରଖନ୍ତୁ ଏବଂ ହୃଦରୋଗ ବିଶେଷଜ୍ଞଙ୍କୁ ସୂଚିତ କରନ୍ତୁ।'),
(NULL, 'chest_pain', 2, 'nurse', 'Bed Prepared with Cardiac Monitor', 'କାର୍ଡିଆକ୍ ମନିଟର୍ ସହ ବେଡ୍ ପ୍ରସ୍ତୁତ', 'Setup defib pads, oxygen cannula, IV access tray.', 'ଡିଫିବ୍ରିଲେଟର୍, ଅମ୍ଳଜାନ ଏବଂ ସାଲାଇନ୍ ସେଟ୍ ପ୍ରସ୍ତୁତ ରଖନ୍ତୁ।'),
(NULL, 'chest_pain', 3, 'pharmacy', 'Cardiac Emergency Kit Prepped', 'ହୃଦରୋଗ ଜରୁରୀକାଳୀନ ଔଷଧ କିଟ୍', 'Aspirin, Clopidogrel, Sorbitrate, Heparin vial ready.', 'ଆସ୍ପିରିନ୍, ସରବିଟ୍ରେଟ୍ ଏବଂ ଆବଶ୍ୟକୀୟ ଔଷଧ ସଜାଡି ରଖନ୍ତୁ।'),
(NULL, 'chest_pain', 4, 'transport', 'Stretcher with Oxygen at Gate', 'ଗେଟ୍ ନିକଟରେ ଅମ୍ଳଜାନ ସହ ଷ୍ଟ୍ରେଚର୍', 'Wheel stretcher to main casualty gate, connect portable O2.', 'ମୁଖ୍ୟ ଗେଟ୍ ନିକଟରେ ପୋର୍ଟେବଲ୍ ଅମ୍ଳଜାନ ସହ ଷ୍ଟ୍ରେଚର୍ ନେଇ ଉପସ୍ଥିତ ରୁହନ୍ତୁ।');

-- Category 2: Stroke Signs (ପକ୍ଷାଘାତ / ମୁହଁ ବଙ୍କା ହେବା)
INSERT INTO task_templates (hospital_id, category, task_sequence, role_required, title_en, title_or, instructions_en, instructions_or) VALUES
(NULL, 'stroke_signs', 1, 'doctor', 'Doctor & CT Scanner Cleared', 'ଡାକ୍ତର ଏବଂ ସିଟି ସ୍କାନ୍ କ୍ଲିୟର୍', 'Prioritize immediate non-contrast head CT on arrival.', 'ରୋଗୀ ପହଞ୍ଚିବା ମାତ୍ରେ ତୁରନ୍ତ ସିଟି ସ୍କାନ ପାଇଁ ରାସ୍ତା ଖାଲି ରଖନ୍ତୁ।'),
(NULL, 'stroke_signs', 2, 'nurse', 'Stroke Resus Bed Prepared', 'ଷ୍ଟ୍ରୋକ୍ ରିସସ୍ ବେଡ୍ ପ୍ରସ୍ତୁତ', 'Blood pressure monitor ready, check blood glucose kit.', 'ରକ୍ତଚାପ ଏବଂ ଶର୍କରା ପରୀକ୍ଷା ଯନ୍ତ୍ର ପ୍ରସ୍ତୁତ ରଖନ୍ତୁ।'),
(NULL, 'stroke_signs', 3, 'pharmacy', 'Thrombolytic Care Kit Ready', 'ଥ୍ରୋମ୍ବୋଲାଇଟିକ୍ କେୟାର୍ କିଟ୍', 'Verify recombinant tPA / Tenecteplase stock.', 'ରକ୍ତ ଜମାଟ ବାନ୍ଧିବା ରୋକିବା ଔଷଧ କିଟ୍ ପ୍ରସ୍ତୁତ ରଖନ୍ତୁ।'),
(NULL, 'stroke_signs', 4, 'transport', 'Stretcher at Gate for Direct CT Transit', 'ସିଧାସଳଖ ସିଟି ପାଇଁ ଷ୍ଟ୍ରେଚର୍ ପ୍ରସ୍ତୁତ', 'Transfer patient from ambulance directly to CT scanner.', 'ଆମ୍ବୁଲାନ୍ସରୁ ସିଧାସଳଖ ସିଟି ରୁମକୁ ନେବା ପାଇଁ ଗେଟରେ ରୁହନ୍ତୁ।');

-- Category 3: Severe Bleeding (ପ୍ରବଳ ରକ୍ତସ୍ରାବ)
INSERT INTO task_templates (hospital_id, category, task_sequence, role_required, title_en, title_or, instructions_en, instructions_or) VALUES
(NULL, 'severe_bleeding', 1, 'doctor', 'Trauma Surgeon / ER Doctor Alerted', 'ଟ୍ରମା ସର୍ଜନ / ଡାକ୍ତର ପ୍ରସ୍ତୁତ', 'Surgical team standby for immediate wound exploration.', 'ସର୍ଜିକାଲ୍ ଟିମ୍ ପ୍ରସ୍ତୁତ ରୁହନ୍ତୁ।'),
(NULL, 'severe_bleeding', 2, 'nurse', 'Trauma Bay & Pressure Bandages', 'ଟ୍ରମା ବେ ଏବଂ ପ୍ରେସର୍ ବ୍ୟାଣ୍ଡେଜ୍', 'Warm IV fluids, pressure tourniquets, suction ready.', 'ରକ୍ତସ୍ରାବ ବନ୍ଦ କରିବା ପାଇଁ ବ୍ୟାଣ୍ଡେଜ୍ ଓ ସକସନ୍ ପ୍ରସ୍ତୁତ ରଖନ୍ତୁ।'),
(NULL, 'severe_bleeding', 3, 'pharmacy', 'Blood Bank Alert & Hemostatic Kit', 'ବ୍ଲଡ୍ ବ୍ୟାଙ୍କ ସତର୍କ ଓ ରକ୍ତ କିଟ୍', 'Alert blood bank for universal O-negative PRBC standby.', 'ତୁରନ୍ତ ଓ-ନେଗେଟିଭ୍ ରକ୍ତ ଏବଂ ଟ୍ରାନେକ୍ସାମିକ୍ ଏସିଡ୍ ମହଜୁଦ ରଖନ୍ତୁ।'),
(NULL, 'severe_bleeding', 4, 'transport', 'Trauma Stretcher with Spinesupport', 'ଟ୍ରମା ଷ୍ଟ୍ରେଚର୍ ପ୍ରସ୍ତୁତ', 'Heavy-duty stretcher ready at casualty gate.', 'ଜରୁରୀକାଳୀନ ଗେଟରେ ଟ୍ରମା ଷ୍ଟ୍ରେଚର୍ ରଖନ୍ତୁ।');

-- Category 4: Severe Breathlessness (ନିଶ୍ୱାସ ନେବାରେ ଗମ୍ଭୀର କଷ୍ଟ)
INSERT INTO task_templates (hospital_id, category, task_sequence, role_required, title_en, title_or, instructions_en, instructions_or) VALUES
(NULL, 'severe_breathlessness', 1, 'doctor', 'Pulmonologist / ER Doctor Ready', 'ଡାକ୍ତର ପ୍ରସ୍ତୁତ ରୁହନ୍ତୁ', 'Airway specialist standing by for immediate intubation assessment.', 'ଶ୍ୱାସକ୍ରିୟା ବିଶେଷଜ୍ଞ ପ୍ରସ୍ତୁତ ରୁହନ୍ତୁ।'),
(NULL, 'severe_breathlessness', 2, 'nurse', 'Ventilator / High-Flow O2 Bed', 'ଭେଣ୍ଟିଲେଟର୍ ଏବଂ ଅମ୍ଳଜାନ ବେଡ୍', 'Calibrate high-flow nasal cannula and suction device.', 'ଭେଣ୍ଟିଲେଟର୍ ଏବଂ ଅମ୍ଳଜାନ ମାସ୍କ ଯାଞ୍ଚ କରି ରଖନ୍ତୁ।'),
(NULL, 'severe_breathlessness', 3, 'pharmacy', 'Nebulization & Airway Drugs Prepped', 'ନେବୁଲାଇଜେସନ୍ ଓ ଶ୍ୱାସ ଔଷଧ', 'Salbutamol, Budecort, Deriphyllin, Hydrocortisone ampoules.', 'ନେବୁଲାଇଜର୍ ଔଷଧ ଏବଂ ଇଞ୍ଜେକ୍ସନ୍ ପ୍ରସ୍ତୁତ ରଖନ୍ତୁ।'),
(NULL, 'severe_breathlessness', 4, 'transport', 'Oxygen-Cylinder Stretcher at Gate', 'ଅମ୍ଳଜାନ ସିଲିଣ୍ଡର୍ ସହ ଷ୍ଟ୍ରେଚର୍', 'Wheel stretcher with 100% full portable oxygen cylinder.', 'ଭରା ଅମ୍ଳଜାନ ସିଲିଣ୍ଡର୍ ଥିବା ଷ୍ଟ୍ରେଚର୍ ନେଇ ଗେଟରେ ଅପେକ୍ଷା କରନ୍ତୁ।');

-- -----------------------------------------------------------------------------
-- 6. DEMO ALERTS (Representing Real Operational States on Ops Wall)
-- -----------------------------------------------------------------------------

-- Alert 1: Chest Pain (Fresh, 25 seconds ago, 3 of 4 tasks claimed - Normal green)
INSERT INTO alerts (
    id, alert_code, access_token, hospital_id, category, status,
    origin_latitude, origin_longitude, origin_area_name,
    estimated_distance_km, estimated_drive_minutes, bed_held, bed_held_expires_at,
    created_at
) VALUES (
    'e1111111-1111-1111-1111-111111111111', 'A3F2C1', 'f1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111', 'chest_pain', 'created',
    20.296059, 85.824540, 'Saheed Nagar, Bhubaneswar',
    5.20, 11, true, timezone('utc', now() + INTERVAL '28 minutes'),
    timezone('utc', now() - INTERVAL '25 seconds')
);

-- Update 3 claimed tasks for Alert 1
UPDATE alert_tasks
SET status = 'claimed',
    claimed_by = 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    claimed_by_name = 'Dr. Alok Nayak',
    claimed_at = timezone('utc', now() - INTERVAL '18 seconds')
WHERE alert_id = 'e1111111-1111-1111-1111-111111111111' AND task_sequence = 1;

UPDATE alert_tasks
SET status = 'claimed',
    claimed_by = 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    claimed_by_name = 'Nurse Sneha Rout',
    claimed_at = timezone('utc', now() - INTERVAL '12 seconds')
WHERE alert_id = 'e1111111-1111-1111-1111-111111111111' AND task_sequence = 2;

UPDATE alert_tasks
SET status = 'claimed',
    claimed_by = 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    claimed_by_name = 'Pharm. Manoj Jena',
    claimed_at = timezone('utc', now() - INTERVAL '7 seconds')
WHERE alert_id = 'e1111111-1111-1111-1111-111111111111' AND task_sequence = 3;

-- Alert 2: Stroke Signs (105 seconds elapsed - AMBER escalated, Duty lead alerted)
INSERT INTO alerts (
    id, alert_code, access_token, hospital_id, category, status,
    origin_latitude, origin_longitude, origin_area_name,
    estimated_distance_km, estimated_drive_minutes, bed_held, bed_held_expires_at,
    created_at
) VALUES (
    'e2222222-2222-2222-2222-222222222222', 'B71D09', 'f2222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111', 'stroke_signs', 'created',
    20.353300, 85.819500, 'Patia, Bhubaneswar',
    12.40, 25, true, timezone('utc', now() + INTERVAL '26 minutes'),
    timezone('utc', now() - INTERVAL '105 seconds')
);

-- Escalate unclaimed tasks to Amber for Alert 2
UPDATE alert_tasks
SET escalation_level = 'amber',
    amber_escalated_at = timezone('utc', now() - INTERVAL '15 seconds')
WHERE alert_id = 'e2222222-2222-2222-2222-222222222222';

-- Alert 3: Severe Bleeding (8 min away, ALL TAKEN, status = ready)
INSERT INTO alerts (
    id, alert_code, access_token, hospital_id, category, status,
    origin_latitude, origin_longitude, origin_area_name,
    estimated_distance_km, estimated_drive_minutes, bed_held, bed_held_expires_at,
    created_at, all_tasks_claimed_at
) VALUES (
    'e3333333-3333-3333-3333-333333333333', 'C90E44', 'f3333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111', 'severe_bleeding', 'ready',
    20.250000, 85.840000, 'Old Town, Bhubaneswar',
    3.80, 8, true, timezone('utc', now() + INTERVAL '22 minutes'),
    timezone('utc', now() - INTERVAL '4 minutes'),
    timezone('utc', now() - INTERVAL '2 minutes')
);

-- Mark all 4 tasks claimed for Alert 3
UPDATE alert_tasks
SET status = 'claimed',
    claimed_by = 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    claimed_by_name = 'Dr. Alok Nayak',
    claimed_at = timezone('utc', now() - INTERVAL '3 minutes')
WHERE alert_id = 'e3333333-3333-3333-3333-333333333333' AND task_sequence = 1;

UPDATE alert_tasks
SET status = 'claimed',
    claimed_by = 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    claimed_by_name = 'Nurse Sneha Rout',
    claimed_at = timezone('utc', now() - INTERVAL '3 minutes')
WHERE alert_id = 'e3333333-3333-3333-3333-333333333333' AND task_sequence = 2;

UPDATE alert_tasks
SET status = 'claimed',
    claimed_by = 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    claimed_by_name = 'Pharm. Manoj Jena',
    claimed_at = timezone('utc', now() - INTERVAL '2 minutes')
WHERE alert_id = 'e3333333-3333-3333-3333-333333333333' AND task_sequence = 3;

UPDATE alert_tasks
SET status = 'claimed',
    claimed_by = 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    claimed_by_name = 'Ranjan Sahoo',
    claimed_at = timezone('utc', now() - INTERVAL '2 minutes')
WHERE alert_id = 'e3333333-3333-3333-3333-333333333333' AND task_sequence = 4;

-- Alert 4: Severe Breathlessness (215 seconds elapsed, RED state, 1 of 4 claimed)
INSERT INTO alerts (
    id, alert_code, access_token, hospital_id, category, status,
    origin_latitude, origin_longitude, origin_area_name,
    estimated_distance_km, estimated_drive_minutes, bed_held, bed_held_expires_at,
    created_at
) VALUES (
    'e4444444-4444-4444-4444-444444444444', 'D18A20', 'f4444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111', 'severe_breathlessness', 'created',
    20.300000, 85.750000, 'Khandagiri, Bhubaneswar',
    14.50, 31, true, timezone('utc', now() + INTERVAL '24 minutes'),
    timezone('utc', now() - INTERVAL '215 seconds')
);

UPDATE alert_tasks
SET status = 'claimed',
    claimed_by = 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    claimed_by_name = 'Ranjan Sahoo',
    claimed_at = timezone('utc', now() - INTERVAL '190 seconds')
WHERE alert_id = 'e4444444-4444-4444-4444-444444444444' AND task_sequence = 4;

-- Escalate the other 3 unclaimed tasks to RED
UPDATE alert_tasks
SET escalation_level = 'red',
    amber_escalated_at = timezone('utc', now() - INTERVAL '125 seconds'),
    red_escalated_at = timezone('utc', now() - INTERVAL '35 seconds')
WHERE alert_id = 'e4444444-4444-4444-4444-444444444444' AND status = 'unclaimed';
