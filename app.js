/* Pranava — UI wiring, meditation timer & breathwork engine. */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};
const cfg = Object.assign({
  dur: 15, start: 'bowl', end: 'gong', intEvery: 0, intSound: 'bell',
  amb: 'none', ambVol: 0.5, bDur: 5, preset: 'anulom', voice: true, cues: true,
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
['flower-med', 'flower-b', 'flower-live'].forEach(id => $('#' + id).innerHTML = flowerSVG());

/* ——— tabs ——— */
$$('#tabs button').forEach(b => b.onclick = () => {
  $$('#tabs button').forEach(x => x.classList.toggle('active', x === b));
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + b.dataset.view));
});

/* ——— sound pickers ——— */
function bellOptions() {
  return BUILTIN_BELLS.concat(imported.map(s => ['imp:' + s.id, s.name]));
}
function ambOptions() {
  return BUILTIN_AMB.concat(imported.map(s => ['imp:' + s.id, s.name + ' (loop)']));
}
function fillSelect(sel, opts, val) {
  sel.innerHTML = opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
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
  else Aud[id] && Aud[id](vol);
}
function startAmbience() {
  if (cfg.amb.startsWith('imp:')) {
    Aud.resume();
    Aud.decodeImported(+cfg.amb.slice(4)).then(buf => buf && Aud.startAmbient('sample', buf));
  } else Aud.startAmbient(cfg.amb);
}
['sel-start', 'sel-end', 'sel-int-sound'].forEach(id => $('#' + id).onchange = e => {
  cfg[{ 'sel-start': 'start', 'sel-end': 'end', 'sel-int-sound': 'intSound' }[id]] = e.target.value;
  saveCfg(); playBell(e.target.value, .7);
});
$('#sel-int').value = String(cfg.intEvery);
$('#sel-int').onchange = e => { cfg.intEvery = +e.target.value; saveCfg(); };
[$('#sel-amb'), $('#sel-amb-b')].forEach(sel => sel.onchange = e => {
  cfg.amb = e.target.value; saveCfg();
  $('#sel-amb').value = cfg.amb; $('#sel-amb-b').value = cfg.amb;
});
$('#rng-amb').value = cfg.ambVol;
$('#rng-amb').oninput = e => { cfg.ambVol = +e.target.value; saveCfg(); Aud.setAmbVol(cfg.ambVol); };
$('#chk-cues').checked = cfg.cues;
$('#chk-cues').onchange = e => { cfg.cues = e.target.checked; saveCfg(); };
$('#chk-voice').checked = cfg.voice;
$('#chk-voice').onchange = e => { cfg.voice = e.target.checked; saveCfg(); };

/* ——— duration chips ——— */
function renderChips(el, values, current, onPick) {
  el.innerHTML = '';
  values.forEach(v => {
    const b = document.createElement('button');
    b.className = 'chip' + (v === current ? ' active' : '');
    b.textContent = v === 0 ? '∞' : v;
    b.onclick = () => { onPick(v); renderChips(el, values, v, onPick); };
    el.appendChild(b);
  });
}
const MED_DURS = [5, 10, 15, 20, 30, 45, 60, 0];
const B_DURS = [3, 5, 10, 15, 20, 0];
function medLabel() {
  $('#med-dur-label').textContent = cfg.dur === 0 ? '∞' : cfg.dur;
  $('#med-dur-unit').textContent = cfg.dur === 0 ? 'open' : 'min';
}
renderChips($('#dur-chips'), MED_DURS, cfg.dur, v => { cfg.dur = v; saveCfg(); medLabel(); });
renderChips($('#b-dur-chips'), B_DURS, cfg.bDur, v => { cfg.bDur = v; saveCfg(); });
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
    d.innerHTML = `<div><b>${p.name}</b><i>${p.hint || cycleSummary(p)}</i></div><div class="acts"></div>`;
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
  d.innerHTML = `<input type="text" placeholder="Label (e.g. Inhale left)" value="${l}">
    <input type="number" min="1" max="600" value="${t}">
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
        $$('#amb-grid button').forEach(x => { x.classList.remove('on'); x.textContent = '▶ ' + x.textContent.slice(2); });
        b.classList.add('on'); b.textContent = '■ ' + name;
      }
    };
    ag.appendChild(b);
  });
  const il = $('#imported-list'); il.innerHTML = '';
  imported.forEach(s => {
    const d = document.createElement('div');
    d.className = 'imp';
    d.innerHTML = `<span>${s.name}</span><span></span>`;
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
$('#file-import').onchange = async e => {
  Aud.resume();
  for (const f of e.target.files) {
    if (f.size > 15 * 1024 * 1024) { alert(f.name + ' is over 15 MB — please use a smaller file.'); continue; }
    await SoundDB.add(f.name.replace(/\.[^.]+$/, ''), f);
  }
  e.target.value = '';
  await loadImported();
};
async function loadImported() {
  try { imported = (await SoundDB.all()).map(r => ({ id: r.id, name: r.name })); }
  catch { imported = []; }
  refreshSelects(); renderLibrary();
}

/* ——— stats ——— */
function renderStats() {
  const log = store.get('pranava.log', []);
  if (!log.length) { $('#stats').textContent = 'No sessions yet.'; return; }
  const mins = Math.round(log.reduce((a, s) => a + s.m, 0));
  $('#stats').textContent = `${log.length} session${log.length > 1 ? 's' : ''} · ${mins} mindful minutes 🙏`;
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

function showSession() { $('#session').hidden = false; }
function hideSession() {
  $('#session').hidden = true;
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

function beginSession(mode) {
  Aud.resume(); Aud.setAmbVol(cfg.ambVol);
  S.mode = mode; S.running = true; S.paused = false; S.ending = false;
  S.elapsedMs = 0; S.lastTickSec = -1; S.pi = -1; S.phaseEndMs = 0;
  grabWakeLock(); showSession();
  if (mode === 'meditate') {
    S.totalMs = cfg.dur * 60000;
    S.nextBellMin = cfg.intEvery || Infinity;
    $('#s-phase').textContent = 'Settle in…';
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
  const prepTimer = setInterval(() => {
    if (!S.running) { clearInterval(prepTimer); return; }
    if (S.paused) return;
    prep--;
    if (prep > 0) { $('#s-center').textContent = prep; return; }
    clearInterval(prepTimer);
    $('#s-center-sub').textContent = '';
    playBell(cfg.start);
    startAmbience();
    S.startAt = performance.now();
    if (mode === 'breathe') nextPhase();
    S.timer = setInterval(tick, 200);
  }, 1000);
}

function tick() {
  if (!S.running || S.paused) return;
  S.elapsedMs = performance.now() - S.startAt;
  const left = S.totalMs > 0 ? S.totalMs - S.elapsedMs : Infinity;
  if (S.mode === 'meditate') {
    $('#s-center').textContent = S.totalMs > 0 ? fmt(left) : fmt(S.elapsedMs);
    $('#s-total').textContent = S.totalMs > 0 ? '' : 'open sitting';
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
  if (cfg.voice) Aud.voice(p.l.replace(/—/g, ','));
}

$('#btn-pause').onclick = () => {
  if (!S.running) return;
  S.paused = !S.paused;
  $('#btn-pause').textContent = S.paused ? 'Resume' : 'Pause';
  if (S.paused) { S.pausedAt = performance.now(); Aud.suspend(); }
  else { S.startAt += performance.now() - S.pausedAt; Aud.resume(); }
};
$('#btn-end').onclick = () => endSession(false);

function endSession(completed) {
  if (S.ending) return;
  S.ending = true; S.running = false;
  clearInterval(S.timer);
  speechSynthesis && speechSynthesis.cancel();
  Aud.stopAmbient();
  if (S.wakeLock) { S.wakeLock.release().catch(() => {}); S.wakeLock = null; }
  const minutes = S.elapsedMs / 60000;
  logSession(S.mode, minutes);
  if (completed) {
    // traditional triple closing bell
    playBell(cfg.end); setTimeout(() => playBell(cfg.end, .8), 2600); setTimeout(() => playBell(cfg.end, .6), 5200);
    $('#s-phase').textContent = '🙏 Session complete';
    $('#s-center').textContent = fmt(S.elapsedMs);
    $('#s-center-sub').textContent = 'well done';
    $('#s-total').textContent = '';
    setFlower(1, 3);
    setTimeout(hideSession, 7000);
  } else {
    playBell(cfg.end, .5);
    hideSession();
  }
}

$('#begin-med').onclick = () => beginSession('meditate');
$('#begin-breath').onclick = () => beginSession('breathe');

/* ——— boot ——— */
refreshSelects();
loadImported();
if ('serviceWorker' in navigator && location.protocol !== 'file:')
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
