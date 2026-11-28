/*
 * "What comes next": a live capability check for THIS browser plus an honest
 * status list. Nothing here is a promise: each line says what was actually done
 * and how it was verified. Labels come from a fixed vocabulary:
 *
 *   Implemented and automated-tested
 *   Implemented and browser-tested
 *   Implemented but awaiting physical-device testing
 *   Partially implemented
 *   Blocked by external dependency
 *   Not implemented
 */
(function () {
  "use strict";
  var SG = window.Sangam || {};
  var $ = SG.$, esc = SG.esc;
  var root = $("#nextRoot"); if (!root) return;

  var STATUS = [
    ["Real-time two-way chat with delivery states", "Implemented and browser-tested", "Two separate browser sessions. 'Delivered' appears only after the other device confirms."],
    ["Voice captions with review before sending", "Implemented but awaiting physical-device testing", "Review step tested with a stand-in speech engine. A real microphone and the browser's speech service were not available to the test."],
    ["Read text from a photo, then review and send", "Implemented and browser-tested", "English only. Runs on the device with a bundled engine."],
    ["Phrase board: send, custom phrases, duplicate guard", "Implemented and browser-tested", ""],
    ["Spoken output with stop, repeat and voice choice", "Implemented and automated-tested", "Tested against a stand-in speech engine. How it sounds depends on the voices your device has."],
    ["Emergency alert to the people in your session", "Implemented and browser-tested", "Needs a live session. It does not contact emergency services."],
    ["Meaningful haptic patterns (ten, with strength and per-pattern on/off)", "Implemented but awaiting physical-device testing", "Pattern timing and the on/off and strength settings are tested with a stand-in vibration API. Browsers only offer on/off pulses, so strength is done by pulse length, not real intensity. No physical vibration motor was available."],
    ["Braille preview (uncontracted English)", "Implemented and browser-tested", "A visual preview only."],
    ["Physical Braille display", "Partially implemented", "Incoming messages and sound alerts are now routed to any registered display adapter (tested with a TEST-ONLY stand-in object). No real display driver is bundled and nothing was tested with hardware, so no real display is claimed to work."],
    ["Switch scanning", "Implemented but awaiting physical-device testing", "Tested with a keyboard. Not tested with switch hardware."],
    ["Translation between languages", "Blocked by external dependency", "The adapter is built and tested against a local stand-in service. A real provider key and a real translation were not available."],
    ["Odia and Hindi end to end", "Partially implemented", "Interface, script display and capability checks exist. Listening, speaking and translation for these languages depend on your browser and the provider and were not verified on a real device."],
    ["Live voice call between two people", "Implemented but awaiting physical-device testing", "Connection setup tested between two browser sessions on one computer with a test audio source. Not tested on two separate devices or across networks."],
    ["Sound alerts (alarms, sirens, doorbells, horns)", "Implemented and browser-tested", "Real YAMNet model running locally, tested in Chromium with synthetic tones (a smoke-alarm style beep is detected; silence, noise and a speech-like hum are not). Not tested with real recordings of alarms, doorbells or horns, and not tested with a real room and microphone. Not a safety device."],
    ["Sign Language Camera: real hand tracking and your own taught signs", "Implemented but awaiting physical-device testing", "Hand tracking runs in a real browser. Matching logic is tested on synthetic hand skeletons. Not yet tested with real people signing."],
    ["Indian Sign Language (ISL) recognition model", "Blocked by external dependency", "No suitably licensed, tested ISL model could be obtained for this build, so ISL is shown as unavailable. Nothing is guessed."],
    ["Sentence-level sign-language translation", "Not implemented", "Needs co-design with Deaf signers. SANGAM Learn points to official ISL resources instead."],
    ["Deafblind-friendly options (optional preset)", "Partially implemented", "A one-tap, undoable preset of settings you choose yourself (Braille, haptic, larger text, confirm before send), plus a 'shown on screen only' notice when a chosen output could not reach the person. It does not diagnose anything and is under validation: it needs co-design and testing with deafblind people (see docs/DEAFBLIND_VALIDATION_PLAN.md)."],
    ["Messages kept after a restart", "Not implemented", "By design: conversations live in server memory and vanish when a session ends or the server restarts. Your own settings stay on your device, and you can export or delete them in your profile."]
  ];

  function ok(v) { return v ? "Available" : "Not available"; }
  function caps() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    return [
      ["Spoken output", !!(window.speechSynthesis && window.SpeechSynthesisUtterance), "Needed to read text aloud."],
      ["Speech recognition", !!SR, "Needed for live captions. Chrome and Edge only."],
      ["Vibration", typeof navigator.vibrate === "function", "Needed for haptic patterns. Not offered by iPhone Safari or most computers."],
      ["Microphone access", !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia), "Needed for live voice."],
      ["Live voice connection (WebRTC)", typeof window.RTCPeerConnection === "function", "Needed for live voice."],
      ["Secure page (https or localhost)", window.isSecureContext === true, "Browsers only allow the microphone on secure pages."],
      ["Copy to clipboard", !!(navigator.clipboard && navigator.clipboard.writeText), "Used by the Copy buttons."],
      ["USB, serial or Bluetooth device access", !!(navigator.hid || navigator.serial || navigator.bluetooth), "A starting point for a Braille display adapter. Not proof that any display works."]
    ];
  }

  function label(s) { return s.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, ""); }

  function render(transStatus) {
    var rows = caps().map(function (c) { return '<tr><th scope="row">' + esc(c[0]) + '</th><td><span class="cap ' + (c[1] ? "yes" : "no") + '">' + ok(c[1]) + "</span></td><td>" + esc(c[2]) + "</td></tr>"; }).join("");
    rows += '<tr><th scope="row">Translation service</th><td><span class="cap ' + (transStatus.configured ? "yes" : "no") + '">' + (transStatus.configured ? "Configured (" + esc(transStatus.provider) + ")" : "Not configured") + "</span></td><td>Set on the server, never in the browser.</td></tr>";
    var st = STATUS.map(function (s) { return '<tr><th scope="row">' + esc(s[0]) + '</th><td><span class="stat ' + label(s[1]) + '">' + esc(s[1]) + "</span></td><td>" + esc(s[2]) + "</td></tr>"; }).join("");
    root.innerHTML =
      '<h3 class="pbox-h">This browser, right now</h3>' +
      '<div class="tbl-wrap"><table class="next-tbl"><caption class="vis-hidden">What this browser can do</caption><thead><tr><th scope="col">Ability</th><th scope="col">Status</th><th scope="col">Why it matters</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      '<h3 class="pbox-h">What is built, and how it was checked</h3>' +
      '<div class="tbl-wrap"><table class="next-tbl"><caption class="vis-hidden">Feature status</caption><thead><tr><th scope="col">Feature</th><th scope="col">Status</th><th scope="col">Detail</th></tr></thead><tbody>' + st + "</tbody></table></div>" +
      '<p class="honest">Statuses describe testing that was actually done. Nothing is marked complete because it was planned.</p>';
  }

  render({ configured: false, provider: "none" });
  if (window.SangamTranslate) window.SangamTranslate.capabilities().then(function (c) { render(c.translation || {}); });
  window.addEventListener("hashchange", function () { if (location.hash.indexOf("/next") > 0) { if (window.SangamTranslate) window.SangamTranslate.capabilities().then(function (c) { render(c.translation || {}); }); } });
})();
