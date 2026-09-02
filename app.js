/* Pranava — UI wiring, meditation timer & breathwork engine. */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
/* escape everything user-controlled before it touches innerHTML (XSS guard) */
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};
const cfg = Object.assign({
  dur: 15, start: 'bowl', end: 'gong', intEvery: 0, intSound: 'bell',
  amb: 'none', ambVol: 0.5, bDur: 5, preset: 'anulom', voice: true, cues: true,
  endMode: '3', cueVol: 1,
}, store.get('pranava.cfg', {}));
const saveCfg = () => store.set('pranava.cfg', cfg);

const BUILTIN_BELLS = [['bowl', 'Singing Bowl'], ['gong', 'Gong'], ['tingsha', 'Tingsha'], ['bell', 'Temple Bell']];
const BUILTIN_AMB = [['none', 'Silence'], ['om', 'Om Drone'], ['rain', 'Rain'], ['ocean', 'Ocean'], ['wind', 'Wind'], ['forest', 'Forest']];
let imported = [];   // [{id, name}]

/* ——— flower of life ——— */
function flowerSVG(size = 300) {
  const R = size / 6.5, cx = size / 2, cy = size / 2, k = Math.sqrt(3) / 2, out = [];
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) {
    if (Math.abs(q + r) > 2) continue;
    out.push(`<circle cx="${(cx + R * (q + r / 2)).toFixed(1)}" cy="${(cy + R * r * k).toFixed(1)}" r="${R.toFixed(1)}"/>`);
  }
  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1" opacity=".85">${out.join('')}
    <circle cx="${cx}" cy="${cy}" r="${R * 3}"/><circle cx="${cx}" cy="${cy}" r="${R * 3 + 5}" opacity=".35"/></g></svg>`;
}
/* time dial — thin ring, progress arc, slow water ripples */
const DIAL_C = (2 * Math.PI * 88);
function dialSVG() {
  const C = DIAL_C.toFixed(1);
  return `<svg viewBox="0 0 200 200">
    <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".3"/>
    <circle cx="100" cy="100" r="82" fill="none" stroke="currentColor" stroke-width=".6" opacity=".14"/>
    <circle class="prog" cx="100" cy="100" r="88" fill="none" stroke="#e9dcc6" stroke-width="2.2" stroke-linecap="round"
      stroke-dasharray="${C}" stroke-dashoffset="${C}" transform="rotate(-90 100 100)"/>
  </svg><i class="ripple"></i><i class="ripple d2"></i><i class="ripple d3"></i>`;
}
['flower-med', 'flower-b', 'flower-live'].forEach(id => $('#' + id).innerHTML = dialSVG());
function setProg(frac) {
  const el = $('#flower-live .prog');
  if (el) el.style.strokeDashoffset = DIAL_C * (1 - Math.min(1, Math.max(0, frac)));
}
/* living flower behind the whole app */
const bgFlower = document.createElement('div');
bgFlower.id = 'bg-flower';
bgFlower.innerHTML = flowerSVG(640);
document.body.prepend(bgFlower);

/* ——— landing splash — pull up (or tap) to enter ——— */
(() => {
  const sp = $('#splash');
  if (!sp) return;
  let sy = null, gone = false;
  const dismiss = () => {
    if (gone) return; gone = true;
    sp.classList.add('up');
    setTimeout(() => sp.remove(), 850);
  };
  sp.addEventListener('touchstart', e => sy = e.touches[0].clientY, { passive: true });
  sp.addEventListener('touchmove', e => { if (sy !== null && sy - e.touches[0].clientY > 55) dismiss(); }, { passive: true });
  sp.addEventListener('wheel', e => { if (e.deltaY > 15) dismiss(); }, { passive: true });
  sp.addEventListener('click', dismiss);
})();
/* iOS audio + speech unlock — must happen inside the first real touch */
['touchend', 'click'].forEach(ev =>
  document.addEventListener(ev, () => { Aud.unlock(); Aud.primeVoice(); }, { once: true, capture: true }));
/* and stay resilient: any later tap revives a suspended/interrupted context */
['touchend', 'click'].forEach(ev =>
  document.addEventListener(ev, () => { if (Aud.ctx && Aud.ctx.state !== 'running') Aud.ctx.resume(); }, { capture: true }));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.running && !S.paused) Aud.resume();
});

/* ——— tabs ——— */
$$('#tabs button').forEach(b => b.onclick = () => {
  $$('#tabs button').forEach(x => x.classList.toggle('active', x === b));
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + b.dataset.view));
});

/* ——— sound pickers ———
   imported sounds route by length: ≤45s → bells, >45s → ambience loops */
const AMBIENT_MIN_SEC = 45;
const isAmbient = s => s.dur > AMBIENT_MIN_SEC;
let libSounds = { bells: [], ambience: [] };
const libFind = id => libSounds.bells.concat(libSounds.ambience).find(s => s.id === id);
function bellOptions() {
  return BUILTIN_BELLS
    .concat(libSounds.bells.map(s => ['lib:' + s.id, s.name]))
    .concat(imported.filter(s => !isAmbient(s)).map(s => ['imp:' + s.id, s.name]));
}
function ambOptions() {
  return BUILTIN_AMB
    .concat(HEALING.map(h => ['heal:' + h.id, h.name]))
    .concat(libSounds.ambience.map(s => ['lib:' + s.id, s.name]))
    .concat(imported.filter(s => !s.dur || isAmbient(s)).map(s => ['imp:' + s.id, s.name + ' (loop)']));
}
/* reset the play/stop state of every ambience grid button */
function clearAmbButtons() {
  ['#amb-grid', '#lib-grid', '#heal-grid'].forEach(sel => {
    const g = $(sel); if (!g) return;
    [...g.children].forEach(x => { x.classList.remove('on'); if (x.textContent[0] === '■') x.textContent = '▶ ' + x.textContent.slice(2); });
  });
}
function fillSelect(sel, opts, val) {
  sel.innerHTML = opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
  if (opts.some(([v]) => v === val)) sel.value = val;
}
function refreshSelects() {
  fillSelect($('#sel-start'), bellOptions(), cfg.start);
  fillSelect($('#sel-end'), bellOptions(), cfg.end);
  fillSelect($('#sel-int-sound'), bellOptions(), cfg.intSound);
  fillSelect($('#sel-amb'), ambOptions(), cfg.amb);
  fillSelect($('#sel-amb-b'), ambOptions(), cfg.amb);
}
function playBell(id, vol = 1) {
  if (id.startsWith('imp:')) Aud.playImported(+id.slice(4), vol);
  else if (id.startsWith('lib:')) { const s = libFind(id.slice(4)); s && Aud.playUrl(s.file, vol); }
  else Aud[id] && Aud[id](vol);
}

/* closing chime — one, several, or a gentle rising wake so a low-volume
   gong is never missed. Returns roughly how long the sequence lasts (ms). */
let closeTimers = [];
function stopClosing() { closeTimers.forEach(clearTimeout); closeTimers = []; }
function playClosing(preview) {
  stopClosing();
  Aud.resume();
  const mode = cfg.endMode || '3';
  let count, gap, rising;
  if (mode === '1') { count = 1; gap = 0; rising = false; }
  else if (mode === '5') { count = 5; gap = 2600; rising = false; }
  else if (mode === 'wake') { count = 7; gap = 3200; rising = true; }
  else { count = 3; gap = 2600; rising = false; }
  if (preview && mode === 'wake') { count = 4; gap = 1400; } // shorter taste when auditioning
  for (let i = 0; i < count; i++) {
    const vol = rising
      ? Math.min(1, 0.3 + i * (0.7 / Math.max(1, count - 1)))  // start soft, swell louder
      : (i === 0 ? 1 : 0.8);
    closeTimers.push(setTimeout(() => playBell(cfg.end, vol), i * gap));
  }
  return (count - 1) * gap + 3000;
}
function startAmbience(tok) {
  const fresh = () => tok === undefined || tok === ambToken || S.running;
  if (cfg.amb.startsWith('imp:')) {
    Aud.resume();
    Aud.decodeImported(+cfg.amb.slice(4)).then(buf => buf && fresh() && Aud.startAmbient(cfg.amb, buf));
  } else if (cfg.amb.startsWith('lib:')) {
    Aud.resume();
    const s = libFind(cfg.amb.slice(4));
    s && Aud.decodeUrl(s.file).then(buf => fresh() && Aud.startAmbient(cfg.amb, buf));
  } else if (cfg.amb.startsWith('heal:')) {
    const h = healFind(cfg.amb.slice(5));
    if (h) { Aud.resume(); Aud.startHealing(h); }
  } else Aud.startAmbient(cfg.amb);
}
['sel-start', 'sel-end', 'sel-int-sound'].forEach(id => $('#' + id).onchange = e => {
  cfg[{ 'sel-start': 'start', 'sel-end': 'end', 'sel-int-sound': 'intSound' }[id]] = e.target.value;
  saveCfg(); playBell(e.target.value, .7);
});
$('#sel-endmode').value = cfg.endMode;
$('#sel-endmode').onchange = e => {
  cfg.endMode = e.target.value; saveCfg();
  playClosing(true); // preview the chosen chime pattern
};
$('#sel-int').value = String(cfg.intEvery);
$('#sel-int').onchange = e => {
  cfg.intEvery = +e.target.value; saveCfg();
  // running meditation: re-aim the next bell from where we are now
  if (S.running && S.mode === 'meditate') {
    const elMin = S.elapsedMs / 60000;
    S.nextBellMin = cfg.intEvery ? (Math.floor(elMin / cfg.intEvery) + 1) * cfg.intEvery : Infinity;
  }
};
let ambPrevT = null, ambToken = 0;
[$('#sel-amb'), $('#sel-amb-b')].forEach(sel => sel.onchange = e => {
  cfg.amb = e.target.value; saveCfg();
  $('#sel-amb').value = cfg.amb; $('#sel-amb-b').value = cfg.amb;
  const tok = ++ambToken; // a newer selection or expired preview cancels this one
  if (S.running && !S.paused) startAmbience(tok);
  else {
    // not in a session: play a short preview so the choice is audible
    Aud.setAmbVol(cfg.ambVol); startAmbience(tok);
    clearTimeout(ambPrevT);
    ambPrevT = setTimeout(() => { ambToken++; if (!S.running) Aud.stopAmbient(); }, 8000);
  }
});

/* one volume, every knob — all sliders mirror cfg.ambVol instantly */
function setAmbVolume(v, skipEl) {
  cfg.ambVol = v; saveCfg();
  Aud.setAmbVol(v);
  [$('#rng-amb'), $('#rng-bg'), $('#rng-lib')].forEach(el => { if (el && el !== skipEl) el.value = v; });
  const pct = Math.round(v * 100) + '%';
  ['#amb-pct', '#bg-pct', '#lib-pct'].forEach(sel => { const el = $(sel); if (el) el.textContent = pct; });
}
$('#rng-amb').value = cfg.ambVol;
$('#rng-lib').value = cfg.ambVol;
$('#amb-pct').textContent = Math.round(cfg.ambVol * 100) + '%';
$('#lib-pct').textContent = Math.round(cfg.ambVol * 100) + '%';
$('#rng-amb').oninput = e => setAmbVolume(+e.target.value, e.target);
$('#rng-lib').oninput = e => setAmbVolume(+e.target.value, e.target);
$('#chk-cues').checked = cfg.cues;
$('#chk-cues').onchange = e => { cfg.cues = e.target.checked; saveCfg(); };
$('#chk-voice').checked = cfg.voice;
$('#chk-voice').onchange = e => { cfg.voice = e.target.checked; saveCfg(); };

/* device speech voices for the breathwork guide */
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  if (!vs.length) return;
  fillSelect($('#sel-voice'), vs.map(v => [v.name, v.name.replace(/\s*\(.*/, '')]), cfg.voiceName);
  if (!cfg.voiceName) cfg.voiceName = $('#sel-voice').value;
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();
$('#sel-voice').onchange = e => {
  cfg.voiceName = e.target.value; saveCfg();
  Aud.voice('The mind is calm', cfg.voiceName);
};

/* ——— duration chips ——— */
function renderChips(el, values, current, onPick) {
  el.innerHTML = '';
  const chip = (label, active, fn) => {
    const b = document.createElement('button');
    b.className = 'chip' + (active ? ' active' : '');
    b.innerHTML = label;
    b.onclick = fn;
    el.appendChild(b);
    return b;
  };
  values.forEach(v =>
    chip(v === 0 ? '∞' : v, v === current, () => { onPick(v); renderChips(el, values, v, onPick); }));
  // custom minutes — pencil chip becomes an inline input
  const isCustom = !values.includes(current);
  chip(isCustom ? current + '<small>min</small>' : '✎', isCustom, () => {
    const inp = document.createElement('input');
    inp.type = 'number'; inp.min = 1; inp.max = 600;
    inp.value = isCustom ? current : 25;
    inp.className = 'chip-input';
    el.lastElementChild.replaceWith(inp);
    inp.focus(); inp.select();
    const commit = () => {
      const n = Math.round(+inp.value);
      if (n >= 1 && n <= 600 && n !== current) { onPick(n); renderChips(el, values, n, onPick); }
      else renderChips(el, values, current, onPick);
    };
    inp.onblur = commit;
    inp.onkeydown = e => { if (e.key === 'Enter') inp.blur(); };
  });
}
const MED_DURS = [5, 10, 15, 20, 30, 45, 60, 0];
const B_DURS = [3, 5, 10, 15, 20, 0];
function medLabel() {
  $('#med-dur-label').textContent = cfg.dur === 0 ? '∞' : cfg.dur;
  $('#med-dur-unit').textContent = cfg.dur === 0 ? 'open' : 'min';
}
renderChips($('#dur-chips'), MED_DURS, cfg.dur, v => {
  cfg.dur = v; saveCfg(); medLabel();
  if (S.running && S.mode === 'meditate') S.totalMs = v * 60000; // retime live
});
renderChips($('#b-dur-chips'), B_DURS, cfg.bDur, v => {
  cfg.bDur = v; saveCfg();
  if (S.running && S.mode === 'breathe') S.totalMs = v * 60000;
});
medLabel();

/* ——— breath presets ——— */
let customs = store.get('pranava.custom', []);
function allPresets() { return BREATH_PRESETS.concat(customs); }
function findPreset(id) { return allPresets().find(p => p.id === id) || BREATH_PRESETS[0]; }
function cycleSummary(p) {
  return p.cycle.map(ph => ph.t).join(' · ') + 's';
}
function renderPresets() {
  const list = $('#preset-list'); list.innerHTML = '';
  allPresets().forEach(p => {
    const d = document.createElement('div');
    d.className = 'preset' + (p.id === cfg.preset ? ' active' : '');
    const bars = p.cycle.map(ph => `<span class="pb ${esc(ph.a)}" style="flex:${+ph.t || 1}"></span>`).join('');
    d.innerHTML = `<div class="pmain"><b>${esc(p.name)}</b><i>${esc(p.hint || cycleSummary(p))}</i><div class="pbar">${bars}</div></div><div class="acts"></div>`;
    d.onclick = () => { cfg.preset = p.id; saveCfg(); renderPresets(); };
    const acts = d.querySelector('.acts');
    const mk = (txt, fn, title) => {
      const b = document.createElement('button');
      b.textContent = txt; b.title = title;
      b.onclick = e => { e.stopPropagation(); fn(); };
      acts.appendChild(b);
    };
    mk('✎', () => openBuilder(p), 'Customize');
    if (p.id.startsWith('c')) mk('✕', () => {
      customs = customs.filter(c => c.id !== p.id);
      store.set('pranava.custom', customs);
      if (cfg.preset === p.id) cfg.preset = 'anulom';
      renderPresets();
    }, 'Delete');
    list.appendChild(d);
  });
  $('#b-preset-label').textContent = findPreset(cfg.preset).name;
}
renderPresets();

/* ——— custom pattern builder ——— */
const CUE_OPTS = [['in', 'Inhale'], ['out', 'Exhale'], ['hold', 'Hold'], ['hum', 'Hum'], ['pump', 'Pump'], ['rest', 'Rest']];
function builderRow(l = '', t = 4, a = 'in') {
  const d = document.createElement('div');
  d.className = 'brow';
  d.innerHTML = `<input type="text" placeholder="Label (e.g. Inhale left)" value="${esc(l)}">
    <input type="number" min="1" max="600" value="${+t || 4}">
    <select>${CUE_OPTS.map(([v, n]) => `<option value="${v}"${v === a ? ' selected' : ''}>${n}</option>`).join('')}</select>
    <button class="del">✕</button>`;
  d.querySelector('.del').onclick = () => d.remove();
  $('#builder-rows').appendChild(d);
}
function openBuilder(p) {
  $('#builder').hidden = false;
  $('#builder-rows').innerHTML = '';
  $('#builder-title').textContent = p ? 'Based on ' + p.name : 'Custom pattern';
  $('#builder-name').value = p ? (p.id.startsWith('c') ? p.name : p.name + ' (mine)') : '';
  (p ? p.cycle : [{ l: 'Inhale', t: 4, a: 'in' }, { l: 'Exhale', t: 6, a: 'out' }])
    .forEach(ph => builderRow(ph.l, ph.t, ph.a));
}
$('#open-builder').onclick = () => openBuilder(null);
$('#add-phase').onclick = () => builderRow();
$('#close-builder').onclick = () => $('#builder').hidden = true;
$('#save-pattern').onclick = () => {
  const rows = $$('#builder-rows .brow');
  const cycle = rows.map(r => {
    const [txt, num] = r.querySelectorAll('input');
    return { l: txt.value || 'Breathe', t: Math.max(1, +num.value || 4), a: r.querySelector('select').value };
  });
  if (!cycle.length) return;
  const name = $('#builder-name').value.trim() || 'My pattern';
  const existing = customs.find(c => c.name === name);
  if (existing) existing.cycle = cycle;
  else customs.push({ id: 'c' + Date.now(), name, hint: cycleSummary({ cycle }), cycle });
  store.set('pranava.custom', customs);
  cfg.preset = (existing || customs[customs.length - 1]).id;
  saveCfg();
  $('#builder').hidden = true;
  renderPresets();
};

/* ——— library ——— */
function renderLibrary() {
  const bg = $('#bell-grid'); bg.innerHTML = '';
  BUILTIN_BELLS.forEach(([id, name]) => {
    const b = document.createElement('button');
    b.textContent = '▶ ' + name;
    b.onclick = () => playBell(id);
    bg.appendChild(b);
  });
  const ag = $('#amb-grid'); ag.innerHTML = '';
  BUILTIN_AMB.slice(1).forEach(([id, name]) => {
    const b = document.createElement('button');
    b.textContent = '▶ ' + name;
    b.onclick = () => {
      if (Aud.ambId === id) { Aud.stopAmbient(); b.classList.remove('on'); b.textContent = '▶ ' + name; }
      else {
        Aud.setAmbVol(cfg.ambVol); Aud.startAmbient(id);
        clearAmbButtons();
        b.classList.add('on'); b.textContent = '■ ' + name;
      }
    };
    ag.appendChild(b);
  });
  const lg = $('#lib-grid');
  if (lg) {
    lg.innerHTML = '';
    libSounds.bells.forEach(s => {
      const b = document.createElement('button');
      b.textContent = '▶ ' + s.name;
      b.onclick = async () => {
        b.textContent = '⏳ ' + s.name; // show the download, silence ≠ broken
        try { await Aud.playUrl(s.file); } catch (e) { alert('Could not load ' + s.name); }
        b.textContent = '▶ ' + s.name;
      };
      lg.appendChild(b);
    });
    libSounds.ambience.forEach(s => {
      const b = document.createElement('button');
      const key = 'lib:' + s.id;
      b.textContent = '▶ ' + s.name;
      b.onclick = async () => {
        if (Aud.ambId === key) { Aud.stopAmbient(); b.classList.remove('on'); b.textContent = '▶ ' + s.name; }
        else {
          Aud.resume(); Aud.setAmbVol(cfg.ambVol);
          b.textContent = '⏳ ' + s.name;
          try {
            const buf = await Aud.decodeUrl(s.file);
            Aud.startAmbient(key, buf);
            clearAmbButtons();
            b.classList.add('on'); b.textContent = '■ ' + s.name;
          } catch (e) { b.textContent = '▶ ' + s.name; alert('Could not load ' + s.name); }
        }
      };
      lg.appendChild(b);
    });
    const lc = $('#lib-credits');
    if (lc) lc.textContent = 'Credits: ' + [...new Set(libSounds.bells.concat(libSounds.ambience).map(s => s.credit))].join(' · ');
  }
  const hg = $('#heal-grid');
  if (hg) {
    hg.innerHTML = '';
    HEALING.forEach(h => {
      const b = document.createElement('button');
      const key = 'heal:' + h.id;
      if (h.group === 'binaural') b.classList.add('bin');
      b.textContent = '▶ ' + h.name;
      b.onclick = () => {
        if (Aud.ambId === key) { Aud.stopAmbient(); clearAmbButtons(); }
        else {
          Aud.resume(); Aud.setAmbVol(cfg.ambVol);
          Aud.startHealing(h);
          clearAmbButtons();
          b.classList.add('on'); b.textContent = '■ ' + h.name;
        }
      };
      hg.appendChild(b);
    });
  }
  const il = $('#imported-list'); il.innerHTML = '';
  imported.forEach(s => {
    const d = document.createElement('div');
    d.className = 'imp';
    const tag = s.dur ? (isAmbient(s) ? ' · ambience' : ' · bell') : '';
    d.innerHTML = `<span>${esc(s.name)}<small style="color:var(--ink-dim)">${tag}</small></span><span></span>`;
    const span = d.lastElementChild;
    const play = document.createElement('button');
    play.textContent = '▶'; play.onclick = () => Aud.playImported(s.id);
    const del = document.createElement('button');
    del.textContent = '✕'; del.onclick = async () => {
      await SoundDB.del(s.id);
      delete Aud.buffers['imp:' + s.id];
      await loadImported();
    };
    span.append(play, del);
    il.appendChild(d);
  });
  renderStats();
}
$('#btn-import').onclick = () => $('#file-import').click();
$('#file-import').onchange = async e => {
  Aud.resume();
  for (const f of e.target.files) {
    if (f.size > 15 * 1024 * 1024) { alert(f.name + ' is over 15 MB — please use a smaller file.'); continue; }
    let dur = 0;
    try { Aud.init(); dur = (await Aud.ctx.decodeAudioData(await f.arrayBuffer())).duration; }
    catch (err) { alert('Could not read ' + f.name + ' — format not supported on this device.'); continue; }
    await SoundDB.add(f.name.replace(/\.[^.]+$/, ''), f, dur);
  }
  e.target.value = '';
  await loadImported();
};
async function loadImported() {
  try { imported = (await SoundDB.all()).map(r => ({ id: r.id, name: r.name, dur: r.dur || 0 })); }
  catch { imported = []; }
  refreshSelects(); renderLibrary();
}

/* ——— practice progress report (local, no account needed) ——— */
function renderStats() {
  const log = store.get('pranava.log', []);
  const el = $('#stats');
  if (!log.length) { el.innerHTML = '<p class="hint">No sessions yet — your progress report will grow here.</p>'; return; }
  const totalMin = log.reduce((a, s) => a + s.m, 0);
  const days = new Set(log.map(s => s.d));
  const dayKey = dt => dt.toISOString().slice(0, 10);
  // streak: consecutive practice days ending today (or yesterday)
  let streak = 0; const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
  // last 7 days
  const bars = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    const k = dayKey(dt);
    bars.push({ m: log.filter(s => s.d === k).reduce((a, s) => a + s.m, 0), w: 'SMTWTFS'[dt.getDay()] });
  }
  const mx = Math.max(1, ...bars.map(b => b.m));
  el.innerHTML = `
    <div class="prow">
      <div class="pstat"><b>${Math.floor(totalMin / 60)}h ${Math.round(totalMin % 60)}m</b><i>total</i></div>
      <div class="pstat"><b>${log.length}</b><i>sessions</i></div>
      <div class="pstat"><b>${streak}</b><i>day streak</i></div>
      <div class="pstat"><b>${Math.round(totalMin / log.length)}m</b><i>average</i></div>
    </div>
    <div class="pbars">${bars.map(b =>
      `<div class="pcol"><em>${b.m ? Math.round(b.m) : ''}</em><div class="pfill" style="height:${Math.max(4, Math.round(b.m / mx * 56))}px"></div><span>${b.w}</span></div>`).join('')}</div>`;
}
function logSession(mode, minutes) {
  if (minutes < 0.5) return;
  const log = store.get('pranava.log', []);
  log.push({ d: new Date().toISOString().slice(0, 10), mode, m: minutes });
  store.set('pranava.log', log);
  renderStats();
}

/* ——— session engine ——— */
const S = {
  mode: null, running: false, paused: false,
  startAt: 0, elapsedMs: 0, totalMs: 0, timer: null,
  nextBellMin: 0, cycle: [], pi: -1, phaseEndMs: 0, lastTickSec: -1,
  wakeLock: null, ending: false,
};
const fmt = ms => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
async function grabWakeLock() {
  try { S.wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.running && !S.wakeLock) grabWakeLock();
});

/* chakra visualization — translucent meditator in lotus posture, chakras at their
   true places on the body, energy beam rising through the spine as the voice ascends */
const CH_COLORS = ['#e0483c', '#f08c3a', '#f2c14e', '#58c08a', '#58a8dd', '#5a63c9', '#b28ae0'];
const CH_Y = [178, 152, 128, 104, 78, 52, 26]; // root → crown along the spine
function buildOrbs() {
  const box = $('#chakra-orbs'); box.hidden = false;
  const sparks = Array.from({ length: 10 }, (_, i) =>
    `<circle class="spark" cx="${93 + (i % 5) * 3.5}" cy="184" r="${1.2 + (i % 3) * 0.5}" fill="#e9dcc6"
      style="animation-delay:${(i * 1.1).toFixed(1)}s;animation-duration:${(6.5 + (i % 4) * 1.8).toFixed(1)}s"/>`).join('');
  box.innerHTML = `<svg viewBox="0 0 200 216">
    <defs>
      <linearGradient id="beamg" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#e9dcc6" stop-opacity=".08"/>
        <stop offset="1" stop-color="#e9dcc6" stop-opacity=".8"/>
      </linearGradient>
    </defs>
    <circle class="mandala m1" cx="100" cy="106" r="97" fill="none" stroke="rgba(185,167,230,.28)" stroke-width="1" stroke-dasharray="2 7"/>
    <circle class="mandala m2" cx="100" cy="106" r="90" fill="none" stroke="rgba(165,203,232,.2)" stroke-width="1" stroke-dasharray="1 11"/>
    <g fill="rgba(185,167,230,.06)" stroke="rgba(185,167,230,.38)" stroke-width="1.5" stroke-linejoin="round">
      <circle cx="100" cy="50" r="17"/>
      <path d="M100 67 C 126 78 140 100 143 132 Q 145 152 130 158 L 70 158 Q 55 152 57 132 C 60 100 74 78 100 67 Z"/>
      <path d="M100 182 m -62 0 a 62 15 0 1 0 124 0 a 62 15 0 1 0 -124 0"/>
      <path d="M67 96 C 52 116 48 138 58 154" fill="none" opacity=".7"/>
      <path d="M133 96 C 148 116 152 138 142 154" fill="none" opacity=".7"/>
    </g>
    <rect id="chakra-beam" x="98.6" y="26" width="2.8" rx="1.4" height="152" fill="url(#beamg)" opacity=".6"/>
    ${sparks}
    ${CH_Y.map((y, i) => `<circle class="halo" cx="100" cy="${y}" r="11" fill="none" stroke="${CH_COLORS[i]}" stroke-width="1"/>`).join('')}
    ${CH_Y.map((y, i) => `<circle class="orb" cx="100" cy="${y}" r="6.5" fill="${CH_COLORS[i]}" style="--c:${CH_COLORS[i]}"/>`).join('')}
  </svg>`;
}
function updateOrbs(frac) {
  if (!S.marks) return;
  const lit = S.marks.filter(m => frac >= m).length;
  const box = $('#chakra-orbs');
  [...box.querySelectorAll('.orb')].forEach((o, i) => {
    o.classList.toggle('lit', i < lit);
    o.classList.toggle('current', i === lit - 1);
  });
  [...box.querySelectorAll('.halo')].forEach((h, i) => h.classList.toggle('lit', i < lit));
  box.classList.toggle('flowing', lit > 0);
  const beam = $('#chakra-beam');
  if (beam) beam.style.transform = `scaleY(${lit ? (178 - CH_Y[lit - 1]) / 152 : 0})`;
  // the atmosphere breathes in the color of the awakened center
  $('#session').style.setProperty('--aura', lit ? CH_COLORS[lit - 1] : '#8b74c8');
}

function showSession() { $('#session').hidden = false; $('#mini').hidden = true; }
function hideSession() {
  $('#session').hidden = true;
  $('#mini').hidden = true;
  $('#chakra-orbs').hidden = true;
  $('#s-center').style.display = '';
  $('#session').classList.remove('chakra-mode');
  const fl = $('#flower-live');
  fl.classList.remove('pulse', 'pump');
  fl.style.transform = ''; fl.style.transitionDuration = '';
  $('#s-phase').textContent = ''; $('#s-center-sub').textContent = '';
  $('#btn-pause').textContent = 'Pause';
}
function setFlower(scale, seconds) {
  const fl = $('#flower-live');
  fl.style.transitionDuration = seconds + 's';
  fl.style.transform = `scale(${scale})`;
}

let guidedAudio = null;
function beginSession(mode, gSess, gUrl) {
  S.lastBegin = { mode, gSess, gUrl }; // for Restart
  stopClosing();
  Aud.resume(); Aud.setAmbVol(cfg.ambVol);
  if (cfg.voice) Aud.primeVoice(); // unlock iOS speech inside this Begin tap
  S.mode = mode; S.running = true; S.paused = false; S.ending = false;
  S.elapsedMs = 0; S.lastTickSec = -1; S.pi = -1; S.phaseEndMs = 0;
  S.soft = false; S.marks = null;
  clearTimeout(S.doneTO); // a lingering auto-close from a finished session must not hide this one
  $('#chakra-orbs').hidden = true;
  setProg(0);
  grabWakeLock(); showSession();
  $('#mini-name').textContent = mode === 'guided' ? gSess.name : mode === 'breathe' ? findPreset(cfg.preset).name : 'Meditation';
  // show the Voice slider for guided audio and for breathwork voice cues
  const showVoice = (mode === 'guided' && gUrl) || (mode === 'breathe' && cfg.voice);
  $('#mix-voice-row').style.display = showVoice ? '' : 'none';
  const vVal = mode === 'breathe' ? cfg.cueVol : 1;
  $('#rng-voice').value = vVal;
  const vp = $('#voice-pct'); if (vp) vp.textContent = Math.round(vVal * 100) + '%';
  setAmbVolume(cfg.ambVol);
  if (mode === 'meditate') {
    S.totalMs = cfg.dur * 60000;
    S.nextBellMin = cfg.intEvery || Infinity;
    $('#s-phase').textContent = 'Settle in…';
  } else if (mode === 'guided') {
    S.totalMs = gSess.dur * 1000;
    S.nextBellMin = Infinity;
    S.soft = !!gSess.soft;
    S.marks = gSess.chakras || null;
    if (S.marks) buildOrbs();
    $('#s-phase').textContent = gSess.name;
    if (gUrl) {
      guidedAudio = new Audio(gUrl);
      guidedAudio.preload = 'auto';
      // iOS allows later programmatic play() only if the element played
      // once inside a real tap — bless it now, inside this Begin tap
      guidedAudio.play().then(() => { guidedAudio.pause(); guidedAudio.currentTime = 0; }).catch(() => {});
      // trust the real track length once known (plus a short settling tail)
      guidedAudio.onloadedmetadata = () => {
        if (isFinite(guidedAudio.duration) && guidedAudio.duration > 10)
          S.totalMs = (guidedAudio.duration + 5) * 1000;
      };
    }
  } else {
    const p = findPreset(cfg.preset);
    S.cycle = p.cycle;
    S.totalMs = cfg.bDur * 60000;
    $('#s-phase').textContent = p.name;
  }
  // 5-second preparation countdown, then the session proper
  let prep = 5;
  $('#s-center').textContent = prep;
  $('#s-center-sub').textContent = 'settle in';
  clearInterval(S.prepTimer);
  S.prepTimer = setInterval(() => {
    if (!S.running) { clearInterval(S.prepTimer); return; }
    if (S.paused) return;
    prep--;
    if (prep > 0) { $('#s-center').textContent = prep; return; }
    clearInterval(S.prepTimer);
    $('#s-center-sub').textContent = '';
    if (mode === 'meditate') $('#s-phase').textContent = '';
    if (S.marks) { $('#s-center').style.display = 'none'; $('#session').classList.add('chakra-mode'); }
    playBell(cfg.start);
    startAmbience();
    if (guidedAudio) guidedAudio.play().catch(() => {});
    S.startAt = performance.now();
    if (mode === 'breathe') nextPhase();
    S.timer = setInterval(tick, 200);
  }, 1000);
}

function tick() {
  if (!S.running || S.paused) return;
  S.elapsedMs = performance.now() - S.startAt;
  const left = S.totalMs > 0 ? S.totalMs - S.elapsedMs : Infinity;
  if (S.totalMs > 0) {
    setProg(S.elapsedMs / S.totalMs);
    updateOrbs(S.elapsedMs / S.totalMs);
  }
  if (!$('#mini').hidden) $('#mini-time').textContent =
    S.totalMs > 0 ? fmt(S.totalMs - S.elapsedMs) : fmt(S.elapsedMs);
  if (S.mode !== 'breathe') {
    $('#s-center').textContent = S.totalMs > 0 ? fmt(left) : fmt(S.elapsedMs);
    $('#s-total').textContent = S.totalMs > 0
      ? (S.mode === 'guided' ? fmt(left) + ' remaining' : '')
      : 'open sitting';
    const mins = S.elapsedMs / 60000;
    if (mins >= S.nextBellMin && left > 3000) {
      playBell(cfg.intSound, .8);
      S.nextBellMin += cfg.intEvery;
    }
    if (S.totalMs > 0 && left <= 0) return endSession(true);
  } else {
    const phaseLeftMs = S.phaseEndMs - S.elapsedMs;
    const sec = Math.ceil(phaseLeftMs / 1000);
    if (sec !== S.lastTickSec) {
      S.lastTickSec = sec;
      $('#s-center').textContent = Math.max(sec, 0);
      // kapalbhati-style pump: metronome tick each second
      if (S.cycle[S.pi] && S.cycle[S.pi].a === 'pump' && sec > 0) Aud.tick();
    }
    $('#s-total').textContent = S.totalMs > 0 ? fmt(left) + ' remaining' : 'open practice';
    if (phaseLeftMs <= 0) {
      const endOfCycle = S.pi === S.cycle.length - 1;
      if (endOfCycle && S.totalMs > 0 && S.elapsedMs >= S.totalMs) return endSession(true);
      nextPhase();
    }
  }
}

/* recorded deep-voice breath cues (reliable on iOS, unlike device speech).
   Files exist for the built-in phrases; custom patterns fall back to speech. */
const CUE_SLUGS = new Set(['inhale-left-nostril', 'exhale-right-nostril', 'inhale-right-nostril',
  'exhale-left-nostril', 'hold', 'inhale', 'exhale', 'inhale-through-the-nose', 'exhale-ocean-sound',
  'exhale-hum', 'pump-sharp-exhales', 'inhale-deep', 'exhale-slowly', 'rest-natural-breath']);
const cueSlug = label => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function speakPhase(label) {
  const slug = cueSlug(label);
  if (CUE_SLUGS.has(slug)) Aud.playUrl('cues/' + slug + '.m4a', cfg.cueVol * cfg.cueVol); // deep recorded voice
  else Aud.voice(label.replace(/—/g, ','), cfg.voiceName);                                // fallback: device speech
}

function nextPhase() {
  S.pi = (S.pi + 1) % S.cycle.length;
  const p = S.cycle[S.pi];
  // schedule off the previous phase's end so timing never drifts
  S.phaseEndMs = (S.phaseEndMs > 0 ? S.phaseEndMs : S.elapsedMs) + p.t * 1000;
  S.lastTickSec = -1;
  $('#s-phase').textContent = p.l;
  const fl = $('#flower-live');
  fl.classList.toggle('pump', p.a === 'pump');
  if (p.a === 'in') setFlower(1.16, p.t);
  else if (p.a === 'out' || p.a === 'hum') setFlower(0.84, p.t);
  else if (p.a === 'rest') setFlower(1.0, 2);
  if (cfg.cues) Aud.cue(p.a, p.t);
  if (cfg.voice) speakPhase(p.l);
}

$('#btn-pause').onclick = () => {
  if (!S.running) return;
  S.paused = !S.paused;
  $('#btn-pause').textContent = S.paused ? 'Resume' : 'Pause';
  if (S.paused) {
    S.pausedAt = performance.now(); Aud.suspend();
    if (guidedAudio) guidedAudio.pause();
  } else {
    S.startAt += performance.now() - S.pausedAt; Aud.resume();
    if (guidedAudio) guidedAudio.play().catch(() => {});
  }
};
$('#btn-end').onclick = () => endSession(false);

/* restart — begin the same session over from the top */
$('#btn-restart').onclick = () => {
  if (!S.lastBegin) return;
  clearTimeout(S.doneTO);
  clearInterval(S.timer);
  clearInterval(S.prepTimer);
  stopClosing();
  speechSynthesis && speechSynthesis.cancel();
  if (guidedAudio) { guidedAudio.pause(); guidedAudio = null; }
  Aud.stopAmbient();
  if (S.wakeLock) { S.wakeLock.release().catch(() => {}); S.wakeLock = null; }
  S.ending = false; S.running = false; S.paused = false;
  $('#btn-pause').textContent = 'Pause';
  const lb = S.lastBegin;
  beginSession(lb.mode, lb.gSess, lb.gUrl);
};

/* minimize — browse the app while the session keeps playing */
$('#btn-min').onclick = () => {
  $('#session').hidden = true;
  $('#mini').hidden = false;
  $('#mini-time').textContent = S.totalMs > 0 ? fmt(S.totalMs - S.elapsedMs) : fmt(S.elapsedMs);
};
$('#mini').onclick = () => showSession();
$('#mini-end').onclick = e => { e.stopPropagation(); endSession(false); };

/* live mix — voice & ambience volume during a session */
$('#rng-voice').oninput = e => {
  const v = +e.target.value;
  if (guidedAudio) guidedAudio.volume = v * v;   // recorded guided narration
  cfg.cueVol = v; saveCfg();                      // recorded breath cues (next phase)
  const p = $('#voice-pct'); if (p) p.textContent = Math.round(v * 100) + '%';
};
$('#rng-bg').oninput = e => setAmbVolume(+e.target.value, e.target);

function endSession(completed) {
  if (S.ending) return;
  S.ending = true; S.running = false;
  clearInterval(S.timer);
  clearInterval(S.prepTimer);
  speechSynthesis && speechSynthesis.cancel();
  if (guidedAudio) { guidedAudio.pause(); guidedAudio = null; }
  Aud.stopAmbient();
  if (S.wakeLock) { S.wakeLock.release().catch(() => {}); S.wakeLock = null; }
  const minutes = S.elapsedMs / 60000;
  logSession(S.mode, minutes);
  if (completed) {
    showSession();
    let closeMs = 7000;
    if (S.soft) playBell(cfg.end, .15); // before-sleep: one whisper of a bell, nothing more
    else closeMs = playClosing();       // configurable chime / gentle rising wake
    $('#s-phase').textContent = S.soft ? '🌙 Sleep well' : '🙏 Session complete';
    $('#s-center').style.display = '';
    $('#s-center').textContent = fmt(S.elapsedMs);
    $('#s-center-sub').textContent = 'well done';
    $('#s-total').textContent = '';
    setFlower(1, 3);
    S.doneTO = setTimeout(hideSession, Math.max(7000, closeMs + 4000));
  } else {
    stopClosing();
    playBell(cfg.end, .5);
    hideSession();
  }
}

$('#begin-med').onclick = () => beginSession('meditate');
$('#begin-breath').onclick = () => beginSession('breathe');

/* ——— guided sessions (manifest lives in the repo — the app's backend) ——— */
async function loadGuided() {
  try {
    const m = await (await fetch('guided.json')).json();
    if (!m.sessions || !m.sessions.length) return;
    const list = $('#guided-list'); list.innerHTML = '';
    m.sessions.forEach(s => {
      const d = document.createElement('div');
      d.className = 'gitem';
      const mins = Math.round(s.dur / 60);
      d.innerHTML = `<div class="gmain"><b>${esc(s.name)}</b><i>${esc(s.desc)} · ${mins} min</i></div>`;
      let voiceSel = null;
      if (s.voices) {
        voiceSel = document.createElement('select');
        voiceSel.innerHTML = Object.keys(s.voices).map(k => `<option>${esc(k)}</option>`).join('');
        d.appendChild(voiceSel);
      }
      const play = document.createElement('button');
      play.className = 'gplay'; play.textContent = '▶';
      play.onclick = async () => {
        const url = s.voices ? s.voices[voiceSel.value] : null;
        if (url) {
          // a pre-wired voice whose recording isn't uploaded yet → friendly note
          try { const r = await fetch(url, { method: 'HEAD' }); if (!r.ok) { alert('“' + voiceSel.value + '” isn’t recorded yet — coming soon 🎙️'); return; } }
          catch (e) { /* offline/network: let Audio try the cache */ }
        }
        beginSession('guided', s, url);
      };
      d.appendChild(play);
      list.appendChild(d);
    });
    $('#guided-card').hidden = false;
  } catch (e) { /* offline before first cache — card stays hidden */ }
}

/* ——— builder console — 7 taps on the GIRI emblem, passphrase-gated ——— */
const APP_VERSION = 'v8';
(() => {
  let taps = 0, tapT = null;
  $('#giri img').addEventListener('click', () => {
    taps++; clearTimeout(tapT); tapT = setTimeout(() => taps = 0, 1600);
    if (taps < 7) return;
    taps = 0;
    if (prompt('Builder passphrase:') !== '108gayatri') return;
    $('#dev').hidden = false;
    const log = store.get('pranava.log', []);
    $('#dev-ver').textContent = '· ' + APP_VERSION;
    $('#dev-info').textContent =
      `${log.length} logged sessions · ${customs.length} custom patterns · ${imported.length} imported sounds · ` +
      `audio: ctx=${Aud.ctx ? Aud.ctx.state : 'not created'}, audioSession=${'audioSession' in navigator ? 'yes' : 'no'}, ambVol=${Math.round(cfg.ambVol * 100)}%`;
  });
  $('#dev-close').onclick = () => $('#dev').hidden = true;
  $('#dev-export').onclick = () => {
    const data = { exported: new Date().toISOString(), cfg, log: store.get('pranava.log', []), customs };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'pranava-data.json'; a.click();
  };
  $('#dev-import').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.cfg) store.set('pranava.cfg', data.cfg);
      if (data.log) store.set('pranava.log', data.log);
      if (data.customs) store.set('pranava.custom', data.customs);
      location.reload();
    } catch { alert('Not a valid Pranava data file.'); }
  };
  $('#dev-refresh').onclick = async () => {
    if ('serviceWorker' in navigator)
      for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    for (const k of await caches.keys()) await caches.delete(k);
    location.reload();
  };
})();

async function loadSoundLib() {
  try { libSounds = await (await fetch('sounds.json')).json(); } catch (e) {}
  refreshSelects(); renderLibrary();
}

/* show the install hint only in a browser tab — hidden once installed / in the store app */
(() => {
  const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const card = $('#install-card');
  if (card && !installed) card.hidden = false;
})();

/* ——— boot ——— */
refreshSelects();
loadImported();
loadGuided();
loadSoundLib();
if ('serviceWorker' in navigator && location.protocol !== 'file:')
  addEventListener('load', () =>
    navigator.serviceWorker.register('sw.js').then(reg => reg.update()).catch(() => {}));
