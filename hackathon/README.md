# MyPrivacyCheck

**ASSESS → UNDERSTAND → IMPROVE.** MyPrivacyCheck is a self-reported, educational privacy assessment. It does not access devices, app accounts, or social media accounts, and it never asks for social passwords. Scores are rule-based indicators, not a guarantee of security.

## Run locally

1. Use Python 3.10+ and create/activate a virtual environment.
2. Install dependencies: `pip install -r requirements.txt`
3. Optional MySQL configuration: create the database, then set `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_HOST`, and `MYSQL_PORT`. Without these variables the app uses SQLite for a quick demo.
4. Set a production `DJANGO_SECRET_KEY`; for local development Django has a clearly marked development-only fallback.
5. Run `python manage.py migrate`, then `python manage.py createsuperuser`, then `python manage.py runserver`.
6. Visit `http://127.0.0.1:8000/`. Admin analytics are at `/secure-admin/` for staff accounts; Django's content admin is at `/django-admin/`.

The assessment question bank is seeded on first assessment load. Each answer has a transparent 0–3 risk value and category weights; results and recommendation state are stored per user. Password reset email uses Django's configured email backend. For production, configure an SMTP backend, set `DJANGO_DEBUG=0`, set `DJANGO_ALLOWED_HOSTS`, rotate `DJANGO_SECRET_KEY`, serve behind HTTPS, and set `DJANGO_SECURE_SSL_REDIRECT=1` when the deployment's proxy/HTTPS setup supports it.

## Features

- Django authentication, password validation, CSRF-protected forms, per-user result/report access, and staff-only admin analytics.
- Three assessment categories with 18 guided questions; scores use answer points, question weights, and category weights.
- Personalized findings/actions, status tracking, assessment history, progress visualization, and downloadable PDF report.
- Public Privacy Academy with six interactive modules, assessment-based learning recommendations, and per-user knowledge-check history kept separate from privacy-risk scores.
- Responsive dark/light dashboard styling, mobile navigation, educational resources, team page, and contact form.

## Checks

`python manage.py test privacy`
