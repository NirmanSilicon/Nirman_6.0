-- Seed 02: Playbooks & Playbook Tasks (Blueprint Appendix A: 3 playbooks)
-- Cardiac, Stroke, Trauma with exact teams, titles, and SLAs (60–180s)

-- Playbooks
INSERT INTO playbooks (id, key, name, version) VALUES
('b0000000-0000-0000-0000-000000000001', 'cardiac', 'Cardiac Emergency Playbook', 1),
('b0000000-0000-0000-0000-000000000002', 'stroke', 'Acute Stroke Playbook', 1),
('b0000000-0000-0000-0000-000000000003', 'trauma', 'Major Trauma Playbook', 1)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name;

-- Playbook 1: Cardiac (4 tasks)
INSERT INTO playbook_tasks (playbook_id, team, title, detail, position, sla_seconds) VALUES
('b0000000-0000-0000-0000-000000000001', 'counter', 'Hold ED bed', 'Reserve intake bed in cardiac bay and alert duty doctor', 1, 180),
('b0000000-0000-0000-0000-000000000001', 'medicine', 'Prepare aspirin + GTN tray', 'Draw up urgent medication tray and oxygen mask', 2, 120),
('b0000000-0000-0000-0000-000000000001', 'equipment', 'ECG machine + defibrillator to bay', 'Position ECG lead set and calibrate defib in bay 2', 3, 120),
('b0000000-0000-0000-0000-000000000001', 'stretcher', 'Trolley to gate & wheelchair ready', 'Meet ambulance at casualty entrance with oxygen cylinder', 4, 90)
ON CONFLICT (playbook_id, position) DO UPDATE SET title = EXCLUDED.title, sla_seconds = EXCLUDED.sla_seconds;

-- Playbook 2: Stroke (4 tasks)
INSERT INTO playbook_tasks (playbook_id, team, title, detail, position, sla_seconds) VALUES
('b0000000-0000-0000-0000-000000000002', 'counter', 'Hold ED bed · alert doctor', 'Check CT availability and notify on-call neurologist', 1, 180),
('b0000000-0000-0000-0000-000000000002', 'medicine', 'Prepare IV line · BP tray', 'Prepare thrombolytic candidate kit and glucometer', 2, 120),
('b0000000-0000-0000-0000-000000000002', 'equipment', 'CT slot flagged · oxygen', 'Clear path directly to CT scanner suite', 3, 120),
('b0000000-0000-0000-0000-000000000002', 'stretcher', 'Trolley to gate', 'Transfer patient from vehicle directly to CT trolley', 4, 90)
ON CONFLICT (playbook_id, position) DO UPDATE SET title = EXCLUDED.title, sla_seconds = EXCLUDED.sla_seconds;

-- Playbook 3: Trauma (4 tasks)
INSERT INTO playbook_tasks (playbook_id, team, title, detail, position, sla_seconds) VALUES
('b0000000-0000-0000-0000-000000000003', 'counter', 'Hold bed · alert surgeon', 'Notify emergency surgeon and alert blood bank', 1, 180),
('b0000000-0000-0000-0000-000000000003', 'medicine', 'Prepare trauma tray · IV fluids', 'Warm normal saline, pressure infusers, hemostatic dressings', 2, 120),
('b0000000-0000-0000-0000-000000000003', 'equipment', 'Oxygen + suction + dressing trolley', 'Check wall suction pressure and portable emergency unit', 3, 120),
('b0000000-0000-0000-0000-000000000003', 'stretcher', 'Trolley + spine board to gate', 'Have cervical collar and spine board ready at entrance', 4, 90)
ON CONFLICT (playbook_id, position) DO UPDATE SET title = EXCLUDED.title, sla_seconds = EXCLUDED.sla_seconds;
