# Saarthi: problem, user, USP and pitch strategy

Living discussion document (started 29 Oct 2026). It records research, reasoning and advice for how
we understand the problem and present Saarthi. Each section ends with **decisions** and **open
questions**; new rounds of discussion are appended to the log at the end.

**Evidence labels.** **[web]** = found by web search on 29 Oct 2026, source linked (abstract-level;
read the full paper before quoting numbers on stage). **[memory]** = established idea not re-checked
today. **[ours]** = measured by us, file in `tools/results/`. **[gap]** = we do not have this
evidence yet.

---

## 0. The whole argument on one page

1. **The world changes silently.** For a sighted person, a moved cup announces itself. For a blind
   person, nothing does; their mental picture of the table quietly becomes wrong.
2. **You cannot ask about a change you don't know happened.** Every popular tool (Seeing AI,
   Lookout, Be My Eyes, smart glasses) waits to be asked and must be aimed. They answer questions;
   they cannot catch the moment your picture went wrong.
3. **A tool that speaks without being asked must be extremely selective**, because hearing is a blind
   person's main sense for the world. A talking camera drowns it.
4. **Selective is impossible without knowing what the user already knows.** So Saarthi keeps two
   maps: what is on the table, and what you believe is on the table. It speaks only where they differ.
5. **Speaking only works if what it says is true.** So a second, slower check (System 2) verifies
   before it speaks, and Saarthi says "not sure" rather than guess.
6. **Knowing is not enough; the hand must get there.** So Saarthi guides and corrects the reach.

Every feature we build must sit on this chain. Anything that does not is decoration.

**One-sentence problem:** *When things on a blind person's table change, nobody tells them; and the
apps that try either wait to be asked or never stop talking.*
**One-sentence solution:** *Saarthi watches the table, remembers what you know, and speaks only when
your picture of the table is wrong; then it guides your hand.*

---

## 1. Problem identification: finding it versus understanding it

### 1.1 Surface versus root

"Blind people can't see objects" is the **surface**. It is what most of the 100 teams will solve, and
the answer they build is a detector plus a voice. The root, found by asking "why" until it stops
changing:

| Why? | Answer |
| --- | --- |
| Why can't she find her bottle? | It is not where she left it |
| Why not? | Someone moved it, tidied up, or she put it down absent-mindedly |
| Why is that hard for her and not for a sighted person? | Her method is memory plus fixed places ("a place for everything"); a move silently breaks the method and nothing signals that it broke |
| What does a broken method cost? | Groping, knocked-over glasses, time, and asking others ("where did you put my…?"): dependence |
| Why don't current tools fix it? | They are *pull*: she must suspect a problem, take out the phone, aim it and ask. She doesn't know there is a problem to ask about |

**Root problem:** the cost of an out-of-date mental map falls entirely on the blind person, because
change is silent and today's tools only answer questions she doesn't know to ask.

Evidence that this is real:
- Blind participants report **significant difficulty locating lost, dropped or misplaced objects,
  touching nearly every household task**; they try themselves first, then touch, then digital tools
  last ([web] 2023 interview study, 16 participants: [arXiv 2305.03019](https://arxiv.org/pdf/2305.03019)).
- Orientation and mobility teaching rests on "a place for everything", because consistency
  "greatly reduces frustration"; workplace guides ask colleagues to keep things where they are
  ([web] [OIB-TAC lesson](https://www.oib-tac.org/sites/www.oib-tac.org/files/2023-03/Lesson%209-%20Organization%20and%20Labeling%202021.1.25.pdf),
  [APH workspace guide](https://aphconnectcenter.org/?p=8797)). Our product protects that method when
  other people break it.
- **[gap]** We have no number for *how often* things get moved by others, or minutes lost per day.
  This is the single most important missing fact. See 1.4.

### 1.2 How big the problem is

| Measure | Figure | Source |
| --- | --- | --- |
| Blind people worldwide (2020) | **43.3 million**; 295 million with moderate or severe vision impairment; forecast 61 million blind by 2050 | [web] Lancet Global Health, GBD 2020 ([PubMed 33275950](https://pubmed.ncbi.nlm.nih.gov/33275950/)) |
| India, age 50+ (2015–19 national survey) | Blindness **1.99%**, visual impairment 13.76%; blindness 11.6% at 80+ | [web] NPCB&VI survey ([India Vision Atlas](https://indiavisionatlasnpcb.aiims.edu/?p=358)) |
| India, all ages | Estimates range **about 6–8 million blind**, depending on survey and definition | [web] ([Tribune](https://www.tribuneindia.com/news/archive/nation/india-home-to-20-per-cent-of-world-s-visually-impaired-738048), NPCB documents). Quote as a range, never one number |
| Demand for visual help | Be My Eyes: about 750,000–1 million blind users, **43 million requests a year** (2025, company figures) | [web] ([Be My Eyes](https://www.bemyeyes.com/?p=1003), [Wikipedia](https://en.wikipedia.org/wiki/Be_My_Eyes)) |

Frequency: visual help is a **many-times-a-day need**, not an occasional one. Be My Eyes' request
volume shows the demand even when every request costs effort (open the app, aim, wait, talk).

### 1.3 Why the available solutions are not enough

| Solution | What it does well | Where it fails our user |
| --- | --- | --- |
| White cane | Path, ground, obstacles; trusted, cheap, never fails | Nothing at table height; nothing about what changed |
| Seeing AI, Google Lookout | Free; read, describe, find on request. Seeing AI "Find My Things" learns a personal object from 4 videos (2024) [web] ([Microsoft Research](https://microsoft.com/en-us/research/?p=1042923)); Lookout Find gives direction and distance to cups, bottles, tables [web] ([Google](https://support.google.com/accessibility/android/answer/9031274)) | **Pull**: you must suspect, aim and ask. No memory of what you know. Doesn't notice change |
| Be My Eyes / Be My AI | Human volunteers or a cloud AI describe anything | Pull; needs internet; a stranger in your space; aiming |
| Smart glasses (OrCam, Envision, Meta Ray-Ban) | Hands-free capture | OrCam £2,700–3,700 ex VAT, Envision CAD 3,499–4,899 [web] ([RNIB](https://shop.rnib.org.uk/products/orcam-myeye-pro), [CNIB](https://cnibsmartlife.ca/collections/sight-enhancement)); still mostly pull; cloud AI |
| Hackathon-style "detector + voice" apps | Easy to build | Narrate everything; overconfident labels; we measured this ourselves (SecondSense review, Florence-2 "toilet paper") [ours] |

Two failure facts to use carefully:
- **Aiming is hard without sight:** about **28%** of questions blind users sent with photos were
  unanswerable, largely from blur and framing [web] ([VizWiz, CVPR 2018](https://arxiv.org/pdf/1802.08218)).
  Any tool that needs aiming inherits this. Saarthi is worn and watches the whole table.
- **Assistive tech gets abandoned:** **29.3%** of devices were completely abandoned; predictors
  include not asking users, poor performance and changing needs [web] (Phillips & Zhao 1993,
  [summary](https://ttac.odu.edu/at/giving-students-a-choice)). The lesson for us: involve real users,
  never ship false alarms.

### 1.4 Decisions and open questions

- **Open (highest priority): talk to 3–5 blind or low-vision people before the freeze** (NAB branch,
  a blind school, a college disability cell). Ask: how often are your things moved by others? How
  do you find out? What annoys you about apps? Would you wear a phone on your chest? Record
  consented quotes. One real quote outweighs every statistic above.
- **Open:** do we use the global or India framing on stage? Recommendation: **India first** (the
  judges' context), global as one line.

---

## 2. The user's point of view: removing friction

### 2.1 Who exactly

Primary persona (to be checked against the interviews):

> **Ananya, 21, blind from birth, engineering student.** Studies at a library desk, eats in the
> hostel mess, works in group projects. Uses TalkBack, a cane and WhatsApp voice notes on a
> mid-range Android phone. Independent and proud of it; hates asking friends the same thing twice;
> does not want to look different in public.

Secondary persona: **a 65-year-old with late vision loss** (cataract or glaucoma, the main causes in
India's survey). Not technical. This is the user's "farmer" analogy: **zero learning; no menus, no
modes, no settings**.

### 2.2 Her day at a table, and where it breaks

| Moment | What she does today | Cost |
| --- | --- | --- |
| Sitting down | Sweeps the table with her hands | Knocks things over; touches others' food or papers |
| "Where's my water?" | Gropes, or asks | Spills; dependence |
| Someone tidied the desk | Discovers it only when her hand hits nothing | Lost time; frustration; a broken method |
| Group meeting: "pass it to the person on your right" | Guesses, or asks | Social awkwardness |
| Using an app | Unlock, open app, pick a mode, aim, wait, listen to a list, remember it, act | Six steps for one answer; 28% of photos unusable; both hands busy |

### 2.3 Psychological and cognitive analysis

1. **Hearing is her eyes.** Blind people read the room by sound. A device that talks continuously
   takes over the sense she relies on most. Research: spoken guidance degrades spatial learning under
   load, while spatial audio does not [web] ([UMaine VEMI](https://umaine.edu/vemi/publication/environmental-learning-without-vision-effects-cognitive-load-interface-design));
   environmental sound masks speech feedback [web] ([Ahmetovic et al.](https://iris.unito.it/bitstream/2318/2016332/1/ahmetovic2023enhancing.pdf)).
   **Design law: silence is the default; sound must earn its place.** Our "5 accurate a minute beat 50"
   principle has a cognitive basis, not only a taste basis.
2. **Working memory holds about four items** [memory: Cowan 2001]. A brief longer than 3–5 items is
   forgotten as it is heard. Hence the PRD's 3–5 item brief.
3. **Agency and dignity.** She wants to stay in control: Saarthi informs, never commands. Private
   things are not announced to the room (earphone or vibration in meetings).
4. **Trust is fragile.** The first confident false statement sends her back to her own hands. One
   false alarm costs more than ten correct statements earn (abandonment research, 1.3).
5. **Unknown unknowns.** She cannot ask about what she doesn't know changed. **Proactive is not a
   feature; it is the only way to solve this problem.** But proactive plus talkative equals noise.
   Proactive plus belief map equals Saarthi.

### 2.4 Friction removed, step by step

| Friction today | Saarthi |
| --- | --- |
| Take out phone, unlock, open app | Worn on the chest, always on |
| Aim the camera | Wide view of the table from the chest; no aiming |
| Choose a mode, ask a question | Default is silence; it speaks when your picture is wrong |
| Listen to a list | 3–5 items, ranked; only what you don't know |
| Remember and act | It guides your hand and corrects a wrong reach |
| Internet, subscription | Offline, on a mid-range phone; the laptop is optional extra vision |
| Talking in a quiet meeting | Vibration cues (and optional wristbands) |
| Learning the app | Two gestures: tap = "what's here?", hold = ask in your own words |

### 2.5 A hard truth about our demo set-up

The product is **worn** (chest mount). Holding the phone in one hand at chest level is a demo
shortcut, and it *adds* friction: one hand busy, the camera wobbling. **Recommendation: buy a phone
chest harness (a few hundred rupees, as used for action cameras) and demo with it.** Show the
product as it would be lived with.

### 2.6 Decisions and open questions

- **Decide:** chest harness for the demo (recommended) or handheld.
- **Open:** confirm the persona in the interviews; adjust if real users say otherwise.

---

## 3. USP: why Saarthi, out of 100 teams

### 3.1 What judges have probably already seen

Detector-plus-voice phone apps; smart canes with ultrasonic sensors; "describe the scene" with a
cloud AI; Be My Eyes-style video calls; and possibly a demo of Seeing AI or Lookout. Our USP must be
something none of these do, and it must be *felt* in the first minute.

### 3.2 What is genuinely different (and what is not)

**Not our USP** (others already do it, so never claim it as new):
- Recognising common objects; reading text; describing a scene.
- Recognising *your* personal object (Seeing AI "Find My Things", 2024).
- Direction and distance to an object you asked for (Lookout Find).

**Our USP**, to our knowledge from today's search (say "to our knowledge", never "first in the
world"):

| USP | In one line | Why competitors can't just add it |
| --- | --- | --- |
| **Belief-aware** | "Other apps tell you what the camera sees. Saarthi tells you what you don't know." | Needs a model of the user's knowledge (belief map); pull apps have no notion of what you were told |
| **Proactive but quiet** | Speaks unasked, only when your picture is wrong; otherwise silent | Needs the belief map plus a speech budget; without it proactive equals noise |
| **Closes the loop to action** | Guides the hand; corrects a wrong reach; "that's not your watch" the moment you pick it | Needs hand tracking and target tracking in one frame, on the phone, under 100 ms |
| **Knows when it's wrong** | Won't be fooled by a photo; says "not sure"; shows its reasons | System 2: evidence over views, physics checks, calibration |
| **Offline, mid-range phone** | No internet, no subscription | Engineering choice (Phase 0 numbers) |

The personal-object feature is **not** unique as recognition. It becomes unique as **belief
correction**: Saarthi notices your *action* reveals a wrong belief (you picked the wrong one) and
tells you without being asked. Pitch it that way.

### 3.3 Decisions and open questions

- **Decide:** the stage one-liner. Candidate: *"Every app tells you what the camera sees. Saarthi
  tells you only what you don't know."*
- **Open:** a deeper competitor search (CHI/ASSETS papers on proactive assistance and mental maps)
  before we say "to our knowledge" on stage.

---

## 4. Selling the product: making judges trust it

### 4.1 Who uses it, and is it essential or nice-to-have?

Honest answer: the **cane solves survival** (mobility). Saarthi solves **daily independence in
personal space**: dozens of small moments a day where the alternative is groping, spilling or asking
someone. That is not "nice to have" if the interviews confirm the frequency and the frustration.
**Without that evidence it sounds nice-to-have.** This is why section 1.4 is the top action.

Position: **"The cane is for the path. Saarthi is for the table."** Never claim it replaces the cane.
Judges who know accessibility will stop trusting us the moment we do.

### 4.2 Why a blind person trusts the cane, and what Saarthi must copy

| Why the cane is trusted | Evidence | Saarthi's design law |
| --- | --- | --- |
| **It becomes part of the body**: the brain extends the space around the hand to the cane's tip in long-term users | [web] Serino et al. 2007, *Psychological Science* ([APS](https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.2007.01952.x/)) | Guidance must feel like the body: hand-relative directions ("a little right"), vibration, the same cue meaning the same thing every time |
| **Touch is ground truth**: no interpretation, no false labels | [memory] | Never state a guess as fact; System 2 before speech; "not sure" is allowed |
| **Always works**: no battery, no network, no update | [web] cheap, recognisable, the most used tool ([medRxiv review](https://www.medrxiv.org/content/10.1101/2025.07.07.25330998.full.pdf)) | Offline; degrades gracefully; says what it lost |
| **The user stays in control**: she probes, she decides | [memory] | Saarthi informs, never commands; tap and hold are hers |
| **Predictable** | [memory] | Small, fixed sound vocabulary; same situation, same response |
| **Electronic aids lost**: slower walking, little gain without long training | [web] electronic vs traditional cane study ([UNESP](https://repositorio.unesp.br/handle/11449/196620)) | Zero training; no false alarms; must beat "doing it myself" on the first day |

**Along with the stick, or only Saarthi?** Along with. Saarthi works when she is seated, where the
cane rests against the chair. They never compete for the same moment.

### 4.3 Earning the judges' trust in our engineering

- **Measured, not claimed:** every number on screen comes from a saved run (Phase 0 `DEVICE_REPORT.md`
  already does this). Show latency, false statements per minute, utterances per minute.
- **Show the machine's mistakes:** the raw detector live, mislabelling (charger as mouse, steel bottle
  as "toilet paper"), while Saarthi stays silent. Our weakness becomes proof of System 2.
- **The ablation:** the same recording with System 1 only versus with System 2: false statements per
  minute drop. One chart.
- **State the limits ourselves**, before a judge finds them: fixed demo kit; blindfolded testers are a
  proxy; the laptop does the heavy checks; look-alike watches must differ visibly.

### 4.4 Decisions and open questions

- **Decide:** positioning line "the cane for the path, Saarthi for the table" (recommended).
- **Open:** which three numbers we show (candidates: utterances per minute, false statements per
  minute with and without System 2, change-detection time).

---

## 5. Breaking the ice

### 5.1 Where the awkwardness comes from

1. **Watching a sighted presenter "act blind".** Research: blindfold simulations made **53%** of
   participants judge blind people less capable, against 34% without ([web] Silverman et al. 2015,
   [ScienceDaily](https://www.sciencedaily.com/releases/2015/01/150114140554.htm)). The disability
   community widely criticises simulation. A judge may feel it as performance, or worse.
2. **Not knowing where to look**: phone, laptop, or presenter.
3. **Jargon** before the judge has felt the problem.

### 5.2 How to remove it, with evidence instead of promises

**Do not act blind.** Say plainly: *"I'm sighted. I'll close my eyes so you can watch what Saarthi
does."* Better still, **let the judge experience it**:

> **The 20-second opener (the hook).** "Close your eyes for twenty seconds. Your water bottle is right
> in front of you." A teammate silently moves it. "Now take a sip." The judge's hand meets empty air.
> They smile, slightly uncomfortable: **they have just felt the problem.** "Again, with Saarthi."
> The bottle is moved again. Saarthi: *"Heads up, your bottle moved to your left."* The judge reaches
> left and finds it.

Why this works:
- **Before versus after, live**, in the judge's own hand: no slide can compete.
- **Impossible to stage**: the judge chose to close their eyes, and a judge or teammate moved the
  bottle wherever they liked.
- **Zero jargon**; the explanation comes *after* they have felt it.
- **It does not portray blindness as helplessness**: the point is missing *information*, not missing
  ability. That directly answers the simulation criticism.

Practicalities: ask consent; plastic bottle with a cap (no hot drinks); keep it to 20 seconds; the
judge can open their eyes at any time.

### 5.3 Dead-simple clarity

- One sentence of problem, one of solution (section 0).
- Three signature moments, one number each.
- One screen on the laptop at a time; say where to look ("watch the laptop: this is what Saarthi
  believes you know").

### 5.4 Decisions and open questions

- **Decide:** the judge-experience opener (strongly recommended) instead of the presenter acting blind.
- **Open:** which teammate moves objects; rehearse it invisibly.

---

## 6. The prototype: honest, user's-eye view, before and after

### 6.1 Honesty checklist (a single fake thing ruins everything)

| Risk of looking fake | Our answer |
| --- | --- |
| Mocks or scripted speech | Impossible in the demo build (dev/demo flavours, PRD 7.1). Prepared speech clips are synthesised from computed text only (D11): be ready to explain |
| Objects chosen to suit the model | Say it first: "a fixed kit the phone model knows; bigger models extend it" (D15) |
| Laptop doing the work | Say it: the phone does everything fast and steers the hand; the laptop is optional extra vision; pull the cable later if asked |
| Blindfolded testers | "A proxy, not real users", plus quotes from real blind users once we have them |
| Numbers | Only from saved runs; development and held-out kept apart |
| The phone in the hand | Use the chest harness (2.5) |

### 6.2 Before versus after

1. **Live:** the 20-second opener (5.2).
2. **One comparison table** (slide or printed card): same five situations, competitor versus Saarthi:

| Situation | Seeing AI / Lookout | Be My Eyes | Smart glasses | Saarthi |
| --- | --- | --- | --- | --- |
| Someone moves your bottle | Only if you ask and aim | Only if you call | Mostly only if you ask | Tells you, unasked |
| You reach for the wrong thing | — | — | — | Corrects you at once |
| A photo of an apple | Says "apple" | Human can tell | Says "apple" (usually) | "That's a picture" |
| Needs internet | Partly | Yes | Mostly | No |
| Talks when nothing changed | When asked | — | When asked | Stays silent |

Before we show this, every competitor cell must be checked hands-on (install the apps and try them):
**[gap]** today they are from documentation and our reasoning.

### 6.3 Hook, signatures and wow

| Role | Item | Engineering it proves |
| --- | --- | --- |
| **Hook** (first 60 s) | The 20-second opener: moved bottle, judge's eyes closed | Two maps, divergence, change detection |
| **Expected** (credibility) | Settle-in brief: 3–5 items, people around | Salience; restraint |
| **Signature 1** | Hand passes over the bottle: silence. Bottle really moves: one sentence | Occlusion reasoning, evidence over time |
| **Signature 2** | Picture of an apple on the judge's own phone: "that's a picture"; raw detector fooled on screen | System 2, explanation trace |
| **Signature 3** | Reach correction: wrong way corrected within a second | Hand tracking, guidance, reach bias |
| **Wow** | "That's not your watch" | Belief correction from action |
| **Wow** | The mind view: what Saarthi believes you know, its silences and why | The whole cognitive loop, live |
| **Wow (if time)** | Table approach; wristband pulses on the HUD | Geometry; one event stream |

### 6.4 A 12-minute run of show (draft)

| Time | Beat |
| --- | --- |
| 0:00 | The 20-second opener with a judge (hook) |
| 1:00 | The problem in one sentence + three facts (India numbers, aiming 28%, abandonment 29%) + a real user's quote |
| 2:00 | Settle-in brief (expected) |
| 3:00 | Moved object, and the silent hand pass (signature 1) |
| 5:00 | Real or picture with the judge's phone; the raw detector's mistakes on screen (signature 2) |
| 7:00 | Reach correction, then the wrong watch (signature 3, wow) |
| 9:00 | The mind view walkthrough: perceive → believe → decide → act |
| 10:30 | Numbers and limits, said by us first |
| 11:30 | Close: "The cane is for the path. Saarthi is for the table." |

### 6.5 Decisions and open questions

- **Decide:** the run of show above as the working draft.
- **Open:** hands-on test of Seeing AI, Lookout and Be My AI on the same five situations, saved as
  evidence for the comparison table.

---

## 7. What this means for the build (no change to scope without the team's approval)

1. The minimum demo order stands; this document strengthens *why*: brief → moved object → real or
   picture → reach correction → mind view.
2. **The mind view is the stage centrepiece**: it must show the belief map, silences and their reasons,
   and the speech budget. Build it only as each piece of logic exists.
3. **Personal object**: keep it, but build and pitch it as *belief correction from action*, not as
   recognition (Seeing AI already recognises).
4. **Table approach**: lowest-value core extension for the pitch; keep it last.
5. **Reading text**: competitors already do it well; it stays BONUS.
6. **New, non-code actions**: user interviews (1.4); chest harness (2.5); hands-on competitor test (6.5).

---

## 8. Discussion log

### Round 1 · 29 Oct 2026
Team's brief: problem understanding and metrics; user's point of view and friction; USP; selling and
trust (cane psychology); breaking the ice; an honest prototype with before/after and signatures.
This document is the first answer. Main challenges raised to the team:
- Do not act blind on stage; let the judge experience the problem (5.2).
- The personal-object feature is not unique as recognition; pitch it as belief correction (3.2).
- We have no primary user evidence yet; interviews are the top action (1.4).
- Demo with a chest harness, not handheld (2.5).

### Round 2 · 29 Oct 2026 · team decisions
- **No judge blindfold.** The presenter demonstrates with eyes open and *narrates* the blind user's
  situation ("a blind person can't tell which watch is theirs, so they ask…"), then lets the system
  act. Sections 5.2 and 6.4's opener are replaced by this.
- **Handheld at chest level**, connected to the laptop by USB. No chest harness (2.5 superseded).
- **No user interviews** (1.4 dropped by the team). Claims about users rely on the published research
  in section 1.
- **Stage line adopted:** "Every app tells you what the camera sees. Saarthi tells you only what you
  don't know."
- No other change to the plan.
