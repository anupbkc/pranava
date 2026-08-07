/* Pranava — breathwork patterns.
   Each phase: l = label, t = seconds, a = action (in|out|hold|hum|pump|rest). */
const BREATH_PRESETS = [
  { id:'anulom', name:'Anulom Vilom', hint:'Alternate-nostril · balance', cycle:[
    {l:'Inhale — left nostril', t:4, a:'in'},
    {l:'Hold', t:4, a:'hold'},
    {l:'Exhale — right nostril', t:4, a:'out'},
    {l:'Inhale — right nostril', t:4, a:'in'},
    {l:'Hold', t:4, a:'hold'},
    {l:'Exhale — left nostril', t:4, a:'out'},
  ]},
  { id:'box', name:'Box Breathing', hint:'4 · 4 · 4 · 4 · calm focus', cycle:[
    {l:'Inhale', t:4, a:'in'}, {l:'Hold', t:4, a:'hold'},
    {l:'Exhale', t:4, a:'out'}, {l:'Hold', t:4, a:'hold'},
  ]},
  { id:'478', name:'4 · 7 · 8', hint:'Deep relaxation · sleep', cycle:[
    {l:'Inhale', t:4, a:'in'}, {l:'Hold', t:7, a:'hold'}, {l:'Exhale', t:8, a:'out'},
  ]},
  { id:'sama', name:'Sama Vritti', hint:'Equal breath · 5 · 5', cycle:[
    {l:'Inhale', t:5, a:'in'}, {l:'Exhale', t:5, a:'out'},
  ]},
  { id:'ujjayi', name:'Ujjayi', hint:'Ocean breath · 4 · 6', cycle:[
    {l:'Inhale — through the nose', t:4, a:'in'},
    {l:'Exhale — ocean sound', t:6, a:'out'},
  ]},
  { id:'bhramari', name:'Bhramari', hint:'Humming-bee breath', cycle:[
    {l:'Inhale', t:4, a:'in'},
    {l:'Exhale — hum', t:8, a:'hum'},
  ]},
  { id:'kapal', name:'Kapalbhati', hint:'Skull-shining · metronome', cycle:[
    {l:'Pump — sharp exhales', t:30, a:'pump'},
    {l:'Inhale deep', t:4, a:'in'},
    {l:'Hold', t:10, a:'hold'},
    {l:'Exhale slowly', t:6, a:'out'},
    {l:'Rest — natural breath', t:15, a:'rest'},
  ]},
];
