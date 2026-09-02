/* Pranava — healing frequencies & brainwave entrainment.
   All synthesized live (Web Audio): zero files, zero copyright, exact Hz.
   Solfeggio = pure sustained tones (any speaker).
   Binaural  = two ear-specific tones whose difference is the brainwave beat
               (needs headphones — the beat forms in the brain, not the air). */
const HEALING = [
  { id: 's396', name: '396 Hz · Release',        group: 'solfeggio', f: 396 },
  { id: 's417', name: '417 Hz · Change',         group: 'solfeggio', f: 417 },
  { id: 's432', name: '432 Hz · Earth',          group: 'solfeggio', f: 432 },
  { id: 's528', name: '528 Hz · Transformation', group: 'solfeggio', f: 528 },
  { id: 's639', name: '639 Hz · Connection',     group: 'solfeggio', f: 639 },
  { id: 's741', name: '741 Hz · Awakening',      group: 'solfeggio', f: 741 },
  { id: 's852', name: '852 Hz · Intuition',      group: 'solfeggio', f: 852 },
  { id: 's963', name: '963 Hz · Oneness',        group: 'solfeggio', f: 963 },
  { id: 'bDelta', name: 'Delta 2.5 Hz · Deep Rest',  group: 'binaural', carrier: 110, beat: 2.5 },
  { id: 'bTheta', name: 'Theta 6 Hz · Meditation',   group: 'binaural', carrier: 150, beat: 6 },
  { id: 'bAlpha', name: 'Alpha 10 Hz · Calm Focus',  group: 'binaural', carrier: 180, beat: 10 },
];
const healFind = id => HEALING.find(h => h.id === id);
