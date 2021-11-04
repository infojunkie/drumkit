// Doumbek soundfont
// http://www.khafif.com/rhy/doumbek-soundfont.html

// Melodic Pool:
// KEY	Midi	SOUND
// 60	C5	Doum Back
// 61	C#5	Doum Front
// 62	D5	Finger Doum Back
// 63	D#5	Finger Doum Front
// 64	E5	Rim Doum Front
// 65	F5	Tek Front
// 66	F#5	Soft Tek Front
// 67	G5	Half Tek Front
// 68	G#5	Slap Front
// 69	A5 	Half Slap Front

// Percussive Pool:
// (This one matches whats at http://www.khafif.com/rhy/):
// They are channel 10 (drum sound) keys.

// KEY - SOUND
// 64 - Doum Front
// 62 - Tek Front
// 45 - Half Slap Front
// 35 - Slap Front
// 63 - Half Tek
// 70 - Doum Back
// 71 - Finger Doum Back
// 72 - Finger Doum Front
// 73 - Rim Doum Front
// 74 - Soft Tek Front

let drums = null;
let buttons = null;
const config = {}
const DEFAULT_SOUNDFONT =  'Doumbek-Faisal';
const DEFAULT_INSTRUMENT = 'doumbek';
const DEFAULT_BUTTONS = {
  "b1": 64,
  "b2": 65,
  "b3": 66,
  "b4": 67,
  "b5": 68,
  "b6": 69
};

async function loadSoundFonts(soundfont) {
  const soundFonts = await fetch('/soundfonts.json')
    .then(data => data.json())
    .then(json => json)
  return soundFonts[soundfont]
}

async function loadConfig(soundfont, instrument) {
  if (!config[soundfont]) {
    config[soundfont] = await loadSoundFonts(soundfont);
  }
  return config[soundfont][instrument];
}

async function loadInstrument() {
  return new Promise((resolve, reject) => {
    Soundfont.instrument(new AudioContext(), DEFAULT_INSTRUMENT, { soundfont: DEFAULT_SOUNDFONT, nameToUrl: function(name, soundfont, format) {
      format = format || 'mp3';
      return `/drums/${soundfont}/${name}-${format}.js`;
    }})
    .then(instrument => {
      resolve(instrument);
    });
  });
}

function mapButtons(availableButtons) {
  const selected = Object.keys(availableButtons).slice(0, 6)
  const buttons = {}
  let i = 0;
  Object.keys(DEFAULT_BUTTONS).forEach((key)=> {
    buttons[key] = selected[i]
    i += 1;
  });
  return buttons;
}

async function playButton(button) {
  if (!drums) {
    drums = await loadInstrument();
  }
  let percussionSet = await loadConfig(DEFAULT_SOUNDFONT, DEFAULT_INSTRUMENT);
  if (!buttons) {
    buttons = mapButtons(percussionSet.buttons);
  }
  drums.play(buttons[button], 0, { gain: 10 });
}

async function playDrum(event) {
  if (event.target.classList.contains('pad')) {
    event.preventDefault();
    playButton(event.target.dataset.button);
  }
}

async function playKey(event) {
  const sounds = {
    'Digit1': 'b1',
    'Digit2': 'b2',
    'Digit3': 'b3',
    'Digit4': 'b4',
    'Digit5': 'b5',
    'Digit6': 'b6'
  }
  if (event.code in sounds) {
    event.preventDefault();
    playButton(sounds[event.code]);
  }
}

function setViewportHeight() {
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

setViewportHeight();
window.addEventListener('resize', () => {
  setTimeout(setViewportHeight, 100);
});

const drumkit = document.querySelector('.drumkit');
drumkit.addEventListener('click', playDrum);
drumkit.addEventListener('touchstart', playDrum);

document.addEventListener('keydown', playKey);
