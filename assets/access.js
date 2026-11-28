/*
 * Optional access settings that sit on top of the Access profile:
 *   - Deafblind-friendly options (optional, user-configured, under validation: see docs/DEAFBLIND_VALIDATION_PLAN.md)
 *   - Status announcement level
 *   - Confirm-before-send for typed chat messages
 *   - Your data on this device: export, and delete everything
 *
 * Nothing here detects, labels or diagnoses anyone. Every option is a plain setting the person chooses, and the
 * "suggested starting point" changes nothing until they press its button, and can be undone.
 */
(function () {
  "use strict";
  var SG = window.Sangam || {};
  var $ = SG.$, esc = SG.esc;
  var host = $ && $("#profileExtra"); if (!host) return;
  function P() { return SG.profile; }

  var START = { outm: ["braille", "haptic", "captions"], scale: 150, hc: true, confirmSend: true };
  var before = null;

  host.insertAdjacentHTML("beforeend",
    '<div class="pbox wide" id="dbCard"><h3 class="pbox-h">Deafblind-friendly options (optional)</h3>' +
    '<p class="note"><b>Implementation under validation.</b> These are ordinary settings you choose yourself. They have not yet been tested with deafblind people, and SANGAM does not detect, label or diagnose anyone. A co-design and test plan is in <code>docs/DEAFBLIND_VALIDATION_PLAN.md</code>. Nothing changes until you press a button or switch.</p>' +
    '<div class="row"><button class="btn btn-sm" id="dbApply" type="button">Use a suggested starting point</button><button class="btn btn-sm" id="dbUndo" type="button" disabled>Undo that</button></div>' +
    '<p class="note" id="dbDesc">The starting point turns on Braille preview, vibration and captions for receiving; text size 150%; high contrast; and confirm-before-send. Change any of it afterwards, one setting at a time.</p>' +
    '<p class="note" id="dbStatus" role="status"></p>' +
    '<label class="sw mt"><input type="checkbox" id="confirmSend"><span class="tr" aria-hidden="true"></span>Ask me to confirm before a typed chat message is sent</label>' +
    '<p class="note">With this on, the first press of Send (or Enter) only reads the message back. A second press sends it. It applies to typing in the chat box.</p>' +
    '<label for="announce" class="mt">Spoken status updates for screen readers</label>' +
    '<select id="announce"><option value="all">Everything (progress, errors, alerts)</option><option value="important">Important only (errors and alerts)</option><option value="alerts">Alerts only (alarms and emergencies)</option></select>' +
    '<p class="note">Alarms, sound alerts and emergency messages are never silenced by this. It only trims routine progress messages such as "Recognition started".</p></div>' +
    '<div class="pbox wide" id="dataCard"><h3 class="pbox-h">Your data on this device</h3>' +
    '<p class="note">SANGAM keeps chat messages in the server\'s memory only, for the life of the session. They are never written to this device, and they disappear when the session ends or the server restarts. There is no option to keep conversations, by design.</p>' +
    '<p class="note">What <em>is</em> stored on this device, only if you used the feature: your access profile, your sound-alert settings, signs you taught the Sign Language Camera (as hand-position numbers, never pictures), and whether you accepted the camera notice. Nothing else, and nothing leaves this device.</p>' +
    '<div class="row"><button class="btn btn-sm" id="dataExport" type="button">Download my settings and taught signs</button><button class="btn btn-sm" id="dataClear" type="button">Delete everything SANGAM stored on this device</button></div>' +
    '<p class="note" id="dataStatus" role="status"></p></div>');

  var status = $("#dbStatus");
  $("#confirmSend").checked = !!P().confirmSend;
  $("#announce").value = P().announce || "all";
  $("#confirmSend").addEventListener("change", function () { P().confirmSend = this.checked; SG.save(); });
  $("#announce").addEventListener("change", function () { P().announce = this.value; SG.save(); status.textContent = "Status updates set to: " + this.options[this.selectedIndex].text + "."; });

  $("#dbApply").addEventListener("click", function () {
    before = { outm: P().outm.slice(), scale: P().scale, hc: !!P().hc, confirmSend: !!P().confirmSend };
    P().outm = START.outm.slice(); P().scale = START.scale; P().hc = START.hc; P().confirmSend = START.confirmSend;
    SG.save(); SG.applyProfile(); $("#confirmSend").checked = true;
    $("#dbUndo").disabled = false;
    status.textContent = "Applied: receive as Braille, vibration and captions; text size 150%; high contrast; confirm before sending. Press Undo to go back, or change any setting.";
  });
  $("#dbUndo").addEventListener("click", function () {
    if (!before) return;
    P().outm = before.outm; P().scale = before.scale; P().hc = before.hc; P().confirmSend = before.confirmSend;
    SG.save(); SG.applyProfile(); $("#confirmSend").checked = !!P().confirmSend; before = null; this.disabled = true;
    status.textContent = "Undone. Your earlier settings are back.";
  });

  /* ---- data on this device ---- */
  function keys() { var k = []; try { for (var i = 0; i < localStorage.length; i++) { var n = localStorage.key(i); if (/^sangam/i.test(n)) k.push(n); } } catch (e) { /* blocked */ } return k; }
  var armed = false, armTimer = 0, ds = $("#dataStatus"), clearBtn = $("#dataClear");
  $("#dataExport").addEventListener("click", function () {
    var dump = { exportedAt: new Date().toISOString(), note: "SANGAM settings and taught signs from this device. No chat messages, pictures, audio or video are stored or included.", items: {} };
    keys().forEach(function (k) { try { dump.items[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { dump.items[k] = localStorage.getItem(k); } });
    try {
      var url = URL.createObjectURL(new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" })), a = document.createElement("a");
      a.href = url; a.download = "sangam-my-data.json"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      ds.textContent = "Downloaded " + Object.keys(dump.items).length + " stored item(s) as sangam-my-data.json.";
    } catch (e) { ds.textContent = "The download was blocked by the browser."; }
  });
  clearBtn.addEventListener("click", function () {
    if (!armed) {
      armed = true; clearBtn.textContent = "Press again to confirm: delete everything";
      ds.textContent = keys().length + " stored item(s) will be deleted and the page will reload. Taught signs cannot be recovered unless you downloaded them first.";
      clearTimeout(armTimer); armTimer = setTimeout(function () { armed = false; clearBtn.textContent = "Delete everything SANGAM stored on this device"; ds.textContent = "Cancelled. Nothing was deleted."; }, 10000);
      return;
    }
    clearTimeout(armTimer); armed = false;
    var n = keys().length; keys().forEach(function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } });
    try { var sk = []; for (var i = 0; i < sessionStorage.length; i++) { var sn = sessionStorage.key(i); if (/^sangam/i.test(sn)) sk.push(sn); } sk.forEach(function (k) { sessionStorage.removeItem(k); }); } catch (e) { /* ignore */ }
    ds.textContent = "Deleted " + n + " stored item(s). Reloading…";
    setTimeout(function () { location.reload(); }, 400);
  });
})();
