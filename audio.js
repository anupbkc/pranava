/* Pranava audio engine — every built-in sound is synthesized live with the
   Web Audio API. No audio files, no network, infinitely tunable. */
const Aud = {
  ctx: null, master: null, ambGain: null,
  ambNodes: [], ambTimers: [], ambId: null,
  buffers: {}, _noise: null,

  init() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext;
    this.ctx = new C();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.ambGain = this.ctx.createGain();
    this.ambGain.gain.value = 0.5;
    this.ambGain.connect(this.master);
  },
  resume() { this.init(); if (this.ctx.state === 'suspended') this.ctx.resume(); },
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
  setAmbVol(v) { this.init(); this.ambGain.gain.value = v; },

  noiseBuffer() {
    if (this._noise) return this._noise;
    const len = this.ctx.sampleRate * 4;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._noise = buf;
    return buf;
  },
  brownBuffer() {
    if (this._brown) return this._brown;
    const len = this.ctx.sampleRate * 4;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    this._brown = buf;
    return buf;
  },

  /* one decaying partial */
  partial(f, peak, t0, tau, dur, dest) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.008);
    g.gain.setTargetAtTime(0, t0 + 0.01, tau);
    o.connect(g); g.connect(dest || this.master);
    o.start(t0); o.stop(t0 + dur);
  },
  strike(t0, gain, dur, freq) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuffer();
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t0); s.stop(t0 + dur + 0.05);
  },

  /* ——— bells & bowls ——— */
  bowl(vol = 1) {
    this.resume(); const t = this.ctx.currentTime + 0.02, base = 196;
    [[1, .5, 3.5], [2.94, .22, 2.2], [5.35, .11, 1.4], [8.4, .05, .8]].forEach(([r, p, tau]) => {
      this.partial(base * r * 0.999, p * vol, t, tau, 15);
      this.partial(base * r * 1.0035, p * vol * .8, t, tau, 15);
    });
    this.strike(t, .05 * vol, .03, base * 8);
  },
  gong(vol = 1) {
    this.resume(); const t = this.ctx.currentTime + 0.02, base = 82;
    [[1, .4, 4.5], [1.51, .28, 3.6], [2.05, .2, 3], [2.66, .14, 2.3],
     [3.43, .09, 1.7], [4.28, .06, 1.2], [5.7, .04, .9]].forEach(([r, p, tau]) => {
      this.partial(base * r * 0.998, p * vol, t, tau, 16);
      this.partial(base * r * 1.004, p * vol * .7, t, tau, 16);
    });
    this.strike(t, .12 * vol, .25, 500);
  },
  tingsha(vol = 1) {
    this.resume(); const t = this.ctx.currentTime + 0.02;
    this.partial(2472, .22 * vol, t, 1.3, 6);
    this.partial(2472 * 1.022, .2 * vol, t, 1.3, 6);
    this.partial(2472 * 2.1, .05 * vol, t, .7, 4);
    this.strike(t, .04 * vol, .015, 5000);
  },
  bell(vol = 1) {
    this.resume(); const t = this.ctx.currentTime + 0.02, base = 660;
    [[1, .35, 1.8], [2.4, .15, 1.2], [3.9, .07, .8]].forEach(([r, p, tau]) => {
      this.partial(base * r, p * vol, t, tau, 8);
      this.partial(base * r * 1.004, p * vol * .7, t, tau, 8);
    });
    this.strike(t, .03 * vol, .02, 2600);
  },
  tick() {
    this.resume(); const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = 1100;
    g.gain.setValueAtTime(.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.07);
  },

  /* ——— breath cues ——— */
  sweep(f0, f1, dur, vol = .1) {
    this.resume(); const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  },
  cue(kind, phaseDur) {
    switch (kind) {
      case 'in':   this.sweep(300, 520, Math.min(phaseDur * 0.5, 1.4)); break;
      case 'out':  this.sweep(520, 290, Math.min(phaseDur * 0.5, 1.6)); break;
      case 'hum':  this.hum(Math.min(phaseDur, 8)); break;
      case 'hold': this.sweep(430, 432, 0.35, .07); break;
      case 'rest': this.bell(.35); break;
      case 'pump': break; // metronome ticks handle it
    }
  },
  hum(dur) {
    this.resume(); const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 130;
    o2.type = 'sine'; o2.frequency.value = 130 * 1.007;
    f.type = 'lowpass'; f.frequency.value = 320;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.08, t + 0.4);
    g.gain.setValueAtTime(.08, t + dur - 0.5);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.master);
    o.start(t); o2.start(t); o.stop(t + dur); o2.stop(t + dur);
  },
  voice(text) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.88; u.pitch = 0.9; u.volume = 0.9;
    speechSynthesis.speak(u);
  },

  /* ——— ambience (looped, until stopped) ——— */
  loopSource(buffer) {
    const s = this.ctx.createBufferSource();
    s.buffer = buffer; s.loop = true;
    return s;
  },
  lfo(freq, depth, target) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.value = freq; g.gain.value = depth;
    o.connect(g); g.connect(target); o.start();
    return o;
  },
  startAmbient(id, importedBuffer) {
    this.resume();
    this.stopAmbient();
    if (id === 'none') return;
    this.ambId = id;
    const keep = n => { this.ambNodes.push(n); return n; };
    if (importedBuffer) {
      const s = keep(this.loopSource(importedBuffer));
      s.connect(this.ambGain); s.start();
      return;
    }
    switch (id) {
      case 'om': {
        const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
        const g = this.ctx.createGain(); g.gain.value = .5;
        [[110, .14], [110 * 1.005, .1], [220, .05], [330, .02]].forEach(([fr, p]) => {
          const o = keep(this.ctx.createOscillator()), og = this.ctx.createGain();
          o.frequency.value = fr; og.gain.value = p;
          o.connect(og); og.connect(f); o.start();
        });
        keep(this.lfo(0.1, .12, g.gain));
        f.connect(g); g.connect(this.ambGain);
        break;
      }
      case 'rain': {
        const s = keep(this.loopSource(this.noiseBuffer()));
        const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
        const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000;
        const g = this.ctx.createGain(); g.gain.value = .2;
        s.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.ambGain); s.start();
        this.ambTimers.push(setInterval(() => {
          if (Math.random() < 0.4) this.sweep(2600 - Math.random() * 1200, 900, 0.035, .018);
        }, 90));
        break;
      }
      case 'ocean': {
        const s = keep(this.loopSource(this.brownBuffer()));
        const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 480;
        const g = this.ctx.createGain(); g.gain.value = .55;
        keep(this.lfo(0.07, .35, g.gain));
        s.connect(lp); lp.connect(g); g.connect(this.ambGain); s.start();
        break;
      }
      case 'wind': {
        const s = keep(this.loopSource(this.noiseBuffer()));
        const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = 1.4;
        const g = this.ctx.createGain(); g.gain.value = .3;
        keep(this.lfo(0.05, 170, bp.frequency));
        keep(this.lfo(0.11, .1, g.gain));
        s.connect(bp); bp.connect(g); g.connect(this.ambGain); s.start();
        break;
      }
      case 'forest': {
        const s = keep(this.loopSource(this.noiseBuffer()));
        const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 260; bp.Q.value = 1.2;
        const g = this.ctx.createGain(); g.gain.value = .1;
        keep(this.lfo(0.06, 120, bp.frequency));
        s.connect(bp); bp.connect(g); g.connect(this.ambGain); s.start();
        const chirp = () => {
          const n = 2 + Math.floor(Math.random() * 3), f0 = 2300 + Math.random() * 900;
          for (let i = 0; i < n; i++)
            setTimeout(() => this.sweep(f0, f0 * (1.2 + Math.random() * .3), 0.09, .03), i * 130);
        };
        this.ambTimers.push(setInterval(() => { if (Math.random() < 0.5) chirp(); }, 2600));
        break;
      }
    }
  },
  stopAmbient() {
    this.ambTimers.forEach(clearInterval); this.ambTimers = [];
    this.ambNodes.forEach(n => { try { n.stop && n.stop(); n.disconnect && n.disconnect(); } catch (e) {} });
    this.ambNodes = []; this.ambId = null;
  },

  /* ——— imported sounds ——— */
  async decodeImported(id) {
    const key = 'imp:' + id;
    if (this.buffers[key]) return this.buffers[key];
    const rec = await SoundDB.get(id);
    if (!rec) return null;
    const ab = await rec.blob.arrayBuffer();
    const buf = await this.ctx.decodeAudioData(ab);
    this.buffers[key] = buf;
    return buf;
  },
  async playImported(id, vol = 1) {
    this.resume();
    const buf = await this.decodeImported(id);
    if (!buf) return;
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(g); g.connect(this.master); s.start();
  },
};
