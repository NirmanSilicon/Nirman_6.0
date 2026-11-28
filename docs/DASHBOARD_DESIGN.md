# Dashboard design

All four dashboards share the shell: eyebrow (role), greeting heading, one-line purpose, preference pills (primary only), tab strip, then a grid of cards. Everything shown is either real saved data or an honest empty state.

| Dashboard | Top of page | Cards |
|---|---|---|
| Primary | "Good evening, <name>" with pills for the chosen send and receive ways and text/theme | **Start a conversation** hero with the relay (input -> SANGAM -> output, labelled "your saved choices, not a live connection") and a button into the workspace; **Your invitation code** with Copy; action tiles (Sign recognition, Phraseboard, Voice-to-text, Interpreter) |
| Supporter | "Your support space" | Four counts from the server (connected people, waiting for approval, conversations in progress, interpreter requests open); Connect with someone, Open a conversation, Request an interpreter, View sessions; My connections; Recent activity (real notifications only) |
| Community | "Learn, connect and participate" | Continue learning (next lesson), Your progress (completed of 23 lessons, from the learning content and the server), learning paths with per-path counts, your interests and level, resources |
| Interpreter | "Interpreter workspace" | Verification status badge (honest: Not submitted / Pending review / Verified / Rejected / More information needed), availability, pending requests, active sessions; incoming requests (or "Requests appear after verification"); professional profile with an edit link |

## Rules

- No fake activity: "Nothing new" and "No notifications" are shown when that is true.
- Counts never include unverified or invented data.
- The primary dashboard never claims a live connection; the relay is a diagram of saved choices.
- Calls to action are the next real step for the person's state (e.g. an unverified interpreter is pointed to Verification).
- Cards stack to one column on narrow screens (RESPONSIVE_DESIGN.md).