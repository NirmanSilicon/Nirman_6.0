# MyPrivacyCheck – Reference Project

Windows / VS Code / PowerShell implementation for the five-person team.

## Product boundaries
- All information is manually entered or confirmed by the user.
- No device scanning, installed-app scanning, browser-history collection, social-media account access or screenshot upload.
- Never collect actual passwords for the privacy assessment.
- The score is an indicative awareness index, not breach probability or a guarantee of safety.
- Five assessment categories: Digital Footprint, Application Permissions, Social Media Privacy, Password Habits and Privacy Practices.
- Browser privacy analysis remains future scope.

## Team division
1. Person 1: `frontend/` – HTML, CSS and JavaScript.
2. Person 2: `backend/config/`, `backend/accounts/`, API handling – Django backend and authentication.
3. Person 3: MySQL configuration and database design; review `database/schema.sql` and Django models.
4. Person 4: `risk_engine/` – Python rule-based scores and recommendations.
5. Person 5: `backend/reports/` and report templates – dashboards, charts, history and integration.

## Setup (PowerShell)
Open this folder in VS Code. Terminal > New Terminal:

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

If activation is blocked in this terminal:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

Keep `DB_ENGINE=sqlite` for the first run. Change `DJANGO_SECRET_KEY` in `.env`.

## Initialize and run
```powershell
python backend\manage.py makemigrations assessments
python backend\manage.py migrate
python backend\manage.py seed_questions
python backend\manage.py createsuperuser
python backend\manage.py runserver
```
Open http://127.0.0.1:8000/ and http://127.0.0.1:8000/admin/.

## MySQL (Person 3)
Create a database and user in MySQL:
```sql
CREATE DATABASE myprivacycheck CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mpc_user'@'localhost' IDENTIFIED BY 'replace-with-a-strong-password';
GRANT ALL PRIVILEGES ON myprivacycheck.* TO 'mpc_user'@'localhost';
FLUSH PRIVILEGES;
```
Update `.env`:
```ini
DB_ENGINE=mysql
DB_NAME=myprivacycheck
DB_USER=mpc_user
DB_PASSWORD=replace-with-a-strong-password
DB_HOST=127.0.0.1
DB_PORT=3306
```
Then run `python backend\manage.py migrate`. Django migrations create the tables. `database/schema.sql` is a data dictionary, not a second set of tables to create manually. Do not create a second user/password table.

If `mysqlclient` fails on Windows, install compatible Microsoft C++ Build Tools or follow the official mysqlclient installation guidance. Keep SQLite for initial development until Person 3 confirms MySQL works.

## Integration contract
Frontend submits JSON to `POST /api/assessments/submit/`:
```json
{"answers":[{"question_id":1,"response":"yes"},{"question_id":2,"response":"sometimes"}]}
```
Allowed responses: `yes`, `sometimes`, `no`, `not_sure`. Request must be authenticated and include Django CSRF header. The server validates IDs and responses, saves the answers, calls `risk_engine.scoring.calculate_assessment()` and stores the result. Reports read saved results, not browser-calculated scores.

Risk engine input: list of dictionaries with `question_id`, `category`, `response`, `weight`, `question_text`.
Risk engine output: `overall_score`, `risk_level`, `category_scores`, `recommendations`, `explanation`.

## Tests
```powershell
python backend\manage.py test
```

## Git
```powershell
git status
git add .
git commit -m "Add MyPrivacyCheck reference implementation"
git push -u origin backend-auth
```
Never commit `.env`, secrets, passwords, `venv/` or local database files.

## Review before hackathon use
The included question wording, weights, response mapping and risk thresholds are starter examples. Person 4 and the team must review and document them. `not_sure` is treated as uncertainty, not as safe. Only answered questions are scored; the app's assessment page requires all seeded questions to be answered for a complete submission.
