/* Pranava audio engine — every built-in sound is synthesized live with the
   Web Audio API. No audio files, no network, infinitely tunable. */
const Aud = {
  ctx: null, master: null, ambGain: null,
  ambNodes: [], ambTimers: [], ambId: null,
  buffers: {}, _noise: null,

  init() {
    if (this.ctx) return;
    // iOS: route Web Audio to the media channel so the ringer/silent
    // switch does not mute the bells (Safari 16.4+)
    if ('audioSession' in navigator) {
      try { navigator.audioSession.type = 'playback'; } catch (e) {}
    }
    const C = window.AudioContext || window.webkitAudioContext;
    this.ctx = new C();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    // gentle warmth filter — rounds off any harsh highs from every sound
    this.warm = this.ctx.createBiquadFilter();
    this.warm.type = 'lowpass'; this.warm.frequency.value = 5200; this.warm.Q.value = 0.6;
    this.master.connect(this.warm);
    this.warm.connect(this.ctx.destination);
    this.ambGain = this.ctx.createGain();
    this.ambGain.gain.value = 0.5;
    this.ambGain.connect(this.master);
  },
  resume() { this.init(); if (this.ctx.state === 'suspended') this.ctx.resume(); },
  /* must be called from inside a user gesture once — iOS unlocks audio
     by playing a (silent) buffer synchronously within the tap */
  unlock() {
    this.resume();
    try {
      const b = this.ctx.createBuffer(1, 1, 22050);
      const s = this.ctx.createBufferSource();
      s.buffer = b; s.connect(this.ctx.destination); s.start(0);
    } catch (e) {}
  },
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
  /* squared curve: knob position matches perceived loudness.
     100% = the file's own full volume, 0% = silence */
  setAmbVol(v) { this.init(); this.ambGain.gain.value = v * v; },

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

  /* ——— bells & bowls — all tuned to the 432 Hz family (108 · 216 · 432 · 864 · 2160) ——— */
  bowl(vol = 1) {
    this.resume(); const t = this.ctx.currentTime + 0.02, base = 216; // 432/2
    [[1, .5, 3.8], [2.0, .17, 2.6], [2.96, .09, 1.8], [4.2, .04, 1.1]].forEach(([r, p, tau]) => {
      this.partial(base * r * 0.9992, p * vol, t, tau, 16);
      this.partial(base * r * 1.0028, p * vol * .8, t, tau, 16);
    });
    this.strike(t, .03 * vol, .025, base * 6);
  },
  gong(vol = 1) {
    this.resume(); const t = this.ctx.currentTime + 0.02, base = 108; // 432/4 — the sacred 108
    [[1, .4, 4.8], [1.5, .26, 3.8], [2.05, .18, 3], [2.66, .11, 2.3],
     [3.43, .06, 1.7], [4.28, .035, 1.2]].forEach(([r, p, tau]) => {
      this.partial(base * r * 0.9985, p * vol, t, tau, 17);
      this.partial(base * r * 1.003, p * vol * .7, t, tau, 17);
    });
    this.strike(t, .07 * vol, .25, 400);
  },
  tingsha(vol = 1) {
    this.resume(); const t = this.ctx.currentTime + 0.02, base = 2160; // 432×5
    this.partial(base, .16 * vol, t, 1.5, 7);
    this.partial(base * 1.015, .14 * vol, t, 1.5, 7);
    this.partial(base * 2, .025 * vol, t, .8, 4);
    this.strike(t, .02 * vol, .015, 4300);
  },
  bell(vol = 1) {
    this.resume(); const t = this.ctx.currentTime + 0.02, base = 432;
    [[1, .35, 2.2], [2.0, .12, 1.5], [3.01, .05, 1]].forEach(([r, p, tau]) => {
      this.partial(base * r, p * vol, t, tau, 9);
      this.partial(base * r * 1.003, p * vol * .7, t, tau, 9);
    });
    this.strike(t, .018 * vol, .02, 1700);
  },
  tick() {
    this.resume(); const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = 864; // 432×2
    g.gain.setValueAtTime(.1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.08);
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
      case 'in':   this.sweep(324, 432, Math.min(phaseDur * 0.5, 1.4)); break; // rising to 432
      case 'out':  this.sweep(432, 288, Math.min(phaseDur * 0.5, 1.6)); break;
      case 'hum':  this.hum(Math.min(phaseDur, 8)); break;
      case 'hold': this.sweep(431, 432, 0.35, .06); break;
      case 'rest': this.bell(.35); break;
      case 'pump': break; // metronome ticks handle it
    }
  },
  hum(dur) {
    this.resume(); const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 108;
    o2.type = 'sine'; o2.frequency.value = 108 * 1.007;
    f.type = 'lowpass'; f.frequency.value = 300;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.08, t + 0.4);
    g.gain.setValueAtTime(.08, t + dur - 0.5);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.master);
    o.start(t); o2.start(t); o.stop(t + dur); o2.stop(t + dur);
  },
  voice(text, voiceName) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voiceName) {
      const v = speechSynthesis.getVoices().find(v => v.name === voiceName);
      if (v) u.voice = v;
    }
    u.rate = 0.8; u.pitch = 0.72; u.volume = 0.9; // slow and deep — mystic
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
        const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
        const g = this.ctx.createGain(); g.gain.value = .5;
        [[108, .15], [108 * 1.005, .1], [216, .05], [324, .02]].forEach(([fr, p]) => {
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

  /* ——— library sounds (served from the repo, cached after first play) ——— */
  async decodeUrl(url) {
    this.init();
    if (this.buffers[url]) return this.buffers[url];
    const ab = await (await fetch(url)).arrayBuffer();
    const buf = await this.ctx.decodeAudioData(ab);
    this.buffers[url] = buf;
    return buf;
  },
  async playUrl(url, vol = 1) {
    this.resume();
    const buf = await this.decodeUrl(url);
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(g); g.connect(this.master); s.start();
  },

  /* ——— imported sounds ——— */
  async decodeImported(id) {
    const key = 'imp:' + id;
    if (this.buffers[key]) return this.buffers[key];
    const rec = await SoundDB.get(id);
    if (!rec) return null;
    // new records store a raw ArrayBuffer; legacy ones a Blob
    const ab = rec.buf ? rec.buf.slice(0) : await rec.blob.arrayBuffer();
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
