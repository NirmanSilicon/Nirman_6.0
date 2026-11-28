/*
 * AudioWorklet that hands raw microphone samples to sound.js in blocks of about 43 ms.
 * It only copies numbers. It does not record, store or send anything.
 */
class SangamMicTap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(2048); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i];
        if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice(0)); this.n = 0; }
      }
    }
    return true;
  }
}
registerProcessor("sangam-mic-tap", SangamMicTap);
