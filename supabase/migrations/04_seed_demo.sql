-- ========================================================
-- GoldenHour — Database Schema Migration 04: Seed Data
-- 4 Participating Bhubaneswar Hospitals and Demo Inbound Alerts
-- ========================================================

INSERT INTO hospitals (code, hospital_name, short_name, address, district, landmark, emergency_phone, level, status)
VALUES 
(
    'AIIMS_BBSR', 
    'AIIMS Bhubaneswar — Apex Trauma & Emergency Centre', 
    'AIIMS Bhubaneswar', 
    'NH-16, Sijua, Patrapada, Bhubaneswar, Odisha 751019', 
    'Bhubaneswar Urban', 
    'Near Patrapada Flyover / Gate 3', 
    '0674-2476789', 
    'Level 1 Apex Emergency & Trauma', 
    'accepting'
),
(
    'KIMS_BBSR', 
    'KIMS Super Speciality Hospital — Emergency Department', 
    'KIMS Emergency', 
    'Kushabhadra Campus 5, KIIT University, Patia, Bhubaneswar 751024', 
    'Bhubaneswar North', 
    'KIIT Square / Big Bazaar Patia Road', 
    '0674-7105300', 
    'Tertiary Multi-Speciality Emergency', 
    'accepting'
),
(
    'SUM_MEDICARE', 
    'SUM Ultimate Medicare — Acute Emergency Care', 
    'SUM Ultimate', 
    'K-8, Kalinga Nagar, Ghatikia, Bhubaneswar 751003', 
    'Bhubaneswar West', 
    'Opposite CET Campus, Ghatikia', 
    '0674-3500500', 
    'Tertiary Multi-Speciality Emergency', 
    'accepting'
),
(
    'APOLLO_BBSR', 
    'Apollo Hospitals Bhubaneswar — Emergency Resuscitation Unit', 
    'Apollo Bhubaneswar', 
    'Plot 251, Sainik School Rd, Unit 15, Bhubaneswar 751005', 
    'Bhubaneswar Central', 
    'Near Sainik School / Doordarshan Kendra', 
    '0674-6661066', 
    'Tertiary Multi-Speciality Emergency', 
    'accepting'
)
ON CONFLICT (code) DO NOTHING;
