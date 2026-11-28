/*
 * Unit tests for assets/sign-static.js (personal static-pose trainer).
 *
 *   node test-sign-static.js
 *
 * Test class: SYNTHETIC. Hands come from test-support/letter-hands.js, which generates geometry; they are not camera frames and
 * not a real person's hand. The shapes are used only as stand-ins for "some personal poses". These tests show the matcher,
 * the rejection rule, storage, deletion and the hold logic behave as designed. They do NOT show accuracy on a real hand and
 * must never be quoted as such.
 */
"use strict";
const S = require("./assets/sign-static.js");
const H = require("./test-support/letter-hands.js");

let pass = 0, fail = 0;
function check(name, ok, extra) { console.log((ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : "")); ok ? pass++ : fail++; }

class FakeStorage { constructor(limit) { this.m = {}; this.limit = limit; } getItem(k) { return k in this.m ? this.m[k] : null; } setItem(k, v) { if (this.limit && v.length > this.limit) throw new Error("QuotaExceededError"); this.m[k] = String(v); } removeItem(k) { delete this.m[k]; } }

let seed = 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
// a "sitting": the same person holds the pose a little differently each time (small shake, small move, small size change)
const sample = (shape, o) => S.features(H.hand(shape, Object.assign({ cx: 0.35 + rnd() * 0.3, cy: 0.45 + rnd() * 0.3, size: 0.17 + rnd() * 0.06, noise: 0.004, aspect: 16 / 9 }, o)), 16 / 9);

console.log("## Features");
const base = H.hand("L", { cx: 0.5, cy: 0.5, size: 0.2, aspect: 16 / 9 });
const f0 = S.features(base, 16 / 9);
check("a hand reading becomes 63 numbers", f0 && f0.length === 63);
const moved = H.hand("L", { cx: 0.3, cy: 0.7, size: 0.2, aspect: 16 / 9 });
check("moving the hand around the picture does not change the features", S.dist(f0, S.features(moved, 16 / 9)) < 1e-6, "dist " + S.dist(f0, S.features(moved, 16 / 9)).toFixed(8));
const bigger = H.hand("L", { cx: 0.5, cy: 0.5, size: 0.3, aspect: 16 / 9 });
check("moving closer to the camera (bigger hand) does not change the features", S.dist(f0, S.features(bigger, 16 / 9)) < 1e-6);
const sameMax = Math.max(...Array.from({ length: 20 }, () => S.dist(sample("L"), sample("L"))));
const crossMin = S.dist(f0, S.features(H.hand("A", { cx: 0.5, cy: 0.5, size: 0.2, aspect: 16 / 9 }), 16 / 9));
check("a different shape is at least 3x further away than the same shape held again", crossMin > 3 * sameMax, "different " + crossMin.toFixed(3) + " vs same-shape worst " + sameMax.toFixed(3));
check("bad input gives null, not a crash", S.features(null) === null && S.features([]) === null && S.features(base.slice(0, 20)) === null && S.features(base.map(() => ({ x: NaN, y: 0, z: 0 }))) === null);

console.log("## Storage, deletion and privacy");
const st = new FakeStorage(); let store = new S.PoseStore(st);
check("a new store is empty and not usable", Object.keys(store.counts()).length === 0 && !store.isAvailable());
for (let i = 0; i < 5; i++) store.add("hello", sample("L"));
check("examples are counted per pose", store.counts().hello === 5);
check("one pose is not enough to recognise anything (needs at least two to tell them apart)", !store.isAvailable());
for (let i = 0; i < 5; i++) store.add("  thank   you  ", sample("A"));
check("names are tidied (spaces collapsed)", store.counts()["thank you"] === 5);
check("two poses with enough examples make the recogniser available", store.isAvailable());
const reloaded = new S.PoseStore(st);
check("poses survive a reload (stored on this device)", reloaded.counts().hello === 5 && reloaded.counts()["thank you"] === 5);
const stored = st.getItem(S.STORE_KEY);
check("what is stored is numbers only: no image, data URL or blob", !/data:|image\/|blob:|<img/i.test(stored) && JSON.parse(stored).poses.hello[0].every((x) => typeof x === "number"));
const exported = JSON.parse(reloaded.exportJSON());
check("the export says it is numbers only and personal, not a standard language", /numbers only/i.test(exported.note) && /not a standard sign language/i.test(exported.note) && exported.format === "sangam-personal-static-poses");
check("a name that is only symbols/empty is refused", (() => { try { store.add("<>", sample("L")); return false; } catch (e) { return /name/i.test(e.message); } })());
check("an unusable reading is refused", (() => { try { store.add("x", [1, 2, 3]); return false; } catch (e) { return /usable/i.test(e.message); } })());
check("angle brackets are stripped from names (no markup stored)", S.cleanLabel("<b>hi</b>") === "bhi/b");
for (let i = 0; i < S.MAX_EXAMPLES + 5; i++) store.add("many", sample("B"));
check("a pose keeps at most " + S.MAX_EXAMPLES + " examples (oldest dropped)", store.counts().many === S.MAX_EXAMPLES);
store.removeLabel("many");
check("deleting one pose removes only that pose", store.counts().many === undefined && store.counts().hello === 5);
const full = new S.PoseStore(new FakeStorage(300));
check("a full device gives a plain error and keeps nothing half-saved", (() => { try { for (let i = 0; i < 4; i++) full.add("p", sample("L")); return false; } catch (e) { return /no room/i.test(e.message) && !full.poses.p || (full.poses.p || []).length < 4; } })());
const many = new S.PoseStore(new FakeStorage());
for (let i = 0; i < S.MAX_POSES; i++) many.add("pose" + i, sample("L"));
check("at most " + S.MAX_POSES + " poses", (() => { try { many.add("one more", sample("L")); return false; } catch (e) { return /up to/.test(e.message); } })());
store.clearAll();
check("'delete all' leaves nothing behind in storage", st.getItem(S.STORE_KEY) === null && Object.keys(store.counts()).length === 0 && Object.keys(new S.PoseStore(st).counts()).length === 0);
const bad = new FakeStorage(); bad.setItem(S.STORE_KEY, "{not json");
check("a damaged saved file does not crash the page", Object.keys(new S.PoseStore(bad).counts()).length === 0);

console.log("## Classification and rejection (synthetic hands)");
store = new S.PoseStore(new FakeStorage());
const TAUGHT = { hello: "L", yes: "A", water: "B" };
Object.keys(TAUGHT).forEach((w) => { for (let i = 0; i < 6; i++) store.add(w, sample(TAUGHT[w])); });
let right = 0, total = 0, wrongWord = 0;
Object.keys(TAUGHT).forEach((w) => { for (let i = 0; i < 20; i++) { const r = S.classify(sample(TAUGHT[w]), store.poses); total++; if (r.label === w) right++; else if (r.label) wrongWord++; } });
check("held-out examples of taught poses are recognised (synthetic, same sitting)", right / total >= 0.9, right + "/" + total + " right, " + wrongWord + " wrong word");
check("no taught pose is turned into a DIFFERENT taught word", wrongWord === 0, wrongWord + " wrong");
let unk = 0, unkTotal = 0; const NOT_TAUGHT = ["C", "F", "W", "Y", "E", "?"];
NOT_TAUGHT.forEach((sh) => { for (let i = 0; i < 12; i++) { const r = S.classify(sample(sh), store.poses); unkTotal++; if (!r.label) unk++; } });
check("shapes that were never taught are mostly rejected as unknown, not forced into a word", unk / unkTotal >= 0.8, unk + "/" + unkTotal + " rejected");
check("a rejection says why", S.classify(sample("W"), store.poses).reason !== "ok");
const one = { hello: store.poses.hello };
check("with only one taught pose nothing is classified", S.classify(sample("L"), one).label === null && S.classify(sample("L"), one).reason === "not_enough_poses");
const thin = { hello: store.poses.hello, yes: store.poses.yes.slice(0, 2) };
check("a pose with fewer than " + S.MIN_EXAMPLES + " examples is not used", S.classify(sample("A"), thin).label === null);
const camera = { x: 0.2, y: 0.8 };
check("the same pose in another part of the picture still matches", S.classify(S.features(H.hand("L", { cx: camera.x, cy: camera.y, size: 0.25, aspect: 16 / 9, noise: 0.003 }), 16 / 9), store.poses).label === "hello");

console.log("## Self-check (leave-one-out)");
const ev = S.evaluate(store.poses);
check("the self-check runs and reports totals", ev.ok && ev.total === 18 && ev.correct + ev.wrong + ev.rejected === ev.total, "correct " + ev.correct + ", wrong " + ev.wrong + ", rejected " + ev.rejected + " of " + ev.total);
check("the self-check reports per pose and warns it is optimistic", ev.perPose.hello && /optimistic/i.test(ev.note) && /other people/i.test(ev.note));
check("the self-check refuses to run on too little data", S.evaluate({ a: store.poses.hello }).ok === false && S.evaluate({}).ok === false);
const jumbled = { hello: store.poses.hello, yes: store.poses.hello.map((v) => v.slice()) };   // two names for the SAME shape: cannot be told apart
const evj = S.evaluate(jumbled);
check("two names for the same hand shape are NOT reported as accurate (ambiguity shows up)", evj.ok && evj.correct / evj.total < 0.7 || evj.rejected + evj.wrong > 0, "accuracy " + (evj.accuracy * 100).toFixed(0) + "%");

console.log("## Hold-to-type stream");
const stream = new S.PoseStream(store, { holdMs: 900 });
const hand = (shape) => [{ landmarks: H.hand(shape, { cx: 0.5, cy: 0.55, size: 0.2, noise: 0.002, aspect: 16 / 9 }) }];
let t = 0, ev1 = null, words = [];
for (let i = 0; i < 40; i++) { t += 50; const e = stream.push(hand("L"), t, 16 / 9); if (e.event === "word") words.push(e.word); ev1 = e; }
check("a pose held about 2 seconds types its word exactly once", words.length === 1 && words[0] === "hello", JSON.stringify(words));
check("while it stays held it reports 'held', not another word", ev1.event === "held");
const shortStream = new S.PoseStream(store, { holdMs: 900 }); let early = []; t = 0;
for (let i = 0; i < 10; i++) { t += 50; const e = shortStream.push(hand("L"), t, 16 / 9); if (e.event === "word") early.push(e); }
check("a pose held for under a second is not typed", early.length === 0);
const sw = new S.PoseStream(store, { holdMs: 600 }); words = []; t = 0;
for (let i = 0; i < 16; i++) { t += 50; const e = sw.push(hand("L"), t, 16 / 9); if (e.event === "word") words.push(e.word); }
for (let i = 0; i < 16; i++) { t += 50; const e = sw.push(hand("A"), t, 16 / 9); if (e.event === "word") words.push(e.word); }
check("changing pose types the next word", words.join(",") === "hello,yes", words.join(","));
for (let i = 0; i < 12; i++) { t += 50; sw.push([], t, 16 / 9); }
words = []; for (let i = 0; i < 16; i++) { t += 50; const e = sw.push(hand("A"), t, 16 / 9); if (e.event === "word") words.push(e.word); }
check("lowering the hand and showing the same pose again types it again", words.join(",") === "yes");
const sup = new S.PoseStream(store, { holdMs: 600 }); sup.suppress("hello"); words = []; t = 0;
for (let i = 0; i < 30; i++) { t += 50; const e = sup.push(hand("L"), t, 16 / 9); if (e.event === "word") words.push(e.word); }
check("right after a capture the pose still being held is not typed", words.length === 0);
for (let i = 0; i < 12; i++) { t += 50; sup.push([], t, 16 / 9); }
for (let i = 0; i < 16; i++) { t += 50; const e = sup.push(hand("L"), t, 16 / 9); if (e.event === "word") words.push(e.word); }
check("...but is typed once the hand has been lowered and shown again", words.join(",") === "hello");
const two = new S.PoseStream(store); const e2 = two.push([hand("L")[0], hand("A")[0]], 100, 16 / 9);
check("two hands in view are not guessed at (one-hand poses only)", e2.event === "seen" && e2.reason === "two_hands");
const nothing = new S.PoseStream(store); words = []; t = 0;
for (let i = 0; i < 40; i++) { t += 50; const e = nothing.push(hand("W"), t, 16 / 9); if (e.event === "word") words.push(e.word); }
check("a hand shape that was never taught never types anything", words.length === 0);

console.log("## Capturing examples");
const cap = new S.Capturer("hello", 6); let res = null, n = 0;
while (!(res && res.done) && n < 200) { n++; res = cap.push(hand("L"), 16 / 9); }
check("capturing collects the requested number of still readings", res.done && res.ok && cap.vecs.length === 6, "after " + n + " frames");
const capMove = new S.Capturer("hello", 6, { maxFrames: 60 }); res = null; n = 0;
while (!(res && res.done) && n < 100) { n++; res = capMove.push([{ landmarks: H.hand("L", { cx: 0.2 + (n % 2) * 0.3, cy: 0.5, size: 0.2, aspect: 16 / 9, rot: (n % 2) * 40 }) }], 16 / 9); }
check("a hand that keeps moving does not produce examples, and capture ends politely", res.done && res.ok === false && res.reason === "timeout" && capMove.vecs.length < 6);
const capNone = new S.Capturer("hello", 6, { maxFrames: 20 }); res = null; n = 0; while (!(res && res.done) && n < 40) { n++; res = capNone.push([], 16 / 9); }
check("capture with no hand in view ends with a timeout, saving nothing", res.done && !res.ok && capNone.vecs.length === 0);

console.log("\n" + pass + " passed, " + fail + " failed (synthetic hands; not evidence of accuracy on a real hand)");
process.exit(fail ? 1 : 0);
