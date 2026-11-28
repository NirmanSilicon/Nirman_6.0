/*
 * Tests for assets/sign-letters.js (ASL one-handed fingerspelling) using SYNTHETIC hand skeletons
 * (test-support/letter-hands.js: generated geometry, NOT camera frames).
 *
 * What this proves: the rules are self-consistent, distinct, tolerant of noise / left hand / camera shape / tilt / distance,
 * and the stream types a letter once per hold, never while the hand is moving, and never from an unclear shape.
 * What it does NOT prove: that real hands match the synthetic ones. That needs a real camera and a real signer.
 *
 *   node test-sign-letters.js
 */
"use strict";
const SL = require("./assets/sign-letters.js");
const H = require("./test-support/letter-hands.js");
let pass = 0, fail = 0;
function check(name, ok, extra) { console.log((ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : "")); ok ? pass++ : fail++; }
const top = (L, o) => SL.classifyLetter(H.hand(L, o), (o && o.aspect) || 1).top.letter;

console.log("## Static letters on clean synthetic hands");
{
  const wrong = H.letters.filter((L) => top(L, { aspect: 16 / 9 }) !== L);
  check("all 24 static letters (A-Y without J) are recognised on a clean 16:9 hand", wrong.length === 0, wrong.length ? "wrong: " + wrong.join(",") : "24/24");
}

console.log("\n## Robustness (noise, left hand, 4:3 camera, tilt, near/far)");
{
  const confusions = {}; let total = 0, ok = 0;
  const variants = [];
  [16 / 9, 4 / 3].forEach((aspect) => [false, true].forEach((mirror) => [-10, 0, 10].forEach((rot) => [0.12, 0.3].forEach((size) => variants.push({ aspect, mirror, rot, size, noise: 0.002 })))));
  H.letters.forEach((L) => variants.forEach((v) => {
    total++; const got = top(L, Object.assign({ cx: 0.4 + H.rnd() * 0.2, cy: 0.5 + H.rnd() * 0.2 }, v));
    if (got === L) ok++; else { const k = L + "->" + got; confusions[k] = (confusions[k] || 0) + 1; }
  }));
  const pct = Math.round(100 * ok / total);
  check("with noise, a left hand, 4:3 and 16:9 cameras, +-10 degree tilt and near/far hands, at least 90% of letters are right", pct >= 90, pct + "% of " + total);
  const worst = Object.keys(confusions).sort((a, b) => confusions[b] - confusions[a]).slice(0, 6).map((k) => k + " x" + confusions[k]).join(", ");
  console.log("INFO  most common confusions: " + (worst || "none"));
  // left hand vs right hand, one by one
  const mirrorWrong = H.letters.filter((L) => top(L, { aspect: 16 / 9, mirror: true }) !== L);
  check("a left hand (mirror image) gives the same letters as a right hand", mirrorWrong.length === 0, mirrorWrong.length ? "wrong: " + mirrorWrong.join(",") : "24/24");
}

console.log("\n## Orientation separates look-alike letters");
{
  check("G (sideways) and Q (pointing down) differ only by direction", top("G") === "G" && top("Q") === "Q");
  check("K (up) and P (down) differ only by direction", top("K") === "K" && top("P") === "P");
  check("U (together) / V (apart) / R (crossed) are told apart", top("U") === "U" && top("V") === "V" && top("R") === "R");
  check("I (thumb folded in) and Y (thumb out) are told apart", top("I") === "I" && top("Y") === "Y");
  check("S (thumb in front) and T / N / M (thumb tucked in) are told apart", ["S", "T", "N", "M"].every((L) => top(L) === L));
  check("O (fingertips meet thumb, rounded) and C (open) and E (clawed) are told apart", ["O", "C", "E"].every((L) => top(L) === L));
}

console.log("\n## Stream: typing letters by holding a shape still");
function run(stream, segments, fps) {           // segments: [{ letter|null, ms, at?:(t)=>[x,y], o }]
  fps = fps || 12; const dt = 1000 / fps, out = []; let t = 1000;
  segments.forEach((seg) => {
    const n = Math.max(1, Math.round(seg.ms / dt));
    for (let i = 0; i < n; i++, t += dt) {
      let hands = [];
      if (seg.letter) { const p = seg.at ? seg.at(i / n) : [0.5, 0.6]; hands = [{ landmarks: H.hand(seg.letter, Object.assign({ cx: p[0], cy: p[1], aspect: 16 / 9, noise: 0.001 }, seg.o || {})) }]; }
      const ev = stream.push(hands, t, 16 / 9); if (ev.event === "letter") out.push(ev.letter);
    }
  });
  return out.join("");
}
{
  check("holding B still for 1.2 s types exactly one B", run(new SL.LetterStream(), [{ letter: "B", ms: 1200 }]) === "B");
  check("holding B for 5 s still types only one B (a held letter does not repeat)", run(new SL.LetterStream(), [{ letter: "B", ms: 5000 }]) === "B");
  check("a shape held for only 0.3 s is not typed", run(new SL.LetterStream(), [{ letter: "B", ms: 300 }, { letter: null, ms: 600 }]) === "");
  check("a brief wrong shape (0.25 s of A) between two B holds is not typed", run(new SL.LetterStream(), [{ letter: "B", ms: 1000 }, { letter: "A", ms: 250 }, { letter: "B", ms: 400 }]) === "B");
  check("changing shape types the new letter after its own hold: B then L", run(new SL.LetterStream(), [{ letter: "B", ms: 1000 }, { letter: "L", ms: 1000 }]) === "BL");
  check("spelling HELLO (hand lowered between the two Ls)", run(new SL.LetterStream(), [
    { letter: "H", ms: 1000 }, { letter: "E", ms: 1000 }, { letter: "L", ms: 1000 }, { letter: null, ms: 500 }, { letter: "L", ms: 1000 }, { letter: "O", ms: 1000 }]) === "HELLO");
  check("the same letter twice with no pause in between is NOT typed twice (lower the hand to repeat)", run(new SL.LetterStream(), [{ letter: "L", ms: 1000 }, { letter: "L", ms: 1000 }]) === "L");
  check("a hand sweeping across the picture while in a B shape types nothing", run(new SL.LetterStream(), [{ letter: "B", ms: 1500, at: (u) => [0.15 + u * 0.7, 0.6] }]) === "");
  check("a hand shape that matches no letter types nothing, even when held for 3 s", run(new SL.LetterStream(), [{ letter: "?", ms: 3000 }]) === "");
  check("no hand in view types nothing", run(new SL.LetterStream(), [{ letter: null, ms: 2000 }]) === "");
  check("a left hand types the same letters (spell 'ABC')", run(new SL.LetterStream(), [{ letter: "A", ms: 1000, o: { mirror: true } }, { letter: "B", ms: 1000, o: { mirror: true } }, { letter: "C", ms: 1000, o: { mirror: true } }]) === "ABC");
  check("with two hands in view, the nearer (bigger) hand is read", (() => {
    const s = new SL.LetterStream(); let got = "", t = 0;
    for (let i = 0; i < 20; i++, t += 83) { const ev = s.push([{ landmarks: H.hand("L", { cx: 0.7, cy: 0.6, size: 0.1, aspect: 16 / 9 }) }, { landmarks: H.hand("B", { cx: 0.3, cy: 0.6, size: 0.3, aspect: 16 / 9 }) }], t, 16 / 9); if (ev.event === "letter") got += ev.letter; }
    return got === "B";
  })());
}

console.log("\n## Stream: J and Z are drawn in the air");
{
  const jPath = (u) => [0.5 - 0.12 * Math.sin(u * Math.PI * 0.9), 0.35 + 0.35 * Math.min(1, u * 1.4)];     // down, then hooks left
  check("an I handshape that traces a J types J, not I", run(new SL.LetterStream(), [{ letter: "I", ms: 400 }, { letter: "I", ms: 1100, at: jPath }]) === "J");
  check("an I handshape held still types I", run(new SL.LetterStream(), [{ letter: "I", ms: 1200 }]) === "I");
  const zPath = (u) => { const k = u * 3, seg = Math.min(2, Math.floor(k)), f = k - seg; return [seg === 1 ? 0.7 - 0.3 * f : 0.4 + 0.3 * f, 0.4 + 0.1 * u + (seg === 1 ? 0.07 * f : 0)]; };
  check("a pointing index that zig-zags types Z", run(new SL.LetterStream(), [{ letter: "1", ms: 300 }, { letter: "1", ms: 1500, at: zPath }]) === "Z");
  check("a pointing index held still types nothing (it is only the start of Z)", run(new SL.LetterStream(), [{ letter: "1", ms: 1500 }]) === "");
  check("a pointing index drifting in a straight line types nothing", run(new SL.LetterStream(), [{ letter: "1", ms: 1500, at: (u) => [0.3 + 0.4 * u, 0.5] }]) === "");
}

console.log("\n## Digits 0-9");
{
  const dTop = (D, o) => SL.classifyDigit(H.hand(D, o), (o && o.aspect) || 1).top.letter;
  const wrong = H.digits.filter((D) => dTop(D, { aspect: 16 / 9 }) !== D);
  check("all 10 digits are recognised on a clean 16:9 hand", wrong.length === 0, wrong.length ? "wrong: " + wrong.join(",") : "10/10");
  let total = 0, ok = 0; const conf = {};
  H.digits.forEach((D) => [16 / 9, 4 / 3].forEach((aspect) => [false, true].forEach((mirror) => [-10, 0, 10].forEach((rot) => [0.12, 0.3].forEach((size) => {
    total++; const got = dTop(D, { aspect, mirror, rot, size, noise: 0.002, cx: 0.4 + H.rnd() * 0.2, cy: 0.5 + H.rnd() * 0.2 });
    if (got === D) ok++; else conf[D + "->" + got] = (conf[D + "->" + got] || 0) + 1;
  })))));
  check("digits survive noise, a left hand, 4:3 and 16:9 cameras, tilt and distance (at least 90%)", Math.round(100 * ok / total) >= 90, Math.round(100 * ok / total) + "% of " + total);
  if (Object.keys(conf).length) console.log("INFO  digit confusions: " + JSON.stringify(conf));
  check("6, 7, 8, 9 are told apart by which fingertip the thumb touches", ["6", "7", "8", "9"].every((D) => dTop(D) === D));
  check("2 (thumb tucked) and 3 (thumb out) are told apart", dTop("2") === "2" && dTop("3") === "3");
  check("4 (thumb across the palm) and 5 (thumb out) are told apart", dTop("4") === "4" && dTop("5") === "5");
  const ds = () => new SL.LetterStream({ kind: "digits" });
  check("spelling 2025 in digits mode types 2, 0, 2, 5", run(ds(), [{ letter: "2", ms: 1000 }, { letter: "0", ms: 1000 }, { letter: "2", ms: 1000 }, { letter: "5", ms: 1000 }]) === "2025");
  check("in digits mode a held 1 IS typed (in letters mode it is only the start of a Z)", run(ds(), [{ letter: "1", ms: 1200 }]) === "1" && run(new SL.LetterStream(), [{ letter: "1", ms: 1200 }]) === "");
  check("digits mode does not read a zig-zagging finger as Z", run(ds(), [{ letter: "1", ms: 300 }, { letter: "1", ms: 1500, at: (u) => { const k = u * 3, seg = Math.min(2, Math.floor(k)), f = k - seg; return [seg === 1 ? 0.7 - 0.3 * f : 0.4 + 0.3 * f, 0.4 + 0.1 * u]; } }]) === "");
  check("a hand sweeping across the picture in a 5 types nothing", run(ds(), [{ letter: "5", ms: 1500, at: (u) => [0.15 + u * 0.7, 0.6] }]) === "");
}

console.log("\n## Robustness of the unit itself");
{
  check("measure() refuses a hand with the wrong number of landmarks", SL.measure([{ x: 0, y: 0 }]) === null);
  check("classifyLetter() refuses a degenerate hand (all points identical)", SL.classifyLetter(new Array(21).fill(0).map(() => ({ x: 0.5, y: 0.5, z: 0 }))) === null);
  check("classifyLetter() ranks every letter and every score is between 0 and 1", (() => { const c = SL.classifyLetter(H.hand("W")); return c.ranked.length >= 24 && c.ranked.every((r) => r.score >= 0 && r.score <= 1); })());
  check("exports list all 26 letters", SL.ALL_LETTERS.length === 26 && SL.ALL_LETTERS[0] === "A" && SL.ALL_LETTERS[25] === "Z");
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
