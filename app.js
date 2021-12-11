const DEFAULT_SOUNDFONT =  'Doumbek-Faisal';
const DEFAULT_INSTRUMENT = 'doumbek';
const DEFAULT_BUTTONS = {
  "b1": 60,
  "b2": 61,
  "b3": 62,
  "b4": 63,
  "b5": 64,
  "b6": 65
};

// soundfonts.json
let soundfonts = null;

// Current values
let soundfont = DEFAULT_SOUNDFONT;
let instrument = DEFAULT_INSTRUMENT;
let buttons = DEFAULT_BUTTONS;
let drums = null;

async function loadSoundFonts() {
  if (!soundfonts) {
    soundfonts = await fetch('soundfonts.json')
      .then(data => data.json())
      .then(json => json)
  }
}

async function loadInstrument() {
  return new Promise((resolve, reject) => {
    Soundfont.instrument(new AudioContext(), instrument, { soundfont, nameToUrl: function(name, sf, format) {
      format = format || 'mp3';
      return `drums/${sf}/${name}-${format}.js`;
    }})
    .then(instrument => {
      resolve(instrument);
    });
  });
}

async function playButton(button) {
  if (!drums) {
    drums = await loadInstrument();
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
  const keys = {
    'Digit1': 'b1',
    'Digit2': 'b2',
    'Digit3': 'b3',
    'Digit4': 'b4',
    'Digit5': 'b5',
    'Digit6': 'b6'
  }
  if (event.code in keys) {
    event.preventDefault();
    playButton(keys[event.code]);
  }
}

function setViewportHeight() {
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('DOMContentLoaded', async () => {
  setViewportHeight();
  window.addEventListener('resize', () => {
    setTimeout(setViewportHeight, 100);
  });

  const drumkit = document.querySelector('.drumkit');
  drumkit.addEventListener('click', playDrum);
  drumkit.addEventListener('touchstart', playDrum);

  document.addEventListener('keydown', playKey);

  await loadSoundFonts();
});
