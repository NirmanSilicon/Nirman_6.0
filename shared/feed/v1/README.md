# Published feed, version 1

The one stream every display and side quest reads (PRD section 4). The phone produces it; the
laptop relays it; the blueprint, the First-Person HUD, the wristbands and the replay viewer consume
it. **Consumers never change core code; they only read this feed.** Changing this file is a
cross-team change (Constitution Article 7): propose it in `docs/SESSIONS.md` first.

The phone's session files (`files/sessions/session_*.jsonl`, pulled with `adb`) contain the same
messages, so a recording is a replay of the feed.

## Transport

| Hop | How |
| --- | --- |
| Phone → laptop | TCP to `127.0.0.1:8765` on the phone, tunnelled over USB with `adb reverse tcp:8765 tcp:8765` (D9). One JSON object per line, UTF-8, `\n`-terminated |
| Laptop → phone | Same socket. The laptop sends `{"v":1,"type":"ack","t":<laptop ms>}` every 500 ms. No ack for 2 s = link lost |
| Laptop → consumers | WebSocket `ws://127.0.0.1:8000/feed`: every phone message, unchanged, plus `"rx"` (laptop receive time, ms since the Unix epoch). On connect, the latest message of each type is sent first, so a consumer that joins late sees the current state at once |

Messages are fire-and-forget. A consumer that falls behind loses messages; it must never slow the
phone. The phone drops queued messages, oldest first, rather than wait for the laptop.

## Common fields (every message)

| Field | Type | Meaning |
| --- | --- | --- |
| `v` | int | Contract version: `1` |
| `type` | string | One of the types below |
| `t` | int | Phone time, ms since phone boot (`SystemClock.elapsedRealtime`). Same clock in every message |

Coordinates: boxes are `[left, top, right, bottom]` in 0..1 of the **upright camera frame**
(portrait, 480 × 640 on the Vivo), origin top-left. Frame timestamps `frameNs` are ns since phone
boot, so a display can draw results against the frame they came from (PRD 10).

## Message types

### `hello`: once per connection, first

`device`, `flavour` (`dev` | `demo`), `detectorModel`, `frame` (`{"w":480,"h":640}`), `kit` (the
class names Saarthi may speak, D15), `intrinsics` (`{"fx","fy","cx","cy"}` in pixels of the upright
frame, from Camera2; added 29 Oct, version 1 addition).

### `perception`: after every detector run (about 6–8 per second)

| Field | Meaning |
| --- | --- |
| `frameNs` | Timestamp of the frame the detector ran on |
| `detectorMs` | Detector run time |
| `raw` | Raw detector output: `[{"label","score","box"}]`. COCO class names. Unfiltered (System 2 needs raw scores) |
| `tracks` | The tracker's tracks: `[{"id","label","score","box","hits","confirmed","presence","said","reason"}]`. `score` is smoothed; `presence` = share of recent detector runs that saw it; `said` = the brief would name it now; `sure` = it passes every speaking rule, even if this brief leaves it out because the user already knows it (displays colour by `sure`; added 31 Oct, D38); `reason` = why not (null when said) |
| `pose` | The phone's pose **at this frame's time** (added 29 Oct): `tiltDeg` (lens below the horizon; 90 = straight down, negative = pointing up), `rollDeg`, `yawDeg` (turn about the vertical, positive right, arbitrary zero, unwrapped), `forwardYawDeg` (slow average of yaw = the user's forward, D19), `rotationDegS`. **null** when the phone has no orientation for this frame; then `table`, `view` and `world` are absent |
| `table` | `{"heightM","source","rulers"}`: the camera's height above the table; `source` = `rulers` (known-size kit objects) or `default` (none seen yet, 0.40 m); `rulers` = rulers used in this run (D20) |
| `view` | The camera's footprint on the table: four `[x, y]` corners (image bottom-left, bottom-right, top-right, top-left) in the **body frame**, or null where an edge never reaches the table |
| `world` | The world map (PRD 5.1), one entry per physical object or person: `[{"id","label","seen","track","pos","bearingDeg","distM","reach","clock","relation","resting","moving","baseCutOff","ageMs","said","reason"}]`. `seen` = `in_view` · `out_of_view` (camera turned away) · `not_seen` (in view, undetected); `track` = live track id or null; `pos` = `[x, y]` metres in the **body frame** (x right, y forward, origin at the chest), null for people and tables or when the object is too near the horizon to place (D20); `bearingDeg` = from the user's forward, positive right; `reach` = `within` · `just_beyond` · `out` · null; `clock` = 1..12 (displays only; speech uses plain directions since 29 Oct, D24); `direction` = `ahead` · `slightly left` · `slightly right` · `left` · `right` (what Saarthi says; added 29 Oct); `relation` = `{"rel","to"}` (`behind`, `in front of`, `left of`, `right of`; `to` = a world id) or null; `ageMs` = since last seen; `said`/`sure`/`reason` as for tracks. Entry ids are stable while the object is remembered; they are not track ids |
| `belief` | The belief map (Phase 3, added 30 Oct): `[{"world","label","pos","state","evidenceMs","note","lostSaid","sinceMs"}]`. `pos` = where the user believes it is, body frame; `state` = `ok` · `moving` · `moved_pending` · `back_pending` · `hidden` · `not_seen` · `lost` · `out_of_view` · `unknown`; `evidenceMs` = how long the current evidence has held; `note` = why; `sinceMs` = phone time the user was told; `direction` = the believed spot in plain words, as the world map's (added 1 Nov, D44). Absent without the IMU |

### `brief`: each time Saarthi speaks a brief

`utterance` (id or null), `text`, `items` (`[{"phrase","tracks":[ids],"world":[ids]}]`), `leftOut`
(`[{"track","world","label","reason"}]`; `track` is null for a remembered object out of view, `world`
null for a track with no world entry), `waitedToSettle`, `tapToDecisionMs`, `clipReady`. (`world`
fields added 29 Oct.)

### `hands`: hand-tracker runs with a hand in view, and the one run in which they disappear (added 29 Oct, version 1 addition)

About 10 per second while a hand is in view (D7). `frameNs`, `ms` (run time), `hands`:
`[{"side","score","box","landmarks","tipOnTable"}]`. `side` = `left` | `right` (the user's hand;
MediaPipe's mirrored label is corrected for the back camera); `landmarks` = 21 `[x, y]` in 0..1 of the
upright frame, MediaPipe's order (0 wrist, 4 thumb tip, 8 index tip); `tipOnTable` = the index
fingertip on the table plane in the body frame, **assuming the fingertip is at table height** (true
when touching the table; a raised hand is placed too far), or null. An empty `hands` list means the
hands just left the view.

### `speech`: when an utterance ends

`utterance`, `path` (`CLIP` = prepared audio, `LIVE` = synthesised on demand), `tapToFirstAudioMs`,
`interrupted`.

### `heard`: each press-and-hold request (added 28 Oct, version 1 addition)

`text` (the transcript; sound tags removed), `intent` (as understood), `model` (`base.en` | `tiny.en`),
`audioS`, `transcribeMs`, `releaseToDecisionMs` (finger lifted → reply chosen), `reply` (the
sentence spoken, or null). Added 3 Nov (D58): `guess` and `similarity` when Saarthi asked "Did you mean …?". The utterance's own timing follows as a `speech` message.

### `health`: when a degradation state changes (added 28 Oct, version 1 addition)

`camera` (`OK` | `DIM` | `BLOCKED`), `thermal` (`NOMINAL` | `WARM` | `HOT` | `CRITICAL`),
`thermalStatus` (Android's 0–6, on thermal changes), `spoken` (the sentence said, or null); added 3 Nov
(D59): `heat` (as in `rates`), and `thermal` now comes from all heat signals, not Android's status alone.

### `alert`: Saarthi spoke unasked because the world and the user's belief diverged (added 30 Oct, Phase 3)

`kind` (`moved` · `lost` · `back`; Phase 4: `correction` = a told object is a picture after all, `settled` / `unsure` = the answer to an open "is it real?"; `torch` = the answer after the torch test, D38), `label`, `text` (what was said), `cause` (the evidence, e.g. "bottle
rests 0.31 m from where the user believes, for 650 ms"), `from` / `to` (world ids), `utterance`.
Added 1 Nov (D44), for `moved` · `lost` · `back`: `evidenceMs` (how long the evidence held before
speaking), `believed` (`{"pos","direction","toldMs"}`: where the user believed it, body frame, and the
phone time they were told), `now` (`{"pos","direction"}` where it is now, or null when gone). The
Mind view's theory-of-mind panel shows the false belief from these.
Added 1 Nov (D46): `kind` = `stopped`: a hand was heading to where the user may still believe an object
is; said before it arrived. Same `believed` / `now` fields (`believed.toldMs` null for a spot corrected
earlier), plus `reach` = `{"watched","distance","angleDeg","etaMs","speed"}`: `watched` = `stale` (an
earlier correction) or `pending` (not yet said); `distance` from the fingertip in frame fractions; the
hand's speed in frames per second.

### `read`: a "read this" request was answered (added 30 Oct)

`ms` (recognition time), `chars`, `script` (`latin` | `devanagari`), `heading` (whether one was found),
`linesLeft` (for "read on"), `requestToSpeechMs`. The text itself is only spoken, never sent.

### `sos`: the safety SOS (added 1 Nov, D47)

`state` = `alert` (a fall started the countdown; `situation` as it will be texted, `simulated` = a dev
trigger, `fall` = `{"freeFallMs","impactG"}`, `spike` = `{"aboveRoomDb","msBeforeFall"}` or null) ·
`sent` / `failed` (`detail`, `location` = whether one was attached, `stillSince`) · `cancelled` (the user
answered) · `closed` (back to normal after sending). The contact's number, the SMS text's location and
any coordinates are never in the feed.

### `personal`: my watch, and "what's this?" (added 1 Nov, D49)

`event` = `teach` (`name`, `mine`, `views` captured, `ok`) · `ask` ("is this my watch?") · `what`
("what's this?" when a taught object was under the finger) · `wrong_pickup` (the look-alike in the hand,
said unasked). Judgements carry `decision` (`mine` · `not_mine` · `unsure` · `none`), `mine` / `other`
(best cosine similarity to the user's views and to the look-alike's), `margin` (= mine − other), `gap`
(the margin needed), `embedMs`, and `said`. No images or vectors are in the feed.

### Optional online brain (added 1 Nov, D51)

- `ask` (phone → laptop, on the same socket): `id`, `question`, `image` (one JPEG frame, base64). The
  laptop removes `image` before recording or relaying (`imageBytes` = its size); the phone's own file
  never holds it either.
- `answer` (laptop → phone, and relayed): `id`, `text` or `error`, `model`, `ms` (the cloud's time).
- `online` (phone): `event` = `on` · `off` · `answer` (`question`, `answer`, `verdict` = `agrees` ·
  `contradicts` · `unchecked`, `reason`, `model`, `cloudMs`, `said`) · `failed` (`error`).

### `rates`: every 2 s

`cameraFps`, `detectorRunsPerS`, `detectorP50Ms`, `detectorP90Ms`, `gapP50Ms`, `gapP90Ms`; added 29 Oct:
`handsPerS`, `handsP50Ms`, `pose` (latest, same fields as above); added 31 Oct: `system2P50Ms`, `system2P90Ms` (System 2 per detector run), `grayP50Ms` (its grey-frame part, burst runs only), `imuClockOffsetMs` (sensor clock minus
the frame clock on the first sample; −6 ms on the Vivo = the same clock); added 3 Nov (D59): `preparedFps` (D60; replaces D59's `stride`: how many of the sensor's 30 frames a second are prepared, 30 while
guiding, else 20, 15 when hot; `cameraFps` counts the prepared ones), `heat`
{`tier`, `status`, `headroom` (Android's forecast, 1.0 = throttling), `batteryC`, `bigCapMHz` (the big cores'
clock cap, 30 s median; null when an app cannot read it)}.

### `link`: the phone's view of the link

`state` (`connected` | `lost`), `spoken` (whether the user was told).

### `guidance`: one cue from the core (**emitted since 30 Oct**, Phase 3)

The single stream that audio, vibration, the BLE wristbands and the HUD all consume (PRD 4). No
consumer makes its own cues, and **nothing is sent before reach guidance exists: no placeholder
events.**

| Field | Meaning |
| --- | --- |
| `event` | `guide_left` · `guide_right` · `closer` (go forward, towards the target) · `guide_back` (the hand went past it; v1 addition) · `arrived` · `look_again` |
| `mode` | `hand` (a tracked hand is steered to the target) · `aim` (no hand: the camera's aim is steered) |
| `intensity` | 0..1: how strong or how close (pulse rate for haptics; no amplitude control on the Vivo) |
| `target` | **World-map id** of the target (not a track id; changed before first emission) |
| `label` | The target's class (v1 addition) |
| `correction` | True for a wrong-way reach corrected at once, outside the beat (v1 addition) |
| `phrase` | What was said with it, or null (v1 addition) |
| `vector` | Target minus fingertip (hand) or minus the frame centre (aim), `[dx, dy]` in 0..1 of the frame, or null (v1 addition) |
| `bias` | The reach-bias estimate: `{"x","y","reaches","confident"}`, frame fractions, y negative = stops short (v1 addition); added 1 Nov (D48): `meanX`, `meanY` (raw means of the samples) and `seX`, `seY` (their standard errors) |

### `system2`: real vs picture, after each detector run while anything is assessed (added 31 Oct, Phase 4)

Sent after the `perception` message of the same run, and once more (with an empty list) when nothing
is assessed any more. An object appears only once some evidence about it exists (docs/SYSTEM2.md).

| Field | Meaning |
| --- | --- |
| `frameNs` | The frame the evidence came from (same as that run's `perception`) |
| `bounds` | `{"state","reject","priorReal"}`: the evidence sum at which "real" is stated (Wald: ln 19 = 2.94) or "picture" is (−2.94); the prior used only to show a probability |
| `objects` | `[{"world","label","track","s1Score","calibrated","llr","pReal","verdict","doubt","screen","cues"}]`. `world` = world-map id; `track` = live track id or null; `s1Score` = the detector's smoothed score; `calibrated` = null until calibration exists (Phase 4 step 6); `llr` = summed log-likelihood ratio, positive = real; `pReal` = probability of real after the evidence; `verdict` = `real` · `picture` · `unsure`; `doubt` = why it is held back from speech, or null; `screen` = the screen class it lies inside, or null; `cues` = `[{"cue","llr","views","detail"}]`, each cue's capped sum over distinct views, e.g. `{"cue":"in_screen","llr":-1.2,"views":1,"detail":"inside a laptop's box","counted":true}`; `counted` = false for evidence against "real" while the object was never inside a screen (D37). `size` = `{"widthM","readings","plausible"}`, its median width on the table, or null (D41); an object appears also when only its size does not fit. `plane` (message level) = the last motion check `{"world","ratio","motionPx","ringPoints","boxPoints"}` or null |

`cue` is `in_screen`, `moves_as_plane`, `screen_light` or `torch` (D38: the torch test's reading; it overrules `in_screen` and `screen_light`).

### `torch`: System 2's torch test, once per "is it real?" (added 31 Oct, D38)

Exposure locked, one frame with the phone's torch off and one with it on; each object asked about is
compared with the table (a screen gives off its own light; a real object reflects the torch).

| Field | Meaning |
| --- | --- |
| `ms` | From the start of the test to its end |
| `complete` | Both frames were taken (false: timed out) |
| `objects` | `[{"world","label","objectGain","refGain","ref","share","saturated","finding","llr","detail"}]`. `objectGain` / `refGain` = brightness with the torch on ÷ off, of the object's middle and of the reference; `ref` = `table` (the table outside every box) or `scene` (the frame outside every box); `share` = (objectGain − 1) ÷ (refGain − 1), about 1 for a real object, about 0 for a screen; `saturated` = share of the object's pixels burnt out with the torch on; `finding` = `reflects` · `emits` · `unclear` · `no_light`; `unevenness` = spread of the torch gain over the middle and rim of the object (0 = even; null if not measurable; D39); `curved` = reflects and uneven (rounded, real); `llr` = the evidence given to the ledger (0 when nothing was concluded) |

### Reserved for later versions (do not use yet)

`maps` (belief map and divergences, Phase 3), `frame` (live preview for the HUD, P1). Their fields
will be added here as version 1 additions; a consumer must ignore unknown types and fields.
(`hands` and the world map fields above were reserved here until 29 Oct.)

## Example (from a real session; RECORDED)

See `example.jsonl` next to this file.
