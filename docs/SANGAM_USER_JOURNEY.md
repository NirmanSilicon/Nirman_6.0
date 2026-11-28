# SANGAM user journey

One app, one backend, one design system, four account experiences.

## First visit

Landing page (`#/`, ink-purple hero with layered depth) -> **Get started** (`#/register`) or **Sign in** (`#/signin`) or "Or try the tools as a guest" (`#/dashboard`, no account, a banner says nothing is saved).

## Account creation

1. **Register**: name, email, password (rules shown before the first error: 10+ characters, a letter, a number), accept terms. Errors appear in a summary at the top that takes focus, and under each field.
2. **Verify email**: there is no mail service. In development mode the page shows the verification link, labelled "NOT emailed". With `NODE_ENV=production` and no sender, set `REQUIRE_EMAIL_VERIFICATION=0` (see SECURITY_AND_PRIVACY.md). Resend has a 60 s cooldown shown on the button.
3. **Choose how you use SANGAM**: four cards (Primary, Supporter, Community, Interpreter). Choosing Interpreter does not make anyone verified.
4. **Role onboarding**: a short wizard, saved to the server after every step, resumable on any device (see ONBOARDING_FLOW.md).
5. **Dashboard** for that role.

## Returning

Sign in -> the same gate decides where to go: unverified -> verify; no role -> role choice; unfinished onboarding -> the next unfinished step ("Step 2 of 5, 25% complete"); otherwise the dashboard. "Keep me signed in" lasts 30 days, otherwise 7 days with a 12 hour idle limit.

## Inside the app

Header: brand, role navigation (Overview, Communicate, Connections ... role-specific), notification bell with unread count, account menu (Account settings, Help, Sign out). A tab strip repeats the role's sections on every page. On phones the header collapses to a Menu button.

## Connecting people (Primary <-> Supporter)

Primary user shares an 8-character invitation code -> Supporter looks it up (sees the display name only) and sends a request -> the Primary user gets a notification -> **Approve** opens a dialog with three separate permissions, defaulting to only "start conversations" -> either side can end the connection at any time.

## Interpreter journey

Onboard (languages, qualifications, availability) -> **Submit my details for review** -> status "Pending review" -> an administrator verifies, rejects or asks for more information (only administrators can change the status) -> a verified, available interpreter whose languages match is notified of requests; the first to accept starts a session.

## Leaving

Settings -> Delete account (password and explicit confirmation) removes the account and tells connected people the connection ended. Export gives the person's own data as JSON.