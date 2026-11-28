# Team ownership and interfaces

- Person 1: own `frontend/`. Create responsive accessible HTML/CSS/JS. All assessment data is manually self-reported.
- Person 2: own Django config, accounts, URL routing and assessment API. Use Django sessions, password hashing, CSRF and authenticated user ownership.
- Person 3: own MySQL setup and database review. Django's built-in User model is the authentication table; do not create a parallel password table. Coordinate migrations.
- Person 4: own `risk_engine/`. Function contract: `calculate_assessment(answers)`. Inputs contain question_id, category, response, weight and question_text. Responses are yes/sometimes/no/not_sure. Return overall_score (0–100), risk_level, category_scores, recommendations and explanation.
- Person 5: own reports and integration. Use saved AssessmentResult objects, provide charts/history and filter all data by request.user.

API: authenticated POST `/api/assessments/submit/` with `{"answers":[{"question_id":1,"response":"yes"}]}`.
Report URL: `/reports/<assessment_id>/`, owner-only.
