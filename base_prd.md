GoldenHour — Product Requirements Document (PRD)
Tagline: Tell the emergency room what is coming — before the patient arrives.
Document Detail
Information
Product Name
GoldenHour
Version
1.0
Category
HealthTech / Emergency Healthcare Coordination
Platform
Web Application
Target Market
Hospitals, emergency departments, patients and families
Initial Geography
India
Status
Development / Prototype
Prepared By
Team GoldenHour


1. Executive Summary
1.1 Product Overview
GoldenHour is an emergency healthcare coordination platform designed to reduce delays between recognising a medical emergency and receiving appropriate hospital care.
During emergencies, families often struggle to identify a suitable hospital. They may not know whether a nearby hospital has the required facilities, available beds, medical teams or equipment. Meanwhile, hospitals frequently receive little or no advance information about incoming emergency patients.
GoldenHour addresses this communication gap by connecting families, hospitals and emergency response teams through a unified digital platform.
The family can raise an emergency request through a simple, mobile-friendly interface without installing an application or creating an account. The platform identifies suitable hospitals based on their registered capabilities and availability.
The hospital receives the incoming emergency alert through a real-time dashboard. Staff can view the emergency category, estimated arrival information and preparation tasks, allowing them to begin preparations before the patient reaches the hospital.
GoldenHour focuses on three fundamental objectives:
Faster coordination: Connect families with appropriate hospitals.
Hospital preparedness: Give emergency departments advance notice.
Transparent communication: Maintain a real-time record of emergency request updates.
GoldenHour is a coordination platform, not a diagnostic or treatment system. All clinical decisions remain with qualified healthcare professionals.
1.2 Vision
To create a connected emergency healthcare ecosystem where hospitals are better prepared, families receive clearer guidance and critical time is not wasted because of communication gaps.
1.3 Mission
To make emergency coordination faster, simpler and more transparent through accessible technology and real-time hospital communication.

2. Problem Statement
2.1 Existing Challenges
Emergency healthcare often involves multiple parties working independently: families, ambulance services, hospitals, doctors and emergency department staff.
The lack of coordination between these parties creates several challenges.
A. Difficulty Finding the Right Hospital
Families usually choose hospitals based on proximity, reputation or recommendations. However, the nearest hospital may not have the required emergency facilities available at that moment.
B. Lack of Advance Hospital Notification
Hospitals may only become aware of an emergency when the patient physically arrives. This leaves limited time for preparing staff, equipment and facilities.
C. Fragmented Communication
Emergency information is frequently communicated through phone calls and informal messages. Important details can be missed, delayed or misunderstood.
D. Limited Visibility
Families may not know whether the hospital has received their request or whether preparations are underway.
E. Delayed Emergency Preparation
When hospitals receive no advance notification, staff may need additional time to organise resources after the patient's arrival.
2.2 The Core Problem
There is no simple, unified communication layer connecting families and hospitals before an emergency patient arrives.
GoldenHour aims to bridge this gap.

3. Target Users and Stakeholders
User
Description
Primary Needs
Family / Caregiver
Person raising an emergency request
Simple emergency reporting, suitable hospital information and status updates
Emergency Doctor
Medical professional handling incoming cases
Early awareness of incoming emergencies
Nursing Staff
Staff responsible for preparation
Clear preparation tasks and one-tap task claiming
Hospital Administrator
Person managing hospital resources
Capability, availability and hospital information management
Ambulance / Emergency Dispatcher
Person coordinating emergency transportation
Ability to raise an alert on behalf of a family or patient
Platform Administrator
GoldenHour system administrator
Hospital verification, platform monitoring and system management


4. Product Scope
4.1 Core Features
GoldenHour consists of two primary user-facing interfaces.
A. Family / Patient Interface
Emergency request creation.
Simple emergency category selection.
Location-based hospital discovery.
Hospital capability and availability information.
Emergency request submission.
Real-time request status.
Estimated travel information.
Hospital contact information.
B. Hospital Interface
Real-time emergency alert dashboard.
Incoming emergency request management.
Emergency category identification.
Preparation task management.
One-tap task claiming.
Alert timers and escalation.
Arrival and closure management.
Emergency activity history.
C. Hospital Administration
Hospital profile management.
Emergency capabilities management.
Equipment availability.
Bed availability.
Staff role management.
Preparation task configuration.
Emergency activity reports.
4.2 Out of Scope
The first version will not include:
AI-based medical diagnosis.
Automated treatment recommendations.
Medicine or dosage recommendations.
Independent ambulance dispatch.
Continuous ambulance GPS tracking.
Insurance and billing management.
Electronic medical records.
Automated clinical triage or severity scoring.
GoldenHour will focus on coordination, communication and preparedness.

5. User Journey and System Workflow
5.1 Overall Workflow
A family member opens the GoldenHour website.
The user selects their preferred language.
The user selects the emergency category.
The platform obtains the user's location or allows manual location selection.
GoldenHour identifies suitable hospitals.
The user reviews the available hospital options.
The user selects a hospital and submits an emergency request.
The platform creates a unique emergency record.
The selected hospital receives a real-time notification.
Hospital staff view the emergency on their dashboard.
Staff claim the preparation tasks.
The hospital updates the request status.
The family receives status updates.
The patient arrives at the hospital.
Hospital staff mark the case as arrived and subsequently closed.
The system maintains the emergency activity record.
5.2 Emergency Request Lifecycle
Request Created → Hospital Notified → Preparation Started → Patient Arrived → Case Closed
Additional states include:
Request rejected.
Hospital unavailable.
Request escalated.
Request cancelled.
Each state transition must be recorded with a timestamp.

6. Family / Patient Interface Requirements
6.1 Design Philosophy
The family interface must be simple, accessible and easy to understand during stressful situations.
The design should prioritise:
Minimal steps.
Large and clear buttons.
Simple language.
Mobile-first layouts.
Clear visual hierarchy.
Fast loading.
Minimal typing.
Accessible language options.
6.2 Functional Requirements
ID
Requirement
Priority
F-01
Users must be able to access the platform through a web link without installing an application.
Must
F-02
Users must be able to select a preferred language.
Must
F-03
The interface must provide four predefined emergency categories.
Must
F-04
Users must be able to share their location or enter it manually.
Must
F-05
The system must display suitable hospitals based on registered capabilities and availability.
Must
F-06
Hospital cards must display name, distance, estimated travel time and relevant facilities.
Must
F-07
Users must be able to submit an emergency request.
Must
F-08
Users must receive confirmation after submitting a request.
Must
F-09
Users must be able to view request status updates.
Must
F-10
Hospital contact information must be accessible.
Must
F-11
The interface should support read-aloud functionality.
Should
F-12
The system should provide a clear alternative if no suitable hospital is available.
Must

6.3 Emergency Categories
The initial version will support four emergency categories:
Chest Pain: For people reporting chest pain or suspected cardiac emergencies.
Stroke Symptoms: For people reporting possible stroke warning signs.
Serious Bleeding: For emergencies involving significant bleeding.
Severe Breathing Difficulty: For people experiencing serious difficulty breathing.
These categories are used for hospital capability matching, not for diagnosis.
6.4 Hospital Recommendation Screen
Each hospital card should contain:
Hospital name.
Hospital location.
Distance from the user.
Estimated travel time, when available.
Relevant emergency capabilities.
Availability information.
Last availability update.
Contact number.
Emergency request button.
The system should prioritise hospital capability and availability rather than distance alone.
6.5 Emergency Status Screen
After submitting a request, users should be able to view:
Request confirmation.
Selected hospital.
Hospital acceptance or rejection status.
Preparation status.
Hospital contact information.
Estimated travel information, where available.
Arrival confirmation.
The interface must clearly distinguish between confirmed information and estimates.

7. Hospital Dashboard Requirements
7.1 Design Philosophy
The hospital dashboard is the operational centre of GoldenHour.
It must be designed for emergency department environments where staff have limited time and may need to view multiple incoming alerts simultaneously.
The dashboard should be:
Professional and uncluttered.
Readable from approximately three metres.
Real-time.
Easy to operate.
Visually organised.
Suitable for large monitors and televisions.
The dashboard should avoid unnecessary navigation, excessive text and complicated interactions.
7.2 Main Dashboard Layout
The primary hospital dashboard should contain three major sections:
A. Incoming Emergencies
Displays newly received emergency requests.
Each emergency card should show:
Emergency category.
Request ID.
Time received.
Distance from hospital.
Estimated arrival time, if available.
Current request status.
Preparation task progress.
Escalation timer.
B. Preparation Tasks
Displays the tasks required to prepare for the incoming patient.
Each task should have:
Task description.
Responsible staff role.
Claim button.
Current task status.
Claim timestamp.
C. Recently Closed Emergencies
Displays completed emergency requests with:
Request ID.
Emergency category.
Time received.
Arrival time.
Closure time.
Final status.
7.3 Functional Requirements
ID
Requirement
Priority
H-01
The dashboard must receive incoming emergency alerts in real time.
Must
H-02
Incoming requests must appear without manually refreshing the page.
Must
H-03
Every request must display its emergency category and received time.
Must
H-04
Every request must display four configurable preparation tasks.
Must
H-05
Staff must be able to claim tasks with one click.
Must
H-06
Claimed tasks must become visible to other dashboard users.
Must
H-07
The dashboard must display elapsed time since the request was received.
Must
H-08
The dashboard must support alert escalation.
Must
H-09
Staff must be able to reject a request with a reason.
Must
H-10
Staff must be able to mark a patient as arrived.
Must
H-11
Staff must be able to close an emergency record.
Must
H-12
The dashboard must maintain a history of completed requests.
Must
H-13
The dashboard should display daily emergency statistics.
Should

7.4 Preparation Task Management
Each emergency request should generate four preparation tasks based on the selected category and the hospital's configured workflow.
Examples of task categories include:
Medical team readiness.
Nursing preparation.
Equipment or imaging readiness.
Emergency reception coordination.
These tasks are configurable operational reminders, not clinical instructions.
Staff can claim tasks individually.
The dashboard must show:
Pending tasks.
Claimed tasks.
Completed tasks, where completion tracking is enabled.
Responsible staff role.
Timestamp of each action.

8. Alert and Escalation System
8.1 Purpose
The escalation system ensures that incoming requests do not remain unnoticed.
The system uses server-side timestamps rather than relying on browser timers.
8.2 Escalation Rules
Time
System Behaviour
Dashboard State
0 seconds
Emergency request is created and displayed.
New alert
40 seconds
The system displays remaining unclaimed tasks.
Normal
90 seconds
Unclaimed tasks trigger an escalation notification to the duty lead.
Amber
180 seconds
The request is marked as requiring urgent attention.
Red
Patient arrival
Staff mark the patient as arrived.
Arrived
Case closure
Staff close the request.
Closed

8.3 Visual Indicators
The dashboard must use both colour and text.
Normal: Blue or neutral indicator.
Amber: Attention required.
Red: Escalation required.
Green: Completed or confirmed status.
Colour must never be the only way to communicate an alert state.
8.4 Escalation Notifications
The system should:
Notify the duty lead after 90 seconds.
Avoid repeatedly sending identical notifications.
Record the escalation timestamp.
Update the dashboard immediately.
Maintain the escalation event in the audit log.

9. Hospital Matching System
9.1 Purpose
The matching system helps families identify hospitals that may be suitable for the selected emergency category.
9.2 Matching Parameters
The system should consider:
Emergency treatment capability.
Availability of relevant equipment.
Availability of emergency beds.
Availability of required staff or teams, where maintained.
Distance from the user's location.
Estimated travel time.
Freshness of hospital availability information.
9.3 Matching Logic
The matching process should follow this order:
Step 1 — Capability Check
Identify hospitals that have registered the relevant emergency capability.
Step 2 — Availability Check
Check whether the hospital has indicated that it can currently receive the emergency request.
Step 3 — Distance Check
Calculate distance using available location information.
Step 4 — Availability Freshness
Consider how recently the hospital updated its capability and availability information.
Step 5 — Recommendation
Display the most suitable available options, with clear information explaining why each hospital appears.
9.4 Transparency
The system must not:
Promote hospitals because they pay the platform.
Invent hospital availability.
Present outdated information as live.
Guarantee that a hospital can treat a patient.
Replace clinical judgement with automated ranking.
If hospital information is stale, the interface must clearly communicate this.

10. Hospital Administration Module
10.1 Purpose
The administration module allows hospitals to maintain accurate operational information.
10.2 Functional Requirements
Hospital administrators should be able to:
Create and update hospital profiles.
Manage hospital location and contact details.
Register emergency capabilities.
Update equipment availability.
Update emergency bed availability.
Manage staff roles.
Configure preparation tasks.
View emergency request history.
Access operational reports.
10.3 Hospital Profile Information
Each hospital profile should contain:
Field
Description
Hospital ID
Unique hospital identifier
Hospital Name
Official hospital name
Address
Registered location
Latitude / Longitude
Geographic coordinates
Contact Number
Emergency contact
Emergency Capabilities
Supported emergency categories
Equipment
Registered emergency equipment
Bed Availability
Current reported availability
Staff Availability
Relevant team availability
Last Updated
Timestamp of last update

10.4 Data Freshness
Hospital availability must be time-stamped.
The system should flag outdated information and avoid presenting it as confirmed real-time availability.

11. Data Management and Privacy
11.1 Data Collection Principles
GoldenHour should collect only the information necessary for emergency coordination.
The platform should avoid collecting unnecessary personal or medical information.
11.2 Data to Be Stored
Hospital profiles.
Hospital capability information.
Availability updates.
Emergency request IDs.
Emergency categories.
Request timestamps.
Selected hospital.
Request status.
Preparation task status.
Staff role information.
Audit records.
11.3 Data Protection
The platform must implement:
Secure authentication for hospital users.
Role-based access control.
Hospital-specific data access.
Secure database rules.
Protected communication.
Secure session management.
Audit logging.
Appropriate data retention policies.
11.4 Privacy Considerations
The family-facing request flow should not require a patient name, age, gender or medical history to create an emergency request.
If additional information is required during a hospital pilot, the purpose, access permissions and retention period must be documented before collection.
The system must comply with applicable Indian data protection and healthcare requirements.

12. Non-Functional Requirements
12.1 Performance
ID
Requirement
N-01
Incoming alerts should appear on the hospital dashboard within two seconds under normal operating conditions.
N-02
The family interface should load within five seconds on a weak mobile connection.
N-03
Dashboard updates should occur without manual refresh.
N-04
The system should support multiple simultaneous emergency requests.
N-05
The system should prevent duplicate requests caused by network retries.

12.2 Reliability
The system must maintain request records during temporary connection failures.
The dashboard must show the last successful update time.
The system must not display outdated information as live.
Server-side timestamps must control escalation.
Failed submissions should provide a clear retry option.
12.3 Accessibility
Large, readable text.
High colour contrast.
Large touch targets.
Simple language.
Language selection.
Read-aloud support.
Mobile-friendly layout.
Colour-independent status indicators.
12.4 Scalability
The system architecture should support future expansion to:
Multiple hospitals.
Multiple cities.
Multiple districts.
Additional emergency categories.
Additional Indian languages.
Integration with ambulance services.
Hospital information systems.

13. Technology Stack
The initial prototype should use a lightweight web-based architecture.
Layer
Technology
Purpose
Frontend
HTML, CSS and JavaScript
Family interface and hospital dashboard
Backend
Python
Business logic and application processing
Backend Framework
FastAPI
API development
Database
PostgreSQL / Supabase
Hospital, alert and task records
Authentication
Supabase Auth
Secure hospital staff authentication
Real-Time Updates
Supabase Realtime / WebSockets
Incoming emergency alerts and status updates
Maps
Mapping and routing API
Location and travel-time information
Hosting
Suitable cloud hosting
Application deployment
Version Control
GitHub
Source code management

The final implementation may adjust the stack based on deployment and integration requirements.

14. Database Requirements
The database should maintain a structured record of hospitals, emergency requests, staff and preparation tasks.
14.1 Suggested Tables
Hospitals
hospital_id
hospital_name
address
latitude
longitude
contact_number
emergency_capabilities
availability_status
last_updated
Hospital_Staff
staff_id
hospital_id
staff_role
authentication_id
account_status
Emergency_Requests
request_id
emergency_category
user_location
selected_hospital_id
request_status
created_at
accepted_at
arrived_at
closed_at
Preparation_Tasks
task_id
request_id
task_description
assigned_role
task_status
claimed_at
completed_at
Request_Audit_Log
log_id
request_id
action
actor_id
timestamp
additional_details
Hospital_Availability
availability_id
hospital_id
equipment_status
bed_availability
staff_availability
updated_at
14.2 Database Principles
Every emergency request must have a unique identifier.
Every status update must be timestamped.
Hospital users must only access authorised hospital records.
Audit records should be append-only.
Duplicate requests must be handled safely.
Availability updates must retain their timestamps.

15. Success Metrics
GoldenHour's performance should be evaluated through measurable operational indicators.
Metric
Description
Initial Target
Time to First Claim
Time between request creation and first task claim
Under 90 seconds
Alert Delivery Time
Time taken for an alert to reach the hospital dashboard
Under 2 seconds under normal conditions
Request Completion
Percentage of requests with a recorded closure status
To be measured
Family Flow Completion
Percentage of users successfully submitting a request
To be measured
Hospital Response
Percentage of alerts acknowledged within 90 seconds
Target: at least 75%
Availability Freshness
Percentage of hospital records updated within the agreed freshness window
To be measured
System Reliability
Availability of the application during pilot hours
Target: 99%

These are proposed development and pilot targets, not proven outcomes.

16. Pilot Implementation Plan
16.1 Pilot Objective
Validate whether GoldenHour improves communication between families and hospital emergency departments.
16.2 Pilot Structure
Phase
Activities
Phase 1 — Preparation
Register a participating hospital, configure capabilities and create staff accounts.
Phase 2 — Testing
Test emergency request creation, alert delivery, task claiming and escalation.
Phase 3 — Controlled Pilot
Run GoldenHour alongside existing emergency communication procedures.
Phase 4 — Evaluation
Analyse response times, staff feedback, system reliability and request completion.
Phase 5 — Improvement
Resolve issues and prepare for expansion.

16.3 Pilot Requirements
One participating hospital.
One emergency department display.
Hospital administrator.
Participating emergency department staff.
Verified hospital capability information.
Stable internet connection.
Defined escalation responsibility.
Agreed privacy and data retention policy.
GoldenHour should initially operate alongside existing emergency processes. It must not replace established emergency communication channels.

17. Risks and Mitigation
Risk
Potential Impact
Mitigation
Outdated hospital availability
Incorrect hospital recommendations
Timestamp updates and flag stale information
Staff ignoring alerts
Reduced operational effectiveness
Simple dashboard and limited notifications
Poor internet connectivity
Delayed communication
Retry mechanisms and visible last-updated status
Incorrect emergency category
Inappropriate capability matching
Use clear category descriptions and retain clinical decision-making with professionals
Duplicate requests
Confusing hospital dashboard
Unique request IDs and duplicate prevention
False or unnecessary alerts
Staff workload
Monitor false activation rates and refine the request workflow
Privacy concerns
Reduced user trust
Data minimisation and role-based access
Multiple simultaneous emergencies
Resource conflicts
Display all active requests clearly; leave prioritisation to hospital professionals


18. Future Enhancements
The following features may be considered after successful pilot validation.
Integration with 108 ambulance services.
Additional regional language support.
Integration with hospital information systems.
Read-only ambulance location updates through authorised integrations.
Advanced hospital capacity management.
Multi-hospital coordination.
Historical emergency analytics.
District-level emergency coordination.
Automated operational reporting.
Hospital performance insights.
Any future AI functionality must be carefully evaluated and must not independently diagnose, triage or make clinical decisions.

19. Acceptance Criteria
The initial version of GoldenHour will be considered functionally complete when the following end-to-end workflow works reliably:
A family member opens the platform without installing an application.
The user selects an emergency category.
The user shares or enters their location.
The system displays suitable hospitals using registered capability and availability information.
The user submits an emergency request.
The selected hospital receives the alert in real time.
The alert appears on the hospital dashboard.
Hospital staff can claim the preparation tasks.
The system triggers escalation at the configured time.
The family can view request status.
Hospital staff can mark the patient as arrived.
Hospital staff can close the request.
The complete sequence is recorded with timestamps.
The platform must also handle unavailable hospitals, failed network requests, outdated availability information and duplicate submissions without presenting misleading information.

20. Conclusion
GoldenHour aims to address one of the most overlooked problems in emergency healthcare: the communication gap between the moment an emergency is recognised and the moment the hospital is ready to receive the patient.
By connecting families with suitable hospitals and giving emergency departments advance notification, GoldenHour aims to improve coordination, visibility and preparedness.
The platform does not attempt to replace doctors, ambulance services or existing emergency systems. Instead, it acts as a coordination layer that helps these stakeholders communicate more effectively.
GoldenHour — Every second matters. Every connection counts.

Document: GoldenHour Product Requirements Document
Version: 1.0
Prepared by: Team GoldenHour
Status: Prototype Development

@