# Security and privacy

## Controls in the code (all covered by `server/test-accounts.js`)

| Area | Control |
|---|---|
| Passwords | scrypt (N=16384, r=8, p=1), random salt; minimum 10 characters, a letter and a number; refused if on a short common list or equal to the email; never returned or logged; login does a dummy hash for unknown emails so timing does not reveal accounts |
| Sessions | 256-bit random token, stored only as a SHA-256 hash; cookie `sangam_sid` is `HttpOnly`, `SameSite=Lax` (and `Secure` on https); 7 days, or 30 with "keep me signed in"; a 12-hour idle limit applies unless "keep me signed in" was ticked; sign-out ends that session, a password change signs out the other devices, a password reset signs out every device |
| CSRF | Every state-changing request must carry `X-Sangam-Client: 1` and, if an `Origin` header is present, it must match the host |
| Rate limits | Per IP for register, login, verify, resend, forgot, reset, lookup, connection and interpreter requests; plus a per-email login limit that is not scaled up for tests |
| Authorisation | Each route checks sign-in, verified email, role, and (for another person's data) an approved connection with the specific permission. Responses about other people contain only the display name. Interpreter verification can be changed only by an `ADMIN_EMAILS` account |
| Static files | Only `/assets` and `/vendor` are served. Before this work the whole project folder, including `.env`, `data/` and `server/`, was downloadable |
| Output | All user text is escaped before display; field lengths limited; control characters stripped |
| Data minimisation | Invitation lookup shows the display name only; "discover by email" is off by default; session history stores who and when, never message text |

## Privacy statements the app makes (and keeps true)

- Camera pictures are not recorded or uploaded; sign landmarks are stored only on the device, only for signs you teach, deletable. The only picture the server holds is an optional profile picture the person chooses (resized on their device to a small image).
- Preferences describe how someone wants to communicate; they are shown to a supporter only if the primary user ticked "See how I like to send and receive messages".
- Voice navigation sends sound to the browser's speech service in some browsers; the consent screen says so.
- No analytics, advertising or third-party scripts.
- **No email is sent.** The app never says an email was sent. Development links are shown on screen and labelled "NOT emailed".

## Operator checklist for a real deployment

1. Serve over https and set `NODE_ENV=production` (turns off on-screen verification links).
2. Add an email sender (not included) or set `REQUIRE_EMAIL_VERIFICATION=0` and accept unverified addresses.
3. Set `ADMIN_EMAILS` to the people who may verify interpreters; check certificates yourself with the issuing body.
4. Keep `DATA_FILE` outside any web-served folder and back it up; it holds password hashes and profiles.
5. Run a single server process.
6. Put a reverse proxy in front for TLS and set `TRUST_PROXY=1` only when you control that proxy.
7. Have the privacy text in the app (`#/privacy`) reviewed for your jurisdiction. It is plain-language text, not legal advice.

## Known gaps

No account lockout beyond rate limits, no two-factor sign-in, no email change confirmation to the old address, no security audit by a third party, no penetration test.