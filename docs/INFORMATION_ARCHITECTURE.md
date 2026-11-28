# Information architecture

## Public (no account)

| Route | Page |
|---|---|
| `#/` | Landing: hero, about, how it works, impact, footer (Help, Privacy, Terms, Support) |
| `#/signin`, `#/register`, `#/forgot`, `#/reset/<token>` | Authentication |
| `#/help`, `#/privacy`, `#/terms` | Help and plain-language policies (also inside the signed-in shell) |
| `#/dashboard` and `#/dashboard/<tool>` | Guest tools: Sign Language, Voice and Captions, Phraseboard, Assistance, and the others. A banner says nothing is saved |
| `#/join/<session>/<token>` | Join a chat session from a QR code |

## Account flow (signed in)

`#/verify` -> `#/role` -> `#/onboarding/<step>` -> `#/me`.

## Signed-in sections

All under `#/me/<section>`; the section list depends on the role (see ROLE_ARCHITECTURE.md). Sections that are the existing tools (Sign Language, Voice and Captions, Phraseboard, Assistance) link to `#/dashboard/<tool>`, inside a role-filtered tab strip.

## Navigation model

- No left sidebar. A horizontal header (primary destinations only) plus a tab strip (all sections).
- Header shows at most three destinations plus the bell and account menu, so the bar never overflows.
- Every page has one `<h1>`, a title, and a skip link target.
- Unknown sections fall back to Overview. Section names a role does not have also fall back.

## Content rules

No invented numbers, events, people, testimonials or activity. Counts come from the server; an empty list says it is empty and what to do next.