# Braille output: what exists, and how to verify a physical display

## What exists today

1. An on-screen **preview** of uncontracted (Grade 1) English Braille using Unicode Braille patterns (U+2800 block), wrapped to a chosen width, with Copy. Characters it cannot represent are reported, not guessed.
2. **Routing to a display adapter.** When the receiver's profile includes Braille, each incoming message (and each sound alert) is converted and sent to every **connected** registered adapter, wrapped to that adapter's `cells` width.
3. A **Devices** area in the Braille panel: connect, test, disconnect, last status and last error per adapter.

It is **not** Grade 2 (contracted) Braille, it does **not** cover other languages, and **no real display driver is bundled**. No physical display was available to testing. The only adapter exercised by the tests is a **TEST-ONLY JavaScript object** that records what it was sent. The screen text "Physical Braille display: none connected" stays accurate until a real adapter connects.

## The adapter contract

`window.SangamBraille.register(adapter)` returns `true` if accepted:

```js
{
  id: "vendor-model",              // required, unique
  name: "Vendor model",            // shown to the user
  cells: 40,                       // optional: display width in cells (default 32, minimum 4)
  isAvailable(): boolean,          // e.g. is Web Bluetooth/HID/Serial present
  connect(): Promise,              // called from a user click; request the device here
  sendCells(string): Promise,      // wrapped lines joined with "\n"; resolve when handed to the device
  disconnect(): Promise
}
```

Other calls: `SangamBraille.setConnected(id, on, why)` (an adapter reports a lost connection), `SangamBraille.state()`, `SangamBraille.adapters()`.

Behaviour you can rely on:

* The app never connects by itself. The user presses **Connect**.
* If `sendCells` rejects, the error is shown against that adapter, and the sender is **not** told the message was fully delivered to the person: the receipt reads "Delivered to X's device, but it may not have reached X in the way they prefer. It was shown on screen." (The sender is not told which output failed.)
* A resolved `sendCells` means "handed to the device". Most displays give no read-back, so SANGAM cannot confirm that cells were raised.

Possible transports are Web Bluetooth, WebHID or Web Serial (Chromium only; see the capability check in "What comes next"). Their presence in a browser is **not** proof that any particular display works.

## Verification procedure for a real display (not yet performed)

1. Use a display whose protocol is documented (for example BRLTTY/BrlAPI, or a vendor HID spec). Record model and firmware.
2. Implement the adapter in a separate file loaded after `outputs.js`. Do not hard-code vendor secrets.
3. Connect from a click on a secure page (https or localhost). Confirm the browser permission prompt names the right device.
4. In **Test**, send the 26 letters, digits with the number sign, a capital letter, a capital word, punctuation and a line longer than the display width. A Braille reader must confirm each cell against the on-screen preview.
5. Send a real message from a second device and confirm it arrives. Unplug or power off the display and confirm the UI returns to not connected and the sender's receipt says it may not have reached the person.
6. Only then change the status in `assets/next.js` to a tested label, and record who tested, on what device, and when.
